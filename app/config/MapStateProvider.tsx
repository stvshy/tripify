// app/config/MapStateProvider.tsx

import React, {
  createContext,
  useContext,
  ReactNode,
  useCallback,
  useMemo,
  useState,
  useEffect,
} from "react";
import {
  useSharedValue,
  SharedValue,
  withSpring,
} from "react-native-reanimated";

// === KROK 1: Importujemy hooki z Twojego CountryContext ===
// Zakładam, że plik nazywa się CountryContext.tsx i eksportuje ten hook.
import { useCountries } from "./CountryContext";

interface MapContextType {
  // Stan UI
  scale: SharedValue<number>;
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
  resetMapTransform: () => void;
  // Stan Danych
  selectedCountries: string[] | null;
  isLoadingData: boolean;
}

const MapContext = createContext<MapContextType | null>(null);

export const MapStateProvider = ({ children }: { children: ReactNode }) => {
  // --- Stan UI (tak jak poprzednio, bez zmian) ---
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const resetMapTransform = useCallback(() => {
    const springConfig = { damping: 20, stiffness: 90, mass: 1.2 };
    scale.value = withSpring(1, springConfig);
    translateX.value = withSpring(0, springConfig);
    translateY.value = withSpring(0, springConfig);
  }, [scale, translateX, translateY]);

  // --- NOWA LOGIKA STANU DANYCH ---

  // === KROK 2: Używamy hooka useCountries, aby uzyskać dostęp do danych w czasie rzeczywistym ===
  const { visitedCountries } = useCountries();

  // === KROK 3: Usuwamy stary, skomplikowany stan. Teraz jest prościej. ===
  // Stan `isLoadingData` zależy teraz od tego, czy `visitedCountries` jest już dostępne.
  // Używamy `useState` i `useEffect` do zarządzania stanem ładowania.
  const [selectedCountries, setSelectedCountries] = useState<string[] | null>(
    null
  );
  const [isLoadingData, setIsLoadingData] = useState(true);

  // === KROK 4: Używamy useEffect do synchronizacji danych z CountryContext ===
  // Ten hook uruchomi się przy pierwszym renderowaniu ORAZ za każdym razem,
  // gdy `visitedCountries` z `CountryContext` się zmieni.
  useEffect(() => {
    // Jeśli `visitedCountries` nie jest już pustą tablicą (domyślny stan),
    // to znaczy, że `CountryContext` załadował dane z Firestore.
    // Sprawdzamy też, czy nie jest `undefined`, na wszelki wypadek.
    if (visitedCountries) {
      setSelectedCountries(visitedCountries);
      // Gdy tylko mamy dane, przestajemy pokazywać ładowanie.
      if (isLoadingData) {
        setIsLoadingData(false);
      }
    }
    // Jeśli `visitedCountries` to `null` lub `undefined`, możemy poczekać.
    // Jeśli `CountryContext` nigdy nie zwróci danych (np. błąd),
    // `isLoadingData` pozostanie `true`.
  }, [visitedCountries, isLoadingData]); // Zależność od danych z CountryContext

  const value = useMemo(
    () => ({
      scale,
      translateX,
      translateY,
      resetMapTransform,
      selectedCountries,
      isLoadingData,
    }),
    [
      scale,
      translateX,
      translateY,
      resetMapTransform,
      selectedCountries,
      isLoadingData,
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
