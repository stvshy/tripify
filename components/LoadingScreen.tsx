// LoadingScreen.tsx (Uproszczona wersja)
import React from "react";
import { View, Image, StyleSheet } from "react-native";
import MyCustomSpinner from "./MyCustomSpinner2";

// Nie potrzebujemy już logiki tła tutaj

const LoadingScreen = ({ showLogo = true }) => {
  return (
    <View style={styles.container}>
      {showLogo && (
        <Image
          source={require("../assets/images/tripify-icon.png")}
          style={styles.logo}
        />
      )}
      <MyCustomSpinner size="large" />
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
