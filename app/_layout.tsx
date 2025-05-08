import "expo-dev-client";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as ExpoSplashScreen from "expo-splash-screen"; // Zmieniono nazwę importu
import { useContext, useEffect, useState } from "react";
import { auth, db, app as firebaseApp } from "./config/firebaseConfig"; // Upewnij się, że 'app' jest eksportowane
import { ImageBackground, StyleSheet, View } from "react-native";
import LoadingScreen from "@/components/LoadingScreen";
import { ThemeContext, ThemeProvider } from "./config/ThemeContext";
import { DraxProvider } from "react-native-drax";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { doc, getDoc } from "firebase/firestore";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as NavigationBar from "expo-navigation-bar";
import { useTheme } from "react-native-paper";
import { getStorage, ref, listAll, getDownloadURL } from "firebase/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";
import FastImage from "@d11/react-native-fast-image";

import { useRandomSplashBackground } from "../hooks/useRandomSplashScreenBackground"; // Upewnij się, że ścieżka jest poprawna
// Zapobiegaj automatycznemu ukrywaniu natywnego splash screena
ExpoSplashScreen.preventAutoHideAsync();
const queryClient = new QueryClient();
const CACHED_URLS_KEY = "cachedSplashBackgroundUrls";
const SPLASH_BACKGROUNDS_PATH = "splash_backgrounds";

// Nie potrzebujemy już FALLBACK_LAYOUT_BACKGROUND tutaj, hook to obsłuży

const fetchAndCacheBackgrounds = async () => {
  try {
    const storage = getStorage(firebaseApp);
    const listRef = ref(storage, SPLASH_BACKGROUNDS_PATH);
    const res = await listAll(listRef);
    if (res.items.length === 0) return;
    const urls = await Promise.all(
      res.items.map((itemRef) => getDownloadURL(itemRef))
    );
    await AsyncStorage.setItem(CACHED_URLS_KEY, JSON.stringify(urls));
    const preloadObjects = urls.map((url) => ({ uri: url }));
    FastImage.preload(preloadObjects);
  } catch (error) {
    console.error("Error fetching/caching splash backgrounds:", error);
  }
};

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    "PlusJakartaSans-Bold": require("../assets/fonts/PlusJakartaSans-Bold.ttf"),
    "DMSans-Bold": require("../assets/fonts/DMSans-Bold.ttf"),
    "DMSans-SemiBold": require("../assets/fonts/DMSans-SemiBold.ttf"),
    "Inter-Bold": require("../assets/fonts/Inter-Bold.ttf"),
    "Inter-SemiBold": require("../assets/fonts/Inter-SemiBold.ttf"),
    "Inter-Regular": require("../assets/fonts/Inter-Regular.ttf"),
    "Inter-Medium": require("../assets/fonts/Inter-Medium.ttf"),
    "Figtree-Regular": require("../assets/fonts/Figtree-Regular.ttf"),
    "Figtree-Medium": require("../assets/fonts/Figtree-Medium.ttf"),
  });
  const [initialRouteName, setInitialRouteName] = useState<string | null>(null);
  const [appIsReady, setAppIsReady] = useState(false);

  // Użyj hooka do losowania tła
  const backgroundResult = useRandomSplashBackground();

  useEffect(() => {
    const prepareApp = async () => {
      if (!fontsLoaded && !fontError) return;
      try {
        let currentUser = auth.currentUser;
        if (!currentUser) {
          currentUser = await new Promise((resolve) => {
            const unsubscribe = auth.onAuthStateChanged((user) => {
              unsubscribe();
              resolve(user);
            });
          });
        }
        if (currentUser) {
          const userDocRef = doc(db, "users", currentUser.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const isVerified = currentUser.emailVerified;
            const nickname = userData?.nickname;
            const firstLoginComplete = userData?.firstLoginComplete;
            if (!isVerified) setInitialRouteName("welcome");
            else if (!nickname) setInitialRouteName("setNickname");
            else if (!firstLoginComplete)
              setInitialRouteName("chooseCountries");
            else setInitialRouteName("(tabs)");
          } else {
            setInitialRouteName("welcome");
          }
        } else {
          setInitialRouteName("welcome");
        }
      } catch (error) {
        console.error("Error preparing app state:", error);
        setInitialRouteName("welcome");
      } finally {
        setAppIsReady(true);
      }
    };
    prepareApp();
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    fetchAndCacheBackgrounds();
  }, []);

  useEffect(() => {
    if (appIsReady && initialRouteName && (fontsLoaded || fontError)) {
      const timer = setTimeout(() => {
        // Dodajemy małe opóźnienie
        ExpoSplashScreen.hideAsync();
      }, 50); // np. 50ms
      return () => clearTimeout(timer);
    }
  }, [appIsReady, initialRouteName, fontsLoaded, fontError]);

  // Renderowanie
  // Używamy ImageBackground dla lokalnych i FastImage dla URI
  const renderBackground = () => {
    if (backgroundResult.type === "local") {
      return (
        <ImageBackground
          source={backgroundResult.source} // To będzie wynik require()
          style={styles.rootLayoutBackground} // Zmieniono na rootLayoutBackground
          fadeDuration={0}
        >
          {renderContent()}
        </ImageBackground>
      );
    } else if (backgroundResult.type === "uri" && backgroundResult.uri) {
      return (
        <View style={styles.rootLayoutBackground}>
          <FastImage
            style={StyleSheet.absoluteFill}
            source={{
              uri: backgroundResult.uri,
              priority: FastImage.priority.normal,
            }}
            resizeMode={FastImage.resizeMode.cover}
          />
          {renderContent()}
        </View>
      );
    }
    // Fallback, jeśli coś pójdzie nie tak (nie powinno się zdarzyć z logiką hooka)
    return <View style={styles.rootLayoutBackground}>{renderContent()}</View>;
  };

  const renderContent = () => (
    <SafeAreaProvider style={styles.transparentContainer}>
      <GestureHandlerRootView style={styles.transparentContainer}>
        <DraxProvider>
          <ThemeProvider>
            <ThemedStatusBarAndNavBar tooltipVisible={false} />
            <QueryClientProvider client={queryClient}>
              {!appIsReady ||
              !initialRouteName ||
              (!fontsLoaded && !fontError) ? (
                <LoadingScreen />
              ) : (
                <Stack
                  initialRouteName={initialRouteName}
                  screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: "transparent" },
                  }}
                />
              )}
            </QueryClientProvider>
          </ThemeProvider>
        </DraxProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );

  // Jeśli czcionki się jeszcze ładują lub wystąpił błąd, ale aplikacja nie jest gotowa
  // (ten warunek jest teraz w renderContent, ale można go też tu zostawić dla LoadingScreen)
  if (!appIsReady || !initialRouteName || (!fontsLoaded && !fontError)) {
    // Renderuj tło, a w nim LoadingScreen
    return renderBackground();
  }
  if (fontError) {
    console.error("Font loading error:", fontError);
    // Można zwrócić dedykowany ekran błędu z tłem
    return renderBackground(); // Nadal pokazuj tło, nawet przy błędzie czcionek
  }

  return renderBackground();
}

