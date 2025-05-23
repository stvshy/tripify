// RootLayout.tsx
import "expo-dev-client";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as ExpoSplashScreen from "expo-splash-screen";
import { useContext, useEffect, useState } from "react";
import { auth, db, app as firebaseApp } from "./config/firebaseConfig";
import { View, StyleSheet } from "react-native";
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

// Zapobiegaj automatycznemu ukrywaniu natywnego splash screena
ExpoSplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();
const CACHED_URLS_KEY = "cachedSplashBackgroundUrls";
const SPLASH_BACKGROUNDS_PATH = "splash_backgrounds";

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
        ExpoSplashScreen.hideAsync();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [appIsReady, initialRouteName, fontsLoaded, fontError]);

  // Renderowanie - teraz znacznie prostsze
  const renderContent = () => (
    <SafeAreaProvider style={{ flex: 1, backgroundColor: "transparent" }}>
      <GestureHandlerRootView
        style={{ flex: 1, backgroundColor: "transparent" }}
      >
        <DraxProvider>
          <ThemeProvider>
            <ThemedStatusBarAndNavBar tooltipVisible={false} />
            <QueryClientProvider client={queryClient}>
              {!appIsReady ||
              !initialRouteName ||
              (!fontsLoaded && !fontError) ? (
                <LoadingScreen /> // LoadingScreen ma teraz własne gradientowe tło
              ) : (
                // Gdy aplikacja załadowana, użyj prostego View z tłem z motywu
                <ThemedBackgroundWrapper>
                  <Stack
                    initialRouteName={initialRouteName}
                    screenOptions={{
                      headerShown: false,
                      contentStyle: { backgroundColor: "transparent" },
                    }}
                  />
                </ThemedBackgroundWrapper>
              )}
            </QueryClientProvider>
          </ThemeProvider>
        </DraxProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );

  if (!appIsReady || !initialRouteName || (!fontsLoaded && !fontError)) {
    return <LoadingScreen />;
  }

  if (fontError) {
    console.error("Font loading error:", fontError);
    return <LoadingScreen />; // Można stworzyć dedykowany ErrorScreen
  }

  return renderContent();
}

// Helper component do aplikowania tła z motywu
function ThemedBackgroundWrapper({ children }: { children: React.ReactNode }) {
  const theme = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {children}
    </View>
  );
}

// Komponent do stylizacji paska statusu i nawigacji
function ThemedStatusBarAndNavBar({
  tooltipVisible,
}: {
  tooltipVisible: boolean;
}) {
  const { isDarkTheme } = useContext(ThemeContext);
  const theme = useTheme();

  useEffect(() => {
    // Ustaw kolor tła paska nawigacji (dolnego)
    NavigationBar.setBackgroundColorAsync(
      isDarkTheme ? theme.colors.surface : theme.colors.surface
    );
    // Ustaw styl przycisków paska nawigacji (dolnego)
    NavigationBar.setButtonStyleAsync(isDarkTheme ? "light" : "dark");
  }, [isDarkTheme, theme.colors.surface]);

  return (
    <StatusBar
      style={isDarkTheme ? "light" : "dark"}
      backgroundColor="transparent"
      translucent
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
