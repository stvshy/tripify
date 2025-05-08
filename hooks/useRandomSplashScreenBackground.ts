// hooks/useRandomSplashBackground.ts
import { useState, useEffect } from "react";
import { ImageSourcePropType } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const CACHED_URLS_KEY = "cachedSplashBackgroundUrls";
const DEFAULT_LOCAL_BACKGROUND_SOURCE: number = require("../assets/images/gradient7.png");

// Definiujemy typ zwracany przez hooka
export interface BackgroundSourceResult {
  type: "local" | "uri";
  source: ImageSourcePropType; // Dla lokalnego to będzie liczba, dla URI obiekt {uri: string}
  uri?: string; // Opcjonalne pole URI dla łatwiejszego dostępu
}

export function useRandomSplashBackground(): BackgroundSourceResult {
  // Inicjalizujemy stan z typem lokalnym
  const [backgroundResult, setBackgroundResult] =
    useState<BackgroundSourceResult>({
      type: "local",
      source: DEFAULT_LOCAL_BACKGROUND_SOURCE,
    });

  useEffect(() => {
    let isMounted = true;
    const selectBackground = async () => {
      try {
        const cachedUrlsJson = await AsyncStorage.getItem(CACHED_URLS_KEY);
        const cachedUrls: string[] | null = cachedUrlsJson
          ? JSON.parse(cachedUrlsJson)
          : null;

        let finalResult: BackgroundSourceResult = {
          type: "local",
          source: DEFAULT_LOCAL_BACKGROUND_SOURCE,
        };

        if (cachedUrls && cachedUrls.length > 0) {
          // Tworzymy listę opcji z typami
          const localOption: BackgroundSourceResult = {
            type: "local",
            source: DEFAULT_LOCAL_BACKGROUND_SOURCE,
          };
          const uriOptions: BackgroundSourceResult[] = cachedUrls.map(
            (url) => ({
              type: "uri",
              source: { uri: url },
              uri: url,
            })
          );

          const allOptions = [localOption, ...uriOptions];
          const randomIndex = Math.floor(Math.random() * allOptions.length);
          finalResult = allOptions[randomIndex];
        }

        if (isMounted) {
          setBackgroundResult(finalResult);
        }
      } catch (error) {
        console.error("useRandomSplashBackground: Error:", error);
        if (isMounted) {
          setBackgroundResult({
            type: "local",
            source: DEFAULT_LOCAL_BACKGROUND_SOURCE,
          }); // Fallback
        }
      }
    };

    selectBackground();
    return () => {
      isMounted = false;
    };
  }, []);

  return backgroundResult;
}