// Komponent do stylizacji paska statusu i nawigacji (bez zmian)
function ThemedStatusBarAndNavBar({
  tooltipVisible, // Ten prop wydaje się nieużywany, ale zostawiam
}: {
  tooltipVisible: boolean;
}) {
  const { isDarkTheme } = useContext(ThemeContext);
  const theme = useTheme(); // Zakładam, że to theme z react-native-paper

  useEffect(() => {
    // Ustaw kolor tła paska nawigacji (dolnego)
    NavigationBar.setBackgroundColorAsync(
      isDarkTheme ? theme.colors.surface : theme.colors.surface // Dostosuj kolory jeśli trzeba
    );
    // Ustaw styl przycisków paska nawigacji (dolnego)
    NavigationBar.setButtonStyleAsync(isDarkTheme ? "light" : "dark");
  }, [isDarkTheme, theme.colors.surface]); // Zależność od motywu

  return (
    <StatusBar
      style={isDarkTheme ? "light" : "dark"} // Styl ikon paska statusu (górnego)
      backgroundColor="transparent" // Przezroczyste tło, aby gradient był widoczny
      translucent // Pozwala treści wchodzić pod pasek statusu (dla efektu pełnego ekranu)
    />
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  centerContainer: {
    justifyContent: "center",
    alignItems: "center",
    flex: 1,
  },
  rootLayoutBackground: {
    flex: 1,
  },
  transparentContainer: {
    flex: 1,
    backgroundColor: "transparent", // Kluczowe dla przezroczystości
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
