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
  // Nowe dla natychmiastowego przycisku "New"
  showNewIndicator: boolean;
  dismissNewIndicator: () => void;
  instantDismissNewIndicator: () => void;
  // NOWE: identyfikator aktualizacji do obsługi konfetti po fokusie ekranu
  updateSequence: number;
  // NEW: expose transition pending state (optional)
  isPending: boolean;
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

  const updateAndHighlightCountries = useCallback(
    (
      newCountries: string[],
      options?: { immediate?: boolean; noDefer?: boolean }
    ) => {
      const { immediate = false, noDefer = false } = options || {};
      // EARLY EXIT: no real change → skip everything (prevents double renders)
      if (areCountryArraysEqual(visitedCountries, newCountries)) {
        return;
      }

      const oldArr = visitedCountries || [];
      const oldSet = new Set(oldArr);
      const newSet = new Set(newCountries);
      const changed = new Set<string>();
      for (const c of newCountries) if (!oldSet.has(c)) changed.add(c);
      for (const c of oldSet) if (!newSet.has(c)) changed.add(c);
      if (changed.size === 0) return;

      // UI highlight state (cheap, keep sync)
      setIsUpdating(true);
      setShowNewIndicator(true);
      setRecentlyChangedCountries(changed);
      setUpdateSequence((prev) => prev + 1);
      if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);

      const commit = () => {
        // Szybki commit bez startTransition jeśli immediate/noDefer aby uniknąć opóźnienia percepcyjnego
        if (immediate || noDefer) {
          setVisitedCountries(newCountries);
        } else {
          startTransition(() => {
            setVisitedCountries(newCountries);
          });
        }
        updateTimeoutRef.current = setTimeout(() => {
          dismissNewIndicator();
        }, 5500);
      };

      // Defer only for very large bulk updates AND jeśli nie wymusiliśmy immediate
      const LARGE_CHANGE_THRESHOLD = 25;
      if (!immediate && !noDefer && changed.size > LARGE_CHANGE_THRESHOLD) {
        InteractionManager.runAfterInteractions(commit);
      } else {
        commit();
      }
    },
    [
      visitedCountries,
      setVisitedCountries,
      dismissNewIndicator,
      areCountryArraysEqual,
      startTransition,
    ]
  );

  const value = useMemo(
    () => ({
      scale,
      translateX,
      translateY,
      resetMapTransform,
      selectedCountries: visitedCountries,
      isLoadingData,
      isUpdating,
      recentlyChangedCountries,
      updateAndHighlightCountries,
      clearHighlights,
      showNewIndicator,
      dismissNewIndicator,
      instantDismissNewIndicator,
      updateSequence,
      isPending,
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
      clearHighlights,
      showNewIndicator,
      dismissNewIndicator,
      instantDismissNewIndicator,
      updateSequence,
      isPending,
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
