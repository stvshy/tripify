import React, { useCallback } from "react";
import { View, StyleSheet } from "react-native";
import InteractiveMap from "../../components/InteractiveMap";
import { useTheme } from "react-native-paper";
import filteredCountriesData from "../../components/filteredCountries.json";
import MyCustomSpinner from "@/components/MyCustomSpinner";

// KROK 1: Importuj useFocusEffect
import { useFocusEffect } from "@react-navigation/native";
import { useMapState } from "../config/MapStateProvider";

const totalCountries = filteredCountriesData.countries.length;

export default function IndexScreen() {
  const theme = useTheme();

  // KROK 2: Pobierz funkcję resetującą z naszego hooka
  const { selectedCountries, isLoadingData, resetMapTransform } = useMapState();

  // KROK 3: Użyj useFocusEffect, aby zresetować mapę przy każdym wejściu
  useFocusEffect(
    useCallback(() => {
      // Ta funkcja zostanie wykonana za każdym razem, gdy ekran (zakładka)
      // stanie się aktywny.
      resetMapTransform();

      // Nie potrzebujemy funkcji czyszczącej, więc jej nie zwracamy.
    }, [resetMapTransform]) // Zależność od funkcji resetującej
  );

  const handleCountryPress = useCallback((countryCode: string) => {
    console.log(`Country pressed: ${countryCode}`);
  }, []);

  // Logika renderowania spinnera pozostaje bez zmian
  if (isLoadingData || selectedCountries === null) {
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

  // Renderowanie mapy również pozostaje bez zmian
  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <InteractiveMap
        selectedCountries={selectedCountries}
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
