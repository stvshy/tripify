// components/VisitedCountriesSkeleton.tsx

import React from "react";
import { View, StyleSheet } from "react-native";
import { useTheme } from "react-native-paper";

// Komponent dla pojedynczej "pigułki" kraju (bez zmian)
const SkeletonPill = ({ style }: { style?: object }) => {
  const { colors } = useTheme();
  const skeletonColor = colors.surfaceVariant;

  return (
    <View
      style={[
        styles.pill,
        { backgroundColor: skeletonColor, opacity: 0.6 },
        style,
      ]}
    />
  );
};

// NOWY komponent dla nagłówka kontynentu
const SkeletonHeader = () => {
  const { colors } = useTheme();
  const skeletonColor = colors.surfaceVariant;

  return (
    <View
      style={[styles.header, { backgroundColor: skeletonColor, opacity: 0.6 }]}
    />
  );
};

// Zaktualizowany główny komponent szkieletu
const VisitedCountriesSkeleton = () => {
  return (
    <View style={styles.container}>
      {/* Sekcja 1: Pierwszy kontynent */}
      <SkeletonHeader />
      <View style={styles.pillRow}>
        <SkeletonPill />
        <SkeletonPill style={{ width: 80 }} />
        <SkeletonPill style={{ width: 150 }} />
      </View>

      {/* Sekcja 2: Drugi kontynent */}
      <SkeletonHeader />
      <View style={styles.pillRow}>
        <SkeletonPill style={{ width: 100 }} />
        <SkeletonPill />
        <SkeletonPill style={{ width: 90 }} />
        <SkeletonPill style={{ width: 140 }} />
      </View>
    </View>
  );
};

// Zaktualizowane style
const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  header: {
    height: 20, // Niższy niż pigułka
    width: "40%", // np. 40% szerokości
    borderRadius: 8,
    marginBottom: 12, // Odstęp od pigułek poniżej
    marginTop: 10, // Odstęp od pigułek powyżej
    marginLeft: 4,
  },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginLeft: -4,
    marginRight: -4,
  },
  pill: {
    height: 32,
    width: 120, // Domyślna szerokość
    borderRadius: 16,
    marginVertical: 3.5,
    marginHorizontal: 3,
  },
});

export default VisitedCountriesSkeleton;
