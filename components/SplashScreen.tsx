import React, { useEffect, useState } from "react";
import {
  View,
  Image,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
  ImageBackground,
  Animated,
  ImageSourcePropType, // Importuj ten typ
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
// Zakładamy, że FastImage.preload() zostanie wywołane gdzie indziej
// import FastImage from '@d11/react-native-fast-image';

const { height, width } = Dimensions.get("window");

// 1. Zdefiniuj jedno, domyślne tło lokalne
const DEFAULT_SPLASH_BACKGROUND = require("../../assets/images/gradient7.png");
// 2. Klucz do przechowywania pobranych URLi w AsyncStorage
const CACHED_URLS_KEY = "cachedSplashBackgroundUrls";
// ---

export default function SplashScreen() {
  const [fadeAnim] = useState(new Animated.Value(0));
  // Stan przechowujący aktualnie wybrane źródło tła
  // Może to być wynik require() lub obiekt { uri: '...' }
  const [backgroundSource, setBackgroundSource] = useState<ImageSourcePropType>(
    DEFAULT_SPLASH_BACKGROUND
  );

  useEffect(() => {
    let isMounted = true; // Flaga do śledzenia montowania

    // Funkcja asynchroniczna do wyboru tła
    const selectAndSetBackground = async () => {
      try {
        // 3. Sprawdź, czy mamy zapisane URL-e w AsyncStorage
        const cachedUrlsJson = await AsyncStorage.getItem(CACHED_URLS_KEY);
        const cachedUrls: string[] | null = cachedUrlsJson
          ? JSON.parse(cachedUrlsJson)
          : null;

        let finalSource = DEFAULT_SPLASH_BACKGROUND;

        if (cachedUrls && cachedUrls.length > 0) {
          // 4. Jeśli są URL-e, stwórz listę wszystkich opcji
          const allOptions: ImageSourcePropType[] = [
            DEFAULT_SPLASH_BACKGROUND, // Dodaj domyślne jako opcję
            ...cachedUrls.map((url) => ({ uri: url })), // Przekształć URL-e na format { uri: ... }
          ];
          // Losuj spośród wszystkich opcji
          const randomIndex = Math.floor(Math.random() * allOptions.length);
          finalSource = allOptions[randomIndex];
        }
        // else - jeśli nie ma cache, finalSource pozostaje DEFAULT_SPLASH_BACKGROUND

        if (isMounted) {
          setBackgroundSource(finalSource);
        }
      } catch (error) {
        console.error("Error selecting splash background:", error);
        // W razie błędu (np. parsowania JSON), użyj domyślnego
        if (isMounted) {
          setBackgroundSource(DEFAULT_SPLASH_BACKGROUND);
        }
      } finally {
        // Rozpocznij animację zanikania niezależnie od wyniku
        // Upewnij się, że komponent jest nadal zamontowany
        if (isMounted) {
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }).start();
        }
      }
    };

    selectAndSetBackground();

    // Funkcja czyszcząca useEffect
    return () => {
      isMounted = false; // Ustaw flagę na false przy odmontowywaniu
    };
  }, [fadeAnim]); // Uruchom tylko raz (fadeAnim się nie zmienia)

  return (
    <ImageBackground
      source={backgroundSource} // Użyj tła ze stanu
      style={styles.background}
      imageStyle={{ resizeMode: "cover", width: "110%", height: "110%" }}
      // Opcjonalnie: dodaj onError dla obrazów z URI, aby wrócić do domyślnego
      onError={(error) => {
        console.warn(
          "Failed to load background image:",
          error.nativeEvent.error
        );
        setBackgroundSource(DEFAULT_SPLASH_BACKGROUND); // Wróć do domyślnego w razie błędu ładowania URI
      }}
    >
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <Image
          source={require("../../assets/images/tripify-icon.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <ActivityIndicator
          size="large"
          color="#6a1b9a"
          style={styles.loadingIndicator}
        />
      </Animated.View>
    </ImageBackground>
  );
}

// Style (bez zmian)
const styles = StyleSheet.create({
  background: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    justifyContent: "center",
    alignItems: "center",
    paddingTop: height * 0.1,
  },
  logo: {
    width: width * 0.5,
    height: height * 0.25,
    marginBottom: height * 0.05,
  },
  loadingIndicator: {
    marginTop: height * 0.03,
  },
});
