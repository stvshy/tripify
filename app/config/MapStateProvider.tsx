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
// NEW: InteractionManager for deferring heavy work
import { InteractionManager } from "react-native";

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

  useEffect(() => {
    if (visitedCountries) {
      setSelectedCountries(visitedCountries);
      if (isLoadingData) {
        setIsLoadingData(false);
      }
    }
  }, [visitedCountries, isLoadingData]);

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
    if (queuedChangedRef.current.size === 0 || visitedCountries == null) return;
    // Respect highlight limit
    const changedArr = Array.from(queuedChangedRef.current);
    const limited =
      changedArr.length > HIGHLIGHT_LIMIT
        ? new Set(changedArr.slice(0, HIGHLIGHT_LIMIT))
        : new Set(changedArr);
    queuedChangedRef.current.clear();
    queuedAddsRef.current.clear();
    queuedRemovesRef.current.clear();
    if (isMapActive) {
      setRecentlyChangedCountries(limited);
      setShowNewIndicator(true);
      setIsUpdating(true);
      setUpdateSequence((p) => p + 1);
      if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
      updateTimeoutRef.current = setTimeout(() => {
        dismissNewIndicator();
      }, AUTO_DISMISS_MS);
    } else {
      // Keep visual state queued; it will be applied on focus
      limited.forEach((c) => queuedChangedRef.current.add(c));
    }
  }, [dismissNewIndicator, visitedCountries, isMapActive]);

  // NEW: expose non-mutating view of queued changes for first-render synchronization
  const peekQueuedChanged = useCallback(() => {
    return Array.from(queuedChangedRef.current);
  }, []);

  const setMapActive = useCallback(
    (active: boolean) => {
      if (active) {
        // Najpierw oznacz mapę jako aktywną, następnie odpal flush queued diffs
        setIsMapActive(true);
        flushQueuedDiffs();
      } else {
        setIsMapActive(false);
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

      const changedSet = new Set<string>([...add, ...remove]);
      // Limit visual highlight size (F)
      const visualChangedSet =
        changedSet.size > HIGHLIGHT_LIMIT
          ? new Set(Array.from(changedSet).slice(0, HIGHLIGHT_LIMIT))
          : changedSet;

      if (isMapActive && !deferVisual) {
        // Natychmiast pokazuj highlighty i przycisk "New" na aktywnej mapie
        setRecentlyChangedCountries(visualChangedSet);
        setShowNewIndicator(true);
        setIsUpdating(true);
        setUpdateSequence((p) => p + 1);
        if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
        updateTimeoutRef.current = setTimeout(() => {
          dismissNewIndicator();
        }, AUTO_DISMISS_MS);
      } else {
        add.forEach((c) => queuedAddsRef.current.add(c));
        remove.forEach((c) => queuedRemovesRef.current.add(c));
        // queue only limited set for visual diff
        visualChangedSet.forEach((c) => queuedChangedRef.current.add(c));
        // Advance inactive snapshot to reflect the upcoming visited set to prevent flicker
        selectedCountriesActiveSnapshotRef.current = Array.from(nextSet);
        // Don't toggle UI state while map is inactive; showNewIndicator will be set on flushQueuedDiffs() during focus
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
      visitedCount: visitedCountries ? visitedCountries.length : 0,
      isMapActive,
      setMapActive,
      flushQueuedDiffs,
      peekQueuedChanged,
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
      isMapActive,
      setMapActive,
      flushQueuedDiffs,
      peekQueuedChanged,
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
