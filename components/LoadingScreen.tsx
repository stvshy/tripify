// components/LoadingScreen.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Image,
  StyleSheet,
  ImageBackground,
  ImageSourcePropType,
  Platform, // Import Platform
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import MyCustomSpinner from "./MyCustomSpinner2"; // Assuming MyCustomSpinner2 is correct
// import { useTheme as usePaperTheme } from "react-native-paper"; // paperTheme is not used

// Ensure this path is correct for LoadingScreen.tsx
// If LoadingScreen.tsx is in 'components' and assets is at the root:
const DEFAULT_LOADING_BACKGROUND = require("../assets/images/gradient7.png");
const CACHED_URLS_KEY = "cachedSplashBackgroundUrls";

const LoadingScreen = ({ showLogo = true }) => {
  // const paperTheme = usePaperTheme(); // paperTheme was not used
  const [backgroundSource, setBackgroundSource] = useState<ImageSourcePropType>(
    DEFAULT_LOADING_BACKGROUND
  );
  const [isLoadingBackground, setIsLoadingBackground] = useState(true); // To manage fade-in

  useEffect(() => {
    let isMounted = true;
    // console.log("LoadingScreen: useEffect triggered");

    const selectAndSetBackground = async () => {
      // console.log("LoadingScreen: selectAndSetBackground called");
      try {
        const cachedUrlsJson = await AsyncStorage.getItem(CACHED_URLS_KEY);
        // console.log("LoadingScreen: cachedUrlsJson:", cachedUrlsJson);
        const cachedUrls: string[] | null = cachedUrlsJson
          ? JSON.parse(cachedUrlsJson)
          : null;

        let finalSource: ImageSourcePropType = DEFAULT_LOADING_BACKGROUND;

        if (cachedUrls && cachedUrls.length > 0) {
          const allOptions: ImageSourcePropType[] = [
            DEFAULT_LOADING_BACKGROUND,
            ...cachedUrls.map((url) => ({ uri: url })),
          ];
          const randomIndex = Math.floor(Math.random() * allOptions.length);
          finalSource = allOptions[randomIndex];
          // console.log("LoadingScreen: Selected URI background:", finalSource);
        } else {
          // console.log("LoadingScreen: Using default background");
        }

        if (isMounted) {
          setBackgroundSource(finalSource);
          // setIsLoadingBackground(false); // Start fade-in after source is set
        }
      } catch (error) {
        console.error(
          "LoadingScreen: Error selecting loading background:",
          error
        );
        if (isMounted) {
          setBackgroundSource(DEFAULT_LOADING_BACKGROUND); // Fallback
          // setIsLoadingBackground(false);
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
      // Important: resizeMode for ImageBackground is on the component itself,
      // imageStyle is for more specific styling of the <Image> component *within* ImageBackground
      resizeMode="cover" // Apply resizeMode directly
      // imageStyle={{ resizeMode: "cover" }} // This can be used for finer control if needed
      onError={(error) => {
        console.warn(
          "LoadingScreen: Failed to load background image:",
          error.nativeEvent.error
        );
        // Fallback if any image (URI or local) fails to load
        setBackgroundSource(DEFAULT_LOADING_BACKGROUND);
      }}
      // fadeDuration={Platform.OS === 'android' ? 0 : undefined} // fadeDuration 0 can cause issues on iOS with local images
      onLoadEnd={() => {
        // console.log("LoadingScreen: Background image loaded");
        setIsLoadingBackground(false); // Image (default or URI) has loaded/failed, allow content to show
      }}
    >
      {/* Conditionally render children or keep them transparent until background loads */}
      <View
        style={[
          styles.container,
          // { opacity: isLoadingBackground ? 0 : 1 }, // Optional: Fade in content after background
        ]}
      >
        {showLogo && (
          <Image
            source={require("../assets/images/tripify-icon.png")} // Ensure this path is correct
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
    backgroundColor: "#FFFFFF", // Set a fallback background color for the View
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    // backgroundColor: 'rgba(0,0,0,0.1)', // For debugging layout
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
});

export default LoadingScreen;
