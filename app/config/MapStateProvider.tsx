// app/config/MapStateProvider.tsx

import React, {
  createContext,
  useContext,
  ReactNode,
  useCallback,
  useMemo,
  useState,
  useEffect,
  useRef,
  // NEW
  useTransition,
} from "react";
import {
  useSharedValue,
  SharedValue,
  withSpring,
} from "react-native-reanimated";
import { useCountries } from "./CountryContext";
import { auth } from "@/app/config/firebaseConfig";
// NEW: InteractionManager for deferring heavy work
import { InteractionManager } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface MapContextType {
  // Stan UI
  scale: SharedValue<number>;
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
  resetMapTransform: () => void;
  isUpdating: boolean;
  recentlyChangedCountries: Set<string>;
  clearHighlights: () => void; // NOWA FUNKCJA DO EKSPORTU
  // Stan Danych
  selectedCountries: string[] | null;
  isLoadingData: boolean;
  updateAndHighlightCountries: (
    newCountries: string[],
    options?: { immediate?: boolean; noDefer?: boolean }
  ) => void;
  // NEW: diff-based incremental update
  applyCountryDiff: (
    add: string[],
    remove: string[],
    options?: { immediate?: boolean; deferVisual?: boolean; noDefer?: boolean }
  ) => void;
  // Nowe dla natychmiastowego przycisku "New"
  showNewIndicator: boolean;
  dismissNewIndicator: () => void;
  instantDismissNewIndicator: () => void;
  // NOWE: identyfikator aktualizacji do obsługi konfetti po fokusie ekranu
  updateSequence: number;
  // NEW: expose transition pending state (optional)
  isPending: boolean;
  // NEW: liczba odwiedzonych krajów (lekka pochodna)
  visitedCount: number;
  // NEW: czy ekran mapy jest aktywny
  isMapActive: boolean;
  setMapActive: (active: boolean) => void;
  flushQueuedDiffs: () => void;
  // NEW: allow reading queued visual diffs to render highlights on first frame
  peekQueuedChanged: () => string[];
  // NEW: Load and apply pending diff for instant visual effects
  loadAndApplyPendingDiff: () => Promise<void>;
}

const MapContext = createContext<MapContextType | null>(null);

