// components/LoadingScreen.tsx
import React from "react";
import { View, Image, StyleSheet } from "react-native";
import MyCustomSpinner from "./MyCustomSpinner2"; // Załóżmy, że to jest Twój spinner
import { useTheme as usePaperTheme } from "react-native-paper"; // Jeśli potrzebujesz motywu do spinnera

const LoadingScreen = ({ showLogo = true }) => {
  // const paperTheme = usePaperTheme(); // Jeśli spinner potrzebuje kolorów z motywu

  return (
    <View style={styles.container}>
      {showLogo && (
        <Image
          source={require("../assets/images/tripify-icon.png")} // Upewnij się, że ścieżka jest poprawna
          style={styles.logo}
        />
      )}
      <MyCustomSpinner size="large" /* color={paperTheme.colors.primary} */ />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    // backgroundColor: "transparent", // WAŻNE: Musi być przezroczysty
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  // loader: { // Już niepotrzebne, jeśli MyCustomSpinner jest używany bezpośrednio
  //   marginTop: 20,
  // },
});

export default LoadingScreen;
