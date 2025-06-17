import React, { useCallback } from "react";
import { View, StyleSheet } from "react-native";
import InteractiveMap from "../../components/InteractiveMap";
import { useTheme } from "react-native-paper";
import filteredCountriesData from "../../components/filteredCountries.json";
import MyCustomSpinner from "@/components/MyCustomSpinner";

// Importuj TYLKO hook do pobierania stanu z Contextu
import { useMapState } from "../config/MapStateProvider";

const totalCountries = filteredCountriesData.countries.length;

export default function IndexScreen() {
  const theme = useTheme();

  // Pobierz wszystko, czego potrzebujesz, z jednego, centralnego miejsca
  const { selectedCountries, isLoadingData } = useMapState();

  const handleCountryPress = useCallback((countryCode: string) => {
    console.log(`Country pressed: ${countryCode}`);
  }, []);

  // Logika renderowania jest teraz o wiele czystsza
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

  // Renderuj mapę - teraz jej propsy będą stabilne i nie spowodują re-renderu
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