export const MapStateProvider = ({ children }: { children: ReactNode }) => {
  // --- Stan UI (bez zmian) ---
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const resetMapTransform = useCallback(() => {
    const springConfig = { damping: 20, stiffness: 90, mass: 1.2 };
    scale.value = withSpring(1, springConfig);
    translateX.value = withSpring(0, springConfig);
    translateY.value = withSpring(0, springConfig);
  }, [scale, translateX, translateY]);

  // --- Logika stanu danych ---
  const { visitedCountries, setVisitedCountries } = useCountries();

  const [selectedCountries, setSelectedCountries] = useState<string[] | null>(
    null
  );
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [recentlyChangedCountries, setRecentlyChangedCountries] = useState(
    new Set<string>()
  );
  const [showNewIndicator, setShowNewIndicator] = useState(false);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // NOWE: sekwencja aktualizacji
  const [updateSequence, setUpdateSequence] = useState(0);
  // NEW: transition hook for non-blocking state updates
  const [isPending, startTransition] = useTransition();
  // NEW: aktywność ekranu mapy
  const [isMapActive, setIsMapActive] = useState(false);
  // NEW: optimistic visited count for immediate progress updates
  const [optimisticVisitedCount, setOptimisticVisitedCount] = useState<
    number | null
  >(null);
  // NEW: kolejki diffa gdy mapa nieaktywna
  const queuedAddsRef = useRef<Set<string>>(new Set());
  const queuedRemovesRef = useRef<Set<string>>(new Set());
  const queuedChangedRef = useRef<Set<string>>(new Set());
  const selectedCountriesActiveSnapshotRef = useRef<string[] | null>(null);
  // NEW: limit ilu krajom nadajemy jednocześnie highlight (F)
  const HIGHLIGHT_LIMIT = 50;
  // Auto-dismiss duration for the New indicator/highlights while map is active
  const AUTO_DISMISS_MS = 5000;

  // Keep an active snapshot only when map is active to avoid propagating large array changes to background tab
  useEffect(() => {
    if (isMapActive) {
      selectedCountriesActiveSnapshotRef.current = visitedCountries || null;
    }
  }, [visitedCountries, isMapActive]);

  // Helper: shallow unordered equality (Set compare) to skip redundant work
  const areCountryArraysEqual = useCallback(
    (a: string[] | null, b: string[]) => {
      if (!a) return false;
      if (a.length !== b.length) return false;
      // Fast path: if references equal
      if (a === b) return true;
      const setA = new Set(a);
      for (const c of b) if (!setA.has(c)) return false;
      return true;
    },
    []
  );

  // Track previous visitedCountries to detect changes
  const prevVisitedCountriesRef = useRef<string[] | null>(null);

  useEffect(() => {
    console.log(
      "MapStateProvider: visitedCountries changed:",
      visitedCountries ? visitedCountries.length : "null"
    );

    if (visitedCountries) {
      const prev = prevVisitedCountriesRef.current;

      // Check if this is a real change (not initial load)
      // First load: prev is null (after logout) or empty array [] and visitedCountries has countries
      // Real change: prev has countries and visitedCountries has different countries
      const isFirstLoad =
        !prev || (prev.length === 0 && visitedCountries.length > 0);

      if (
        prev &&
        !areCountryArraysEqual(prev, visitedCountries) &&
        !isFirstLoad
      ) {
        console.log(
          "MapStateProvider: Detected real change in visitedCountries, applying visual effects"
        );

        // Calculate diff
        const prevSet = new Set(prev);
        const nextSet = new Set(visitedCountries);
        const add: string[] = [];
        const remove: string[] = [];

        for (const c of visitedCountries) if (!prevSet.has(c)) add.push(c);
        for (const c of prev) if (!nextSet.has(c)) remove.push(c);

        if (add.length > 0 || remove.length > 0) {
          console.log(
            "MapStateProvider: Applying visual effects - add:",
            add.length,
            "remove:",
            remove.length
          );

          // Apply ONLY visual effects without updating visitedCountries
          const visualAddsSet =
            add.length > HIGHLIGHT_LIMIT
              ? new Set(add.slice(0, HIGHLIGHT_LIMIT))
              : new Set(add);

          if (visualAddsSet.size > 0) {
            setRecentlyChangedCountries(visualAddsSet);
            setShowNewIndicator(true);
            setIsUpdating(true);
            setUpdateSequence((p) => p + 1);
            if (updateTimeoutRef.current)
              clearTimeout(updateTimeoutRef.current);
            updateTimeoutRef.current = setTimeout(() => {
              dismissNewIndicator();
            }, AUTO_DISMISS_MS);
          }
        }
      } else if (isFirstLoad) {
        // This is the first load after login - don't show visual effects
        console.log(
          "MapStateProvider: First load after login, skipping visual effects"
        );
      }

      // Update ref for next comparison
      prevVisitedCountriesRef.current = visitedCountries;

      setSelectedCountries(visitedCountries);
      // Sync optimistic count with backend when it arrives
      setOptimisticVisitedCount(visitedCountries.length);
      if (isLoadingData) {
        setIsLoadingData(false);
      }
    } else {
      // CRITICAL FIX: Clear state when no countries data (user logged out)
      console.log("MapStateProvider: No countries data, clearing map state");
      prevVisitedCountriesRef.current = null;
      setSelectedCountries(null);
      setIsLoadingData(true);
      setOptimisticVisitedCount(null);
      setRecentlyChangedCountries(new Set());
      setShowNewIndicator(false);
      setIsUpdating(false);
      // Clear queued diffs
      queuedAddsRef.current.clear();
      queuedRemovesRef.current.clear();
      queuedChangedRef.current.clear();
    }
  }, [visitedCountries, isLoadingData, areCountryArraysEqual]);

  // NOWA FUNKCJA: Odpowiedzialna tylko za czyszczenie podświetleń
  const clearHighlights = useCallback(() => {
    setRecentlyChangedCountries(new Set());
  }, []);

  const instantDismissNewIndicator = useCallback(() => {
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
      updateTimeoutRef.current = null;
    }
    setShowNewIndicator(false);
    setIsUpdating(false);
    setRecentlyChangedCountries(new Set());
  }, []);

  const dismissNewIndicator = useCallback(() => {
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
      updateTimeoutRef.current = null;
    }
    setIsUpdating(false);
    setShowNewIndicator(false);
    clearHighlights();
  }, [clearHighlights]);

  // NEW: funkcja ustawiania aktywności mapy
  const flushQueuedDiffs = useCallback(() => {
    if (visitedCountries == null) return;
    // If there are no queued visual additions, just clear any stale queues and exit
    if (queuedChangedRef.current.size === 0) {
      queuedAddsRef.current.clear();
      queuedRemovesRef.current.clear();
      return;
    }
    // Respect highlight limit (queuedChangedRef holds ONLY additions for visuals)
    const changedArr = Array.from(queuedChangedRef.current);
    const limited =
      changedArr.length > HIGHLIGHT_LIMIT
        ? new Set(changedArr.slice(0, HIGHLIGHT_LIMIT))
        : new Set(changedArr);
    queuedChangedRef.current.clear();
    queuedAddsRef.current.clear();
    queuedRemovesRef.current.clear();
    // Show highlights/indicator only when there are additions
    if (limited.size > 0) {
      setRecentlyChangedCountries(limited);
      setShowNewIndicator(true);
      setIsUpdating(true);
      setUpdateSequence((p) => p + 1);
      if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
      updateTimeoutRef.current = setTimeout(() => {
        dismissNewIndicator();
      }, AUTO_DISMISS_MS);
    }
  }, [dismissNewIndicator, visitedCountries]);

  // // If data arrives slightly later while map is active, ensure queued visuals are flushed immediately
  // useEffect(() => {
  //   if (isMapActive && queuedChangedRef.current.size > 0) {
  //     flushQueuedDiffs();
  //   }
  // }, [isMapActive, visitedCountries, flushQueuedDiffs]);

  // NEW: expose non-mutating view of queued changes for first-render synchronization
  const peekQueuedChanged = useCallback(() => {
    return Array.from(queuedChangedRef.current);
  }, []);

  // Track if pending diff has been applied to prevent multiple applications
  const pendingDiffAppliedRef = useRef(false);

  // NEW: Load and apply pending diff from chooseCountries for instant visual effects
  const loadAndApplyPendingDiffRef = useRef(async () => {
    // Prevent multiple applications
    if (pendingDiffAppliedRef.current) {
      console.log("MapStateProvider: Pending diff already applied, skipping");
      return;
    }

    // CRITICAL FIX: Check if user is still logged in
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.log("MapStateProvider: No user logged in, skipping pending diff");
      return;
    }

    try {
      const pendingDiffStr = await AsyncStorage.getItem("pendingMapDiff");
      if (pendingDiffStr) {
        const pendingDiff = JSON.parse(pendingDiffStr);
        const { add, remove, timestamp, userId } = pendingDiff;

        // CRITICAL FIX: Check if diff belongs to current user
        if (userId !== currentUser.uid) {
          console.log(
            "MapStateProvider: Pending diff belongs to different user, skipping"
          );
          // Clear old diff
          await AsyncStorage.removeItem("pendingMapDiff");
          return;
        }

        // CRITICAL OPTIMIZATION: Apply visual effects immediately, but skip count update if no data yet
        const hasVisitedData = visitedCountries && visitedCountries.length > 0;
        if (!hasVisitedData) {
          console.log(
            "MapStateProvider: No visitedCountries loaded yet, applying visual effects only"
          );
        }

        // Check if diff is recent (within last 5 minutes)
        if (
          Date.now() - timestamp < 5 * 60 * 1000 &&
          (add.length > 0 || remove.length > 0)
        ) {
          console.log(
            "MapStateProvider: Applying pending diff for instant effects - add:",
            add.length,
            "remove:",
            remove.length
          );

          // Mark as applied to prevent multiple applications
          pendingDiffAppliedRef.current = true;

          // Update count only if we have visited data
          if (hasVisitedData) {
            // Immediately update optimistic count for instant progress bar animation
            const currentCount =
              optimisticVisitedCount || visitedCountries?.length || 0;
            const newCount = currentCount + add.length - remove.length;
            setOptimisticVisitedCount(Math.max(0, newCount));
          }

          // Apply visual effects immediately - no delays, no deferring
          if (add.length > 0) {
            const visualAddsSet =
              add.length > HIGHLIGHT_LIMIT
                ? new Set(add.slice(0, HIGHLIGHT_LIMIT))
                : new Set(add);

            // Clear any existing timeout to prevent conflicts
            if (updateTimeoutRef.current) {
              clearTimeout(updateTimeoutRef.current);
              updateTimeoutRef.current = null;
            }

            // CRITICAL OPTIMIZATION: Use InteractionManager for smooth animations
            InteractionManager.runAfterInteractions(() => {
              // Apply visual effects immediately
              setRecentlyChangedCountries(visualAddsSet as Set<string>);
              setShowNewIndicator(true);
              setIsUpdating(true);
              setUpdateSequence((p) => p + 1);

              // Set auto-dismiss timeout
              updateTimeoutRef.current = setTimeout(() => {
                dismissNewIndicator();
              }, AUTO_DISMISS_MS);
            });
          }

          // Clear the pending diff after applying
          await AsyncStorage.removeItem("pendingMapDiff");
        }
      }
    } catch (error) {
      console.error("Failed to load pending map diff:", error);
    }
  });

  // Update the ref function when dependencies change
  useEffect(() => {
    loadAndApplyPendingDiffRef.current = async () => {
      // Prevent multiple applications
      if (pendingDiffAppliedRef.current) {
        console.log("MapStateProvider: Pending diff already applied, skipping");
        return;
      }

      // CRITICAL FIX: Check if user is still logged in
      const currentUser = auth.currentUser;
      if (!currentUser) {
        console.log(
          "MapStateProvider: No user logged in, skipping pending diff"
        );
        return;
      }

      try {
        const pendingDiffStr = await AsyncStorage.getItem("pendingMapDiff");
        if (pendingDiffStr) {
          const pendingDiff = JSON.parse(pendingDiffStr);
          const { add, remove, timestamp, userId } = pendingDiff;

          // CRITICAL FIX: Check if diff belongs to current user
          if (userId !== currentUser.uid) {
            console.log(
              "MapStateProvider: Pending diff belongs to different user, skipping"
            );
            // Clear old diff
            await AsyncStorage.removeItem("pendingMapDiff");
            return;
          }

          // CRITICAL OPTIMIZATION: Apply visual effects immediately, but skip count update if no data yet
          const hasVisitedData =
            visitedCountries && visitedCountries.length > 0;
          if (!hasVisitedData) {
            console.log(
              "MapStateProvider: No visitedCountries loaded yet, applying visual effects only"
            );
          }

          // Check if diff is recent (within last 5 minutes)
          if (
            Date.now() - timestamp < 5 * 60 * 1000 &&
            (add.length > 0 || remove.length > 0)
          ) {
            console.log(
              "MapStateProvider: Applying pending diff for instant effects - add:",
              add.length,
              "remove:",
              remove.length
            );

            // Mark as applied to prevent multiple applications
            pendingDiffAppliedRef.current = true;

            // Update count only if we have visited data
            if (hasVisitedData) {
              // Immediately update optimistic count for instant progress bar animation
              const currentCount =
                optimisticVisitedCount || visitedCountries?.length || 0;
              const newCount = currentCount + add.length - remove.length;
              setOptimisticVisitedCount(Math.max(0, newCount));
            }

            // Apply visual effects immediately - no delays, no deferring
            if (add.length > 0) {
              const visualAddsSet =
                add.length > HIGHLIGHT_LIMIT
                  ? new Set(add.slice(0, HIGHLIGHT_LIMIT))
                  : new Set(add);

              // Clear any existing timeout to prevent conflicts
              if (updateTimeoutRef.current) {
                clearTimeout(updateTimeoutRef.current);
                updateTimeoutRef.current = null;
              }

              // CRITICAL OPTIMIZATION: Use InteractionManager for smooth animations
              InteractionManager.runAfterInteractions(() => {
                // Apply visual effects immediately
                setRecentlyChangedCountries(visualAddsSet as Set<string>);
                setShowNewIndicator(true);
                setIsUpdating(true);
                setUpdateSequence((p) => p + 1);

                // Set auto-dismiss timeout
                updateTimeoutRef.current = setTimeout(() => {
                  dismissNewIndicator();
                }, AUTO_DISMISS_MS);
              });
            }

            // Clear the pending diff after applying
            await AsyncStorage.removeItem("pendingMapDiff");
          }
        }
      } catch (error) {
        console.error("Failed to load pending map diff:", error);
      }
    };
  }, [optimisticVisitedCount, visitedCountries?.length, dismissNewIndicator]);

  // Stable wrapper function
  const loadAndApplyPendingDiff = useCallback(async () => {
    await loadAndApplyPendingDiffRef.current();
  }, []);

  const setMapActive = useCallback(
    (active: boolean) => {
      if (active) {
        // Najpierw oznacz mapę jako aktywną, następnie odpal flush queued diffs
        setIsMapActive(true);
        flushQueuedDiffs();
      } else {
        setIsMapActive(false);
        // Reset pending diff flag for next activation
        pendingDiffAppliedRef.current = false;
        // A: szybkie wygaszenie – natychmiast zrezygnuj z pending highlight / przycisku
        if (updateTimeoutRef.current) {
          clearTimeout(updateTimeoutRef.current);
          updateTimeoutRef.current = null;
        }
        if (showNewIndicator || recentlyChangedCountries.size > 0) {
          setShowNewIndicator(false);
          setIsUpdating(false);
          setRecentlyChangedCountries(new Set());
        }
      }
    },
    [flushQueuedDiffs, showNewIndicator, recentlyChangedCountries]
  );

  // NEW: incremental diff application (moved before wrapper to avoid use-before-declare)
  const applyCountryDiff = useCallback(
    (
      add: string[],
      remove: string[],
      options?: {
        immediate?: boolean;
        deferVisual?: boolean;
        noDefer?: boolean;
      }
    ) => {
      if ((!add || add.length === 0) && (!remove || remove.length === 0))
        return;
      const {
        immediate = false,
        deferVisual = false,
        noDefer = false,
      } = options || {};

      const prev = visitedCountries || [];
      const nextSet = new Set(prev);
      for (const a of add) nextSet.add(a);
      for (const r of remove) nextSet.delete(r);

      if (nextSet.size === prev.length) {
        let changed = false;
        for (const a of add) if (!prev.includes(a)) changed = true;
        for (const r of remove) if (prev.includes(r)) changed = true;
        if (!changed) return;
      }

      // Visuals should reflect ONLY newly added countries, not removals
      const addSet = new Set<string>(add);
      const visualAddsSet =
        addSet.size > HIGHLIGHT_LIMIT
          ? new Set(Array.from(addSet).slice(0, HIGHLIGHT_LIMIT))
          : addSet;

      // Immediately update optimistic count for instant progress bar animation
      setOptimisticVisitedCount(nextSet.size);

      if (isMapActive && !deferVisual) {
        // On active map, show highlights/"New" only when there are additions
        if (visualAddsSet.size > 0) {
          setRecentlyChangedCountries(visualAddsSet);
          setShowNewIndicator(true);
          setIsUpdating(true);
          setUpdateSequence((p) => p + 1);
          if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
          updateTimeoutRef.current = setTimeout(() => {
            dismissNewIndicator();
          }, AUTO_DISMISS_MS);
        } else {
          // Removals-only: do not show highlights or New/confetti
          setRecentlyChangedCountries(new Set());
        }
      } else {
        // Map not active (or visuals explicitly deferred): queue visual diffs only.
        // Do NOT trigger highlights/New/confetti yet – apply on focus via flushQueuedDiffs.
        // Queue ONLY additions for visual highlights on next focus
        visualAddsSet.forEach((c) => queuedChangedRef.current.add(c));
        // Queue data changes to be applied to the global state (for possible future use).
        add.forEach((c) => queuedAddsRef.current.add(c));
        remove.forEach((c) => queuedRemovesRef.current.add(c));
        // Advance inactive snapshot to reflect the upcoming visited set to prevent flicker.
        selectedCountriesActiveSnapshotRef.current = Array.from(nextSet);
      }

      const commit = () => {
        const nextArr = Array.from(nextSet);
        if (immediate || noDefer) {
          setVisitedCountries(nextArr);
        } else {
          startTransition(() => setVisitedCountries(nextArr));
        }
      };

      const LARGE_CHANGE_THRESHOLD = 25;
      const totalChanged = add.length + remove.length;
      // A: przy pierwszej aktywacji mapy nie blokuj interakcji; jeśli mapa nieaktywna lub duży diff – puszczamy commit od razu (ułatwia szybkie przejście dalej)
      if (
        !immediate &&
        !noDefer &&
        totalChanged > LARGE_CHANGE_THRESHOLD &&
        isMapActive
      ) {
        InteractionManager.runAfterInteractions(commit);
      } else {
        commit();
      }
    },
    [
      visitedCountries,
      isMapActive,
      dismissNewIndicator,
      startTransition,
      setVisitedCountries,
    ]
  );

  // Wrapper kompatybilności – full list -> diff
  const updateAndHighlightCountries = useCallback(
    (
      newCountries: string[],
      options?: { immediate?: boolean; noDefer?: boolean }
    ) => {
      if (areCountryArraysEqual(visitedCountries, newCountries)) return;
      const prev = visitedCountries || [];
      const prevSet = new Set(prev);
      const nextSet = new Set(newCountries);
      const add: string[] = [];
      const remove: string[] = [];
      for (const c of newCountries) if (!prevSet.has(c)) add.push(c);
      for (const c of prev) if (!nextSet.has(c)) remove.push(c);
      if (add.length === 0 && remove.length === 0) return;
      applyCountryDiff(add, remove, {
        immediate: options?.immediate,
        noDefer: options?.noDefer,
      });
    },
    [visitedCountries, applyCountryDiff, areCountryArraysEqual]
  );

  const value = useMemo(
    () => ({
      scale,
      translateX,
      translateY,
      resetMapTransform,
      // Only expose live array when map tab active; otherwise last active snapshot -> prevents background re-render storm
      selectedCountries: isMapActive
        ? visitedCountries
        : selectedCountriesActiveSnapshotRef.current,
      isLoadingData,
      isUpdating,
      recentlyChangedCountries,
      updateAndHighlightCountries,
      applyCountryDiff,
      clearHighlights,
      showNewIndicator,
      dismissNewIndicator,
      instantDismissNewIndicator,
      updateSequence,
      isPending,
      visitedCount:
        optimisticVisitedCount != null
          ? optimisticVisitedCount
          : visitedCountries
            ? visitedCountries.length
            : 0,
      isMapActive,
      setMapActive,
      flushQueuedDiffs,
      peekQueuedChanged,
      loadAndApplyPendingDiff,
    }),
    [
      scale,
      translateX,
      translateY,
      resetMapTransform,
      visitedCountries,
      isLoadingData,
      isUpdating,
      recentlyChangedCountries,
      updateAndHighlightCountries,
      applyCountryDiff,
      clearHighlights,
      showNewIndicator,
      dismissNewIndicator,
      instantDismissNewIndicator,
      updateSequence,
      isPending,
      optimisticVisitedCount,
      isMapActive,
      setMapActive,
      flushQueuedDiffs,
      peekQueuedChanged,
      loadAndApplyPendingDiff,
    ]
  );
  return <MapContext.Provider value={value}>{children}</MapContext.Provider>;
};

export const useMapState = () => {
  const context = useContext(MapContext);
  if (!context) {
    throw new Error("useMapState must be used within a MapStateProvider");
  }
  return context;
};
