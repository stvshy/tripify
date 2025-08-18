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
} from "react";
import {
  useSharedValue,
  SharedValue,
  withSpring,
} from "react-native-reanimated";
import { useCountries } from "./CountryContext";

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
  updateAndHighlightCountries: (newCountries: string[]) => void;
  // Nowe dla natychmiastowego przycisku "New"
  showNewIndicator: boolean;
  dismissNewIndicator: () => void;
  instantDismissNewIndicator: () => void;
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
    (newCountries: string[]) => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      const oldSet = new Set(visitedCountries || []);
      const newSet = new Set(newCountries);
      const changed = new Set<string>();
      for (const c of newCountries) if (!oldSet.has(c)) changed.add(c);
      for (const c of oldSet) if (!newSet.has(c)) changed.add(c);
      if (changed.size === 0) return;

      // Natychmiastowy pełny stan UI
      setIsUpdating(true);
      setShowNewIndicator(true);
      setRecentlyChangedCountries(changed);
      // Aktualizacja listy odwiedzonych (trafia do kontekstu → progress)
      setVisitedCountries(newCountries);

      // Timer auto-wygaszenia (jeśli użytkownik nie kliknie)
      updateTimeoutRef.current = setTimeout(() => {
        dismissNewIndicator();
      }, 9000);
    },
    [visitedCountries, setVisitedCountries, dismissNewIndicator]
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
      instantDismissNewIndicator, // EXPORT
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
