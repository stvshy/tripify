// RootLayout.tsx
import "expo-dev-client";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as ExpoSplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { auth, db, app as firebaseApp } from "./config/firebaseConfig";
import { View, StyleSheet, Platform } from "react-native";
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
import * as SystemUI from "expo-system-ui";
import {
  hideNavBar,
  restoreNavBar,
  cleanupNavBarTimer,
  startNavBarAutoHide,
  stopNavBarAutoHide,
} from "./utils/navigationBar";
import { useTheme } from "react-native-paper";
import { useContext } from "react";
import { useAuthStore, UserProfileData } from "./store/authStore";
import { User as FirebaseUser } from "firebase/auth"; // Zmień alias lub użyj User bezpośrednio
import { useCommunityStore } from "./store/communityStore";
import { useCountryStore } from "./store/countryStore";
import { CountriesProvider } from "./config/CountryContext";
import { MapStateProvider } from "./config/MapStateProvider";
import { LocalCountProvider } from "./config/LocalCountContext";
import { useAllFonts } from "./config/fonts";

// Set navbar color IMMEDIATELY on app start (before any component rendering)
if (Platform.OS === "android") {
  try {
    // Set navbar to light color by default to prevent dark flash in light mode
    NavigationBar.setBackgroundColorAsync("#FFFFFF");
    NavigationBar.setButtonStyleAsync("dark");
    NavigationBar.setPositionAsync("relative");
    NavigationBar.setVisibilityAsync("hidden");
    console.log("🚀 IMMEDIATE navbar set to light");
  } catch (error) {
    console.log("Error setting immediate navbar:", error);
  }
}

ExpoSplashScreen.preventAutoHideAsync();

const AppNavigator = React.memo(
  ({ initialRouteName }: { initialRouteName: string }) => {
    const theme = useTheme();

    return (
      <Stack
        initialRouteName={initialRouteName}
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.background },
          presentation: "card",
          animation: "ios",
          gestureEnabled: true,
          gestureDirection: "horizontal",
        }}
      >
        <Stack.Screen
          name="welcome/index"
          options={{
            animation: "fade",
            gestureEnabled: false, // Wyłącz gesty dla welcome, żeby nie można było cofnąć
          }}
        />
        <Stack.Screen
          name="setNickname/index"
          options={{
            animation: "fade",
          }}
        />
        <Stack.Screen name="chooseCountries/index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="(registration)"
          options={{
            animation: "fade",
          }}
        />
        <Stack.Screen
          name="forgotPassword/index"
          options={{
            animation: "fade",
          }}
        />
        <Stack.Screen name="login/index" />
        <Stack.Screen name="profile/[uid]" />
      </Stack>
    );
  }
);

AppNavigator.displayName = "AppNavigator";

const queryClient = new QueryClient();

// Optimized NavBarManager with reduced re-renders
const NavBarManager = React.memo(
  ({
    initialRouteName,
    isLoadingAuth,
  }: {
    initialRouteName: string | null;
    isLoadingAuth: boolean;
  }) => {
    const { isDarkTheme } = useContext(ThemeContext);
    const theme = useTheme();

    // Memoize auth screens list to prevent recreation
    const authScreens = React.useMemo(
      () => [
        "welcome",
        "setNickname",
        "chooseCountries",
        "forgotPassword",
        "(registration)",
      ],
      []
    );

    // Optimized navbar management with single useEffect
    useEffect(() => {
      if (isLoadingAuth) {
        NavigationBar.setVisibilityAsync("hidden");
        return;
      }

      const currentRoute = initialRouteName;

      if (!currentRoute || authScreens.includes(currentRoute)) {
        return;
      }

      // All other screens: restore normal navbar with theme color
      const navbarColor = theme.colors.surface;
      console.log(
        `Setting navbar: route=${currentRoute}, dark=${isDarkTheme}, color=${navbarColor}`
      );

      NavigationBar.setPositionAsync("relative");
      NavigationBar.setBackgroundColorAsync(navbarColor);
      NavigationBar.setButtonStyleAsync(isDarkTheme ? "light" : "dark");
      NavigationBar.setVisibilityAsync("visible");
    }, [
      initialRouteName,
      isLoadingAuth,
      isDarkTheme,
      theme.colors.surface,
      authScreens,
    ]);

    return null;
  }
);

NavBarManager.displayName = "NavBarManager";

