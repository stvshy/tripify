// hooks/useRandomSplashBackground.ts
import { useState, useEffect } from "react";
import { ImageSourcePropType } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Klucz i domyślne tło - zdefiniowane w jednym miejscu
const CACHED_URLS_KEY = "cachedSplashBackgroundUrls";
const DEFAULT_BACKGROUND = require("../assets/images/gradient7.png"); // Ścieżka względna do folderu assets

export function useRandomSplashBackground(): ImageSourcePropType {
  const [backgroundSource, setBackgroundSource] =
    useState<ImageSourcePropType>(DEFAULT_BACKGROUND);

  useEffect(() => {
    let isMounted = true;
    const selectBackground = async () => {
      try {
        const cachedUrlsJson = await AsyncStorage.getItem(CACHED_URLS_KEY);
        const cachedUrls: string[] | null = cachedUrlsJson
          ? JSON.parse(cachedUrlsJson)
          : null;

        let finalSource = DEFAULT_BACKGROUND;
        if (cachedUrls && cachedUrls.length > 0) {
          const allOptions: ImageSourcePropType[] = [
            DEFAULT_BACKGROUND,
            ...cachedUrls.map((url) => ({ uri: url })),
          ];
          const randomIndex = Math.floor(Math.random() * allOptions.length);
          finalSource = allOptions[randomIndex];
        }

        if (isMounted) {
          setBackgroundSource(finalSource);
        }
      } catch (error) {
        console.error("useRandomSplashBackground: Error:", error);
        if (isMounted) {
          setBackgroundSource(DEFAULT_BACKGROUND); // Fallback
        }
      }
    };

    selectBackground();
    return () => {
      isMounted = false;
    };
  }, []); // Uruchom tylko raz przy montowaniu komponentu używającego hooka

  return backgroundSource;
}
