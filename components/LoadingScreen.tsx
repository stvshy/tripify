// components/LoadingScreen.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Image,
  StyleSheet,
  ImageBackground,
  ImageSourcePropType,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import MyCustomSpinner from "./MyCustomSpinner2";
import { useTheme as usePaperTheme } from "react-native-paper";

// Użyj tego samego mechanizmu co w SplashScreen
const DEFAULT_LOADING_BACKGROUND = require("../assets/images/gradient7.png");
const CACHED_URLS_KEY = "cachedSplashBackgroundUrls"; // Ten sam klucz co w SplashScreen

const LoadingScreen = ({ showLogo = true }) => {
  const paperTheme = usePaperTheme();
  const [backgroundSource, setBackgroundSource] = useState<ImageSourcePropType>(
    DEFAULT_LOADING_BACKGROUND
  );

  useEffect(() => {
    let isMounted = true;

    const selectAndSetBackground = async () => {
      try {
        const cachedUrlsJson = await AsyncStorage.getItem(CACHED_URLS_KEY);
        const cachedUrls: string[] | null = cachedUrlsJson
          ? JSON.parse(cachedUrlsJson)
          : null;

        let finalSource = DEFAULT_LOADING_BACKGROUND;

        if (cachedUrls && cachedUrls.length > 0) {
          const allOptions: ImageSourcePropType[] = [
            DEFAULT_LOADING_BACKGROUND,
            ...cachedUrls.map((url) => ({ uri: url })),
          ];
          const randomIndex = Math.floor(Math.random() * allOptions.length);
          finalSource = allOptions[randomIndex];
        }

        if (isMounted) {
          setBackgroundSource(finalSource);
        }
      } catch (error) {
        console.error("Error selecting loading background:", error);
        if (isMounted) {
          setBackgroundSource(DEFAULT_LOADING_BACKGROUND);
        }
      }
    };

    selectAndSetBackground();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <ImageBackground
      source={backgroundSource}
      style={styles.background}
      imageStyle={{ resizeMode: "cover", width: "110%", height: "110%" }}
      onError={(error) => {
        console.warn(
          "Failed to load loading background:",
          error.nativeEvent.error
        );
        setBackgroundSource(DEFAULT_LOADING_BACKGROUND);
      }}
      fadeDuration={0}
    >
      <View style={styles.container}>
        {showLogo && (
          <Image
            source={require("../assets/images/tripify-icon.png")}
            style={styles.logo}
          />
        )}
        <MyCustomSpinner size="large" />
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
});

export default LoadingScreen;
