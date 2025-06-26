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
import {
  doc,
  DocumentData,
  DocumentSnapshot,
  getDoc,
} from "firebase/firestore";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as NavigationBar from "expo-navigation-bar";
import { useTheme } from "react-native-paper";
import { getStorage, ref, listAll, getDownloadURL } from "firebase/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";
import FastImage from "@d11/react-native-fast-image";
import { useAuthStore, UserProfileData } from "./store/authStore";
import { User as FirebaseUser } from "firebase/auth"; // Zmień alias lub użyj User bezpośrednio
import { useCommunityStore } from "./store/communityStore";

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
  const {
    isLoadingAuth,
    setFirebaseUser,
    setUserProfile,
    setIsLoadingAuth,
    setErrorAuth,
  } = useAuthStore();
  const [fontsLoaded, fontError] = useFonts({
    "PlusJakartaSans-Bold": require("../assets/fonts/PlusJakartaSans-Bold.ttf"),
    "DMSans-Bold": require("../assets/fonts/DMSans-Bold.ttf"),
    "DMSans-SemiBold": require("../assets/fonts/DMSans-SemiBold.ttf"),
    "Inter-Bold": require("../assets/fonts/Inter-Bold.ttf"),
    "Inter-SemiBold": require("../assets/fonts/Inter-SemiBold.ttf"),
    "Inter-Regular": require("../assets/fonts/Inter-Regular.ttf"),
    "Inter-Medium": require("../assets/fonts/Inter-Medium.ttf"),
    "Figtree-Regular": require("../assets/fonts/Figtree-Regular.ttf"),
    "Figtree-SemiBold": require("../assets/fonts/Figtree-SemiBold.ttf"),
    "Figtree-Medium": require("../assets/fonts/Figtree-Medium.ttf"),
    "Figtree-Bold": require("../assets/fonts/Figtree-Bold.ttf"),
    Inter: require("../assets/fonts/Inter-VariableFont_opsz,wght.ttf"),
  });
  const [initialRouteName, setInitialRouteName] = useState<string | null>(null);
  const [isNavigationReady, setIsNavigationReady] = useState(false);

  const { listenForCommunityData, cleanup: cleanupCommunity } =
    useCommunityStore();
  useEffect(() => {
    fetchAndCacheBackgrounds();
  }, []);

  useEffect(() => {
    // Czekamy na załadowanie fontów, to jest poprawne.
    if (!fontsLoaded && !fontError) {
      return;
    }

    // Funkcja pomocnicza do finalizowania, bez zmian.
    const finalizePreparation = (route: string) => {
      setInitialRouteName(route);
      setIsLoadingAuth(false);
      setIsNavigationReady(true);
    };

    console.log("RootLayout: Setting up onAuthStateChanged listener.");
    setIsLoadingAuth(true);

    const unsubscribeAuth = auth.onAuthStateChanged(
      async (user: FirebaseUser | null) => {
        console.log(
          "RootLayout: onAuthStateChanged FIRED. User:",
          user ? user.uid : "null"
        );

        if (user) {
          // UŻYTKOWNIK JEST ZALOGOWANY
          listenForCommunityData(); // Uruchom listenery dla danych społecznościowych
          setFirebaseUser(user);

          const userDocRef = doc(db, "users", user.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            const firestoreData = userDoc.data();
            const profileData: UserProfileData = {
              nickname: firestoreData?.nickname || null,
              firstLoginComplete: firestoreData?.firstLoginComplete || false,
              emailVerified: user.emailVerified,
            };
            setUserProfile(profileData);

            // Standardowa logika routingu
            if (!profileData.emailVerified) finalizePreparation("welcome");
            else if (!profileData.nickname) finalizePreparation("setNickname");
            else if (!profileData.firstLoginComplete)
              finalizePreparation("chooseCountries");
            else finalizePreparation("(tabs)");
          } else {
            // To się nie powinno zdarzyć dla zalogowanego użytkownika, ale jest dobrym zabezpieczeniem.
            // Dzieje się tak tylko jeśli dokument zostanie usunięty ręcznie w bazie.
            console.warn(
              "User document not found for a logged-in user:",
              user.uid
            );
            const defaultProfile: UserProfileData = {
              nickname: null,
              firstLoginComplete: false,
              emailVerified: user.emailVerified,
            };
            setUserProfile(defaultProfile);
            // Skieruj na ścieżkę naprawczą (np. ustawienie nicku)
            finalizePreparation("setNickname");
          }
        } else {
          // BRAK ZALOGOWANEGO UŻYTKOWNIKA
          cleanupCommunity(); // Wyczyść dane i zatrzymaj listenery
          setFirebaseUser(null);
          setUserProfile(null);
          finalizePreparation("welcome");
        }
      }
    );

    return () => {
      // Funkcja czyszcząca
      console.log("RootLayout: Unsubscribing from onAuthStateChanged.");
      unsubscribeAuth();
      cleanupCommunity();
    };
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    if (fontsLoaded && isNavigationReady) {
      // Ukryj Splash Screen, gdy fonty są załadowane i nawigacja jest gotowa
      const timer = setTimeout(() => {
        ExpoSplashScreen.hideAsync();
      }, 50); // Krótkie opóźnienie dla pewności
      return () => clearTimeout(timer);
    }
  }, [fontsLoaded, isNavigationReady, fontError]);

  if (fontError) {
    console.error("Font loading error:", fontError);
    return <LoadingScreen />;
  }

  // Pokazuj LoadingScreen dopóki nawigacja nie jest gotowa
  // (co obejmuje załadowanie fontów, zakończenie isLoadingAuth ze store'u i ustalenie initialRouteName)
  if (!isNavigationReady) {
    return <LoadingScreen />;
  }

  // Jeśli dotarliśmy tutaj, nawigacja jest gotowa i initialRouteName jest ustawione
  return (
    <SafeAreaProvider style={{ flex: 1, backgroundColor: "transparent" }}>
      <GestureHandlerRootView
        style={{ flex: 1, backgroundColor: "transparent" }}
      >
        <DraxProvider>
          <ThemeProvider>
            <ThemedStatusBarAndNavBar tooltipVisible={false} />
            <QueryClientProvider client={queryClient}>
              <ThemedBackgroundWrapper>
                {initialRouteName && (
                  <Stack // Ten <Stack> jest głównym nawigatorem
                    initialRouteName={initialRouteName}
                    screenOptions={{
                      headerShown: false,
                      contentStyle: { backgroundColor: "transparent" },
                      presentation: "card",
                      animation: "ios", // Domyślny slide dla innych przejść
                      gestureEnabled: true,
                      gestureDirection: "horizontal",
                    }}
                  >
                    {/* Definiujemy ekrany wewnątrz tego Stacka */}
                    <Stack.Screen
                      name="welcome/index"
                      options={{
                        animation: "fade",
                      }}
                    />
                    <Stack.Screen name="setNickname/index" />
                    <Stack.Screen name="chooseCountries/index" />
                    <Stack.Screen name="(tabs)" />
                    <Stack.Screen name="(registration)" />
                    <Stack.Screen name="forgotPassword/index" />
                    <Stack.Screen name="login/index" />
                    {/* Dodaj tutaj inne Stack.Screen dla tras najwyższego poziomu,
                        jeśli chcesz dla nich ustawić specyficzne opcje lub
                        jawnie je zadeklarować. Pamiętaj o poprawnych nazwach
                        zgodnych z tym, co widzi Expo Router (np. "nazwaFolderu/index").
                    */}
                  </Stack>
                )}
              </ThemedBackgroundWrapper>
            </QueryClientProvider>
          </ThemeProvider>
        </DraxProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
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