export default function RootLayout() {
  const isLoadingAuth = useAuthStore((state) => state.isLoadingAuth);
  const firebaseUser = useAuthStore((state) => state.firebaseUser);

  // Memoize selectors to prevent unnecessary re-renders
  const setFirebaseUser = useAuthStore((state) => state.setFirebaseUser);
  const setUserProfile = useAuthStore((state) => state.setUserProfile);
  const setIsLoadingAuth = useAuthStore((state) => state.setIsLoadingAuth);

  const listenForCommunityData = useCommunityStore(
    (state) => state.listenForCommunityData
  );
  const cleanupCommunity = useCommunityStore((state) => state.cleanup);
  // Load all fonts for complete app functionality
  const [fontsLoaded, fontError] = useAllFonts();
  const [initialRouteName, setInitialRouteName] = useState<string | null>(null);
  const [isAppReady, setIsAppReady] = useState(false);

  // Hide navbar during splash screen (loading)
  useEffect(() => {
    if (isLoadingAuth) {
      // Hide navbar during splash screen
      hideNavBar();
    }
  }, [isLoadingAuth]);

  // Critical initialization - do immediately
  useEffect(() => {
    useCountryStore.getState().initializeCountries();
  }, []);

  // Memoized finalizePreparation function
  const finalizePreparation = React.useCallback((route: string) => {
    setInitialRouteName(route);
    setIsLoadingAuth(false);
    setIsAppReady(true);
  }, []);

  useEffect(() => {
    if (!fontsLoaded && !fontError) {
      return;
    }

    console.log("RootLayout: Setting up onAuthStateChanged listener.");
    setIsLoadingAuth(true);

    const unsubscribeAuth = auth.onAuthStateChanged(
      async (user: FirebaseUser | null) => {
        console.log(
          "RootLayout: onAuthStateChanged FIRED. User:",
          user ? user.uid : "null",
          "Current route:",
          initialRouteName
        );

        // Prevent re-routing if we're already in the correct place
        if (initialRouteName && user) {
          const currentUserProfile = useAuthStore.getState().userProfile;
          if (
            currentUserProfile?.firstLoginComplete &&
            initialRouteName === "(tabs)"
          ) {
            console.log(
              "RootLayout: Already in correct place, skipping re-routing"
            );
            return;
          }
        }

        if (user) {
          // UŻYTKOWNIK JEST ZALOGOWANY
          // listenForCommunityData(); // Uruchom listenery dla danych społecznościowych
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
            console.log(
              "RootLayout: Routing decision - emailVerified:",
              profileData.emailVerified,
              "nickname:",
              profileData.nickname,
              "firstLoginComplete:",
              profileData.firstLoginComplete
            );
            if (!profileData.emailVerified) {
              console.log(
                "RootLayout: Redirecting to welcome (email not verified)"
              );
              finalizePreparation("welcome");
            } else if (!profileData.nickname) {
              console.log("RootLayout: Redirecting to setNickname");
              finalizePreparation("setNickname");
            } else if (!profileData.firstLoginComplete) {
              console.log("RootLayout: Redirecting to chooseCountries");
              finalizePreparation("chooseCountries");
            } else {
              console.log("RootLayout: Redirecting to (tabs)");
              finalizePreparation("(tabs)");
            }
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
          console.log(
            "RootLayout: No user logged in, cleaning up community data"
          );
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
      // cleanupCommunity();
    };
  }, [
    // === NOWA, POPRAWNA TABLICA ZALEŻNOŚCI ===
    fontsLoaded,
    fontError,
    // Dodajemy stabilne funkcje, które pobraliśmy
    setFirebaseUser,
    setUserProfile,
    setIsLoadingAuth,
    listenForCommunityData,
    cleanupCommunity,
  ]);
  useEffect(() => {
    if (firebaseUser) {
      // Jeśli użytkownik JEST zalogowany
      listenForCommunityData();
    }
    // Funkcja czyszcząca uruchomi się, gdy `firebaseUser` się zmieni (np. na null)
    return () => {
      cleanupCommunity();
    };
  }, [firebaseUser]); // <-- Zależność tylko od obiektu użytkownika!

  // Hide splash screen when app is ready
  useEffect(() => {
    if (isAppReady && initialRouteName) {
      // Hide splash screen when everything is ready
      const timer = setTimeout(() => {
        ExpoSplashScreen.hideAsync();
      }, 100); // Minimal delay for smooth transition
      return () => clearTimeout(timer);
    }
  }, [isAppReady, initialRouteName]);

  if (fontError) {
    console.error("Font loading error:", fontError);
    return null; // Let native splash screen handle the error state
  }

  // Show native splash screen until app is ready
  if (!isAppReady || !initialRouteName) {
    return null; // Native splash screen will remain visible
  }

  // Jeśli dotarliśmy tutaj, nawigacja jest gotowa i initialRouteName jest ustawione
  return (
    <SafeAreaProvider style={{ flex: 1, backgroundColor: "transparent" }}>
      <GestureHandlerRootView
        style={{ flex: 1, backgroundColor: "transparent" }}
      >
        <DraxProvider>
          <ThemeProvider>
            <NavBarManager
              initialRouteName={initialRouteName}
              isLoadingAuth={isLoadingAuth}
            />
            <ThemedStatusBarAndNavBar />
            <QueryClientProvider client={queryClient}>
              <CountriesProvider>
                <MapStateProvider>
                  <LocalCountProvider>
                    {initialRouteName && (
                      <AppNavigator initialRouteName={initialRouteName} />
                    )}
                  </LocalCountProvider>
                </MapStateProvider>
              </CountriesProvider>
            </QueryClientProvider>
          </ThemeProvider>
        </DraxProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

// Memoized status bar component
const ThemedStatusBarAndNavBar = React.memo(() => {
  const { isDarkTheme } = useContext(ThemeContext);

  return (
    <StatusBar
      style={isDarkTheme ? "light" : "dark"}
      backgroundColor="transparent"
      translucent
    />
  );
});

ThemedStatusBarAndNavBar.displayName = "ThemedStatusBarAndNavBar";

const styles = StyleSheet.create({
  rootLayoutBackground: {
    flex: 1,
  },
  transparentContainer: {
    flex: 1,
    backgroundColor: "transparent", // Kluczowe dla przezroczystości
  },
});
