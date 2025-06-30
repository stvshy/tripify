// components/CountryPill.tsx (nowy plik)
import React from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";
import CountryFlag from "react-native-country-flag";
import { useTheme } from "react-native-paper";
import { Country } from "../types/sharedTypes"; // Upewnij się, że ścieżka jest poprawna
import CachedCountryFlag from "./CachedCountryFlag";
interface CountryPillProps {
  country: Country;
  onPress: (id: string) => void;
  backgroundColor: string;
}

const CountryPill = ({
  country,
  onPress,
  backgroundColor,
}: CountryPillProps) => {
  const theme = useTheme();

  return (
    <TouchableOpacity
      onPress={() => onPress(country.id)}
      style={[styles.visitedItemContainer, { backgroundColor }]}
    >
      <CachedCountryFlag isoCode={country.cca2} size={20} style={styles.flag} />
      <Text style={[styles.visitedItemText, { color: theme.colors.onSurface }]}>
        {country.name}
      </Text>
    </TouchableOpacity>
  );
};

// Kluczowy element: React.memo
// Komponent zostanie przerenderowany tylko jeśli jego propsy (country, onPress, backgroundColor) się zmienią.
export default React.memo(CountryPill);

const styles = StyleSheet.create({
  visitedItemContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    margin: 3.5,
    borderRadius: 16,
  },
  visitedItemText: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 1,
  },
  flag: {
    width: 20,
    height: 15,
    borderRadius: 2,
    marginRight: 6,
  },
});
