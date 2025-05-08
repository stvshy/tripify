// LoadingScreen.tsx (Uproszczona wersja)
import React from "react";
import { View, Image, ActivityIndicator, StyleSheet } from "react-native";

// Nie potrzebujemy już logiki tła tutaj

const LoadingScreen = ({ showLogo = true }) => {
  return (
    // Zamiast ImageBackground, użyjemy zwykłego View,
    // bo tło będzie pochodzić z _layout.tsx
    <View style={styles.container}>
      {showLogo && (
        <Image
          source={require("../assets/images/tripify-icon.png")}
          style={styles.logo}
        />
      )}
      <ActivityIndicator size="large" color="#FFF" style={styles.loader} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // Zmieniono nazwę ze styles.background
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent", // WAŻNE: Musi być przezroczysty
  },
  // centerContainer już niepotrzebny, bo container robi to samo
  logo: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  loader: {
    marginTop: 20,
  },
});

export default LoadingScreen;
