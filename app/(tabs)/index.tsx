import React, {
  useState,
  useCallback,
  useContext,
  useRef,
  // useEffect, // Można usunąć, jeśli nie jest używany do innych celów
} from "react";
import { View, StyleSheet } from "react-native";
import InteractiveMap, {
  InteractiveMapRef,
} from "../../components/InteractiveMap";
import { useFocusEffect } from "@react-navigation/native";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../config/firebaseConfig";
import { ThemeContext } from "../config/ThemeContext";
import { useTheme } from "react-native-paper";
import filteredCountriesData from "../../components/filteredCountries.json";
import MyCustomSpinner from "@/components/MyCustomSpinner";

const totalCountries = filteredCountriesData.countries.length;

export default function IndexScreen() {
  const theme = useTheme();
  const [selectedCountries, setSelectedCountries] = useState<string[] | null>(
    null
  );
  // Zmieniamy nazwę loading na isLoading dla większej czytelności
  const [isLoading, setIsLoading] = useState<boolean>(true);
  // Dodajemy stan do śledzenia, czy ekran jest aktywny (focused)
  const [isScreenFocused, setIsScreenFocused] = useState<boolean>(false);

  const mapRef = useRef<InteractiveMapRef>(null);

  useFocusEffect(
    useCallback(() => {
      setIsScreenFocused(true); // Ekran jest teraz aktywny
      setIsLoading(true); // Ustawiamy ładowanie na true natychmiast po fokusie
      setSelectedCountries(null); // Czyścimy poprzednie dane, aby spinner się pokazał

      let isActive = true;
      const fetchSelectedCountriesData = async () => {
        const user = auth.currentUser;
        let countries: string[] = [];
        if (user) {
          try {
            const userDocRef = doc(db, "users", user.uid);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
              const data = userDoc.data();
              countries = data.countriesVisited || [];
            } else {
              console.log("IndexScreen: No such document for user!");
            }
          } catch (error) {
            console.error("IndexScreen: Error fetching countries:", error);
          }
        } else {
          console.log("IndexScreen: User not authenticated");
        }

        if (isActive) {
          setSelectedCountries(countries);
          setIsLoading(false); // Kończymy ładowanie po ustawieniu danych
        }
      };

      fetchSelectedCountriesData();

      return () => {
        isActive = false;
        setIsScreenFocused(false); // Ekran traci fokus
        // Opcjonalnie: Możesz chcieć zresetować stan ładowania tutaj,
        // aby spinner pojawił się natychmiast przy następnym fokusie,
        // nawet przed rozpoczęciem pobierania danych.
        // setIsLoading(true);
        // setSelectedCountries(null);
      };
    }, [])
  );

  const handleCountryPress = useCallback((countryCode: string) => {
    console.log(`Country pressed: ${countryCode}`);
  }, []);

  // Ulepszona logika renderowania:
  // Pokaż spinner, jeśli:
  // 1. Ekran nie jest jeszcze aktywny (isScreenFocused === false)
  // 2. Trwa ładowanie (isLoading === true)
  // 3. Dane krajów nie zostały jeszcze załadowane (selectedCountries === null)
  if (!isScreenFocused || isLoading || selectedCountries === null) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <MyCustomSpinner size="large" />
      </View>
    );
  }

  // Renderuj InteractiveMap tylko wtedy, gdy ekran jest aktywny,
  // ładowanie zakończone i dane są dostępne.
  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <InteractiveMap
        ref={mapRef}
        selectedCountries={selectedCountries} // selectedCountries jest teraz string[]
        totalCountries={totalCountries}
        onCountryPress={handleCountryPress}
        style={styles.map}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  map: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
});
