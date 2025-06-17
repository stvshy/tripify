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
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "./firebaseConfig";

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
  // --- Stan UI (tak jak poprzednio) ---
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const resetMapTransform = useCallback(() => {
    const springConfig = { damping: 20, stiffness: 90, mass: 1.2 };
    scale.value = withSpring(1, springConfig);
    translateX.value = withSpring(0, springConfig);
    translateY.value = withSpring(0, springConfig);
  }, [scale, translateX, translateY]);

  // --- NOWOŚĆ: Stan Danych ---
  const [selectedCountries, setSelectedCountries] = useState<string[] | null>(
    null
  );
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isFetched, setIsFetched] = useState(false); // Flaga, by pobrać dane tylko raz

  // --- NOWOŚĆ: Logika pobierania danych ---
  useEffect(() => {
    const fetchSelectedCountriesData = async (user: User) => {
      // Pobieramy dane tylko raz
      if (isFetched) return;

      setIsLoadingData(true);
      try {
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);
        const countries = userDoc.exists()
          ? userDoc.data().countriesVisited || []
          : [];
        setSelectedCountries(countries);
        setIsFetched(true); // Zaznaczamy, że dane zostały pobrane
      } catch (error) {
        console.error("MapStateProvider: Error fetching countries:", error);
        setSelectedCountries([]);
      } finally {
        setIsLoadingData(false);
      }
    };

    // Nasłuchujemy na zmiany stanu autentykacji, by pobrać dane, gdy user jest dostępny
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && !isFetched) {
        fetchSelectedCountriesData(user);
      } else if (!user) {
        // Opcjonalnie: resetuj stan, gdy użytkownik się wyloguje
        setSelectedCountries(null);
        setIsFetched(false);
        setIsLoadingData(true);
      }
    });

    return () => unsubscribe(); // Cleanup
  }, [isFetched]); // Zależność od isFetched

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
