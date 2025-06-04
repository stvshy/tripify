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
import { useAuthStore, UserProfileData } from "./store/authStore";
import { User as FirebaseUser } from "firebase/auth"; // Zmień alias lub użyj User bezpośrednio
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

  useEffect(() => {
    fetchAndCacheBackgrounds();
  }, []);

  useEffect(() => {
    // Funkcja pomocnicza do finalizowania i ustawiania stanu gotowości
    const finalizePreparation = (route: string) => {
      setInitialRouteName(route);
      setIsLoadingAuth(false); // Zakończ ładowanie w store
      setIsNavigationReady(true); // Ustaw nawigację jako gotową
    };

    const prepareApp = async () => {
      if (!fontsLoaded && !fontError) {
        return; // Czekaj na załadowanie fontów
      }
      setIsLoadingAuth(true); // Rozpocznij ładowanie w store

      try {
        const unsubscribe = auth.onAuthStateChanged(
          async (user: FirebaseUser | null) => {
            unsubscribe(); // Odsubskrybuj po pierwszym odczycie

            if (user) {
              setFirebaseUser(user); // Zapisz obiekt FirebaseUser w store
              const userDocRef = doc(db, "users", user.uid);
              const userDoc = await getDoc(userDocRef);

              if (userDoc.exists()) {
                const firestoreData = userDoc.data();
                const profileData: UserProfileData = {
                  nickname: firestoreData?.nickname || null,
                  firstLoginComplete:
                    firestoreData?.firstLoginComplete || false,
                  emailVerified: user.emailVerified,
                };
                setUserProfile(profileData); // Zapisz profil w store

                // Ustal initialRouteName
                if (!profileData.emailVerified) finalizePreparation("welcome");
                else if (!profileData.nickname)
                  finalizePreparation("setNickname");
                else if (!profileData.firstLoginComplete)
                  finalizePreparation("chooseCountries");
                else finalizePreparation("(tabs)");
              } else {
                console.warn(
                  "User document not found in Firestore for UID:",
                  user.uid
                );
                const defaultProfile: UserProfileData = {
                  nickname: null,
                  firstLoginComplete: false,
                  emailVerified: user.emailVerified,
                };
                setUserProfile(defaultProfile);
                if (!user.emailVerified) finalizePreparation("welcome");
                else finalizePreparation("setNickname");
              }
            } else {
              // Brak zalogowanego użytkownika
              setFirebaseUser(null);
              setUserProfile(null);
              finalizePreparation("welcome");
            }
          }
        );
      } catch (error: any) {
        console.error("Error preparing app state:", error);
        setErrorAuth(error.message || "An unknown error occurred");
        setFirebaseUser(null);
        setUserProfile(null);
        finalizePreparation("welcome"); // Fallback route
      }
    };

    prepareApp();
  }, [
    fontsLoaded,
    fontError,
    setFirebaseUser,
    setUserProfile,
    setIsLoadingAuth,
    setErrorAuth,
    // Nie ma potrzeby dodawać setInitialRouteName i setIsNavigationReady,
    // ponieważ są one wywoływane przez funkcję zdefiniowaną wewnątrz tego efektu.
  ]);

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
                {/* Renderuj Stack tylko gdy initialRouteName jest dostępne (co jest zapewnione przez isNavigationReady) */}
                {initialRouteName && (
                  <Stack
                    initialRouteName={initialRouteName}
                    screenOptions={{
                      headerShown: false,
                      contentStyle: { backgroundColor: "transparent" },
                      presentation: "card",
                      animation: "ios",
                      gestureEnabled: true,
                      gestureDirection: "horizontal",
                    }}
                  />
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
