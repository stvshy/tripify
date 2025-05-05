// LoadingScreen.tsx
import React from "react"; // Usunięto useState, useEffect
import {
  View,
  ImageBackground,
  Image,
  ActivityIndicator,
  StyleSheet,
  // ImageSourcePropType, // Już niepotrzebne tutaj
} from "react-native";
// import AsyncStorage from '@react-native-async-storage/async-storage'; // Już niepotrzebne tutaj

// Zaimportuj custom hook
import { useRandomSplashBackground } from "../hooks/useRandomSplashScreenBackground"; // Upewnij się, że ścieżka jest poprawna!

// Domyślne tło jest teraz zdefiniowane w hooku, ale potrzebujemy go do onError
const DEFAULT_LOADING_BACKGROUND_FALLBACK = require("../assets/images/gradient7.png");

const LoadingScreen = ({ showLogo = true }) => {
  // Użyj hooka, aby uzyskać aktualne źródło tła
  const backgroundSource = useRandomSplashBackground();

  // Nie potrzebujemy już lokalnego stanu ani useEffect tutaj

  return (
    <ImageBackground
      source={backgroundSource} // Użyj źródła zwróconego przez hook
      style={styles.background}
      onError={(error) => {
        // Loguj błąd, ale hook sam powinien zwrócić domyślne tło w razie problemu.
        // Ten onError jest dodatkowym zabezpieczeniem.
        console.warn(
          "LoadingScreen: onError triggered for ImageBackground. Hook should handle fallback.",
          error.nativeEvent.error
        );
        // Można by spróbować ustawić tu statyczne tło, ale to wymagałoby stanu,
        // a hook już to robi. Zostawiamy bez setBackgroundSource.
      }}
      fadeDuration={0} // Zapobiega domyślnemu fade-in ImageBackground, co może pomóc w płynności
    >
      <View style={styles.centerContainer}>
        {showLogo && (
          <Image
            source={require("../assets/images/tripify-icon.png")} // Ścieżka do logo
            style={styles.logo}
          />
        )}
        <ActivityIndicator size="large" color="#FFF" style={styles.loader} />
      </View>
    </ImageBackground>
  );
};

// Style bez zmian
const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent", // Upewnij się, że kontener jest przezroczysty
  },
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
