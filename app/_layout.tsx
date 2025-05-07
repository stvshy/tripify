import "expo-dev-client";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as ExpoSplashScreen from "expo-splash-screen"; // Zmieniono nazwę importu
import { useContext, useEffect, useState } from "react";
import { auth, db, app as firebaseApp } from "./config/firebaseConfig"; // Upewnij się, że 'app' jest eksportowane
import { StyleSheet } from "react-native";
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

// Stałe dla cache'owania teł
const CACHED_URLS_KEY = "cachedSplashBackgroundUrls";
const SPLASH_BACKGROUNDS_PATH = "splash_backgrounds";

// Funkcja do pobierania i cache'owania teł w tle
const fetchAndCacheBackgrounds = async () => {
  try {
    const storage = getStorage(firebaseApp);
    const listRef = ref(storage, SPLASH_BACKGROUNDS_PATH);
    // Usunięto logi dla czystości, ale można je przywrócić do debugowania
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
  // Ładowanie czcionek
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

  // Stany do zarządzania inicjalizacją
  const [initialRouteName, setInitialRouteName] = useState<string | null>(null);
  const [appIsReady, setAppIsReady] = useState(false);

  // Efekt do przygotowania aplikacji (sprawdzenie auth, danych użytkownika, ustawienie initialRouteName)
  useEffect(() => {
    const prepareApp = async () => {
      // Czekaj aż czcionki będą gotowe (lub wystąpi błąd ładowania czcionek)
      if (!fontsLoaded && !fontError) {
        return;
      }

      try {
        let currentUser = auth.currentUser;
        // Jeśli nie ma użytkownika, poczekaj na zmianę stanu auth (może się logować w tle)
        if (!currentUser) {
          currentUser = await new Promise((resolve) => {
            const unsubscribe = auth.onAuthStateChanged((user) => {
              unsubscribe();
              resolve(user);
            });
          });
        }

        // Ustalenie początkowej trasy na podstawie stanu użytkownika
        if (currentUser) {
          const userDocRef = doc(db, "users", currentUser.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const isVerified = currentUser.emailVerified;
            const nickname = userData?.nickname;
            const firstLoginComplete = userData?.firstLoginComplete;

            if (!isVerified) {
              setInitialRouteName("welcome"); // Niezweryfikowany -> ekran powitalny/logowania
            } else if (!nickname) {
              setInitialRouteName("setNickname"); // Zweryfikowany, brak nicku -> ustaw nick
            } else if (!firstLoginComplete) {
              setInitialRouteName("chooseCountries"); // Ma nick, nie wybrał krajów -> wybierz kraje
            } else {
              setInitialRouteName("(tabs)"); // Wszystko gotowe -> główny interfejs
            }
          } else {
            // Użytkownik w Auth, ale brak dokumentu (np. nowy user FB/Google)
            setInitialRouteName("welcome"); // Skieruj do welcome/setNickname
          }
        } else {
          // Brak zalogowanego użytkownika
          setInitialRouteName("welcome");
        }
      } catch (error) {
        console.error("Error preparing app state:", error);
        setInitialRouteName("welcome"); // Fallback w razie błędu
      } finally {
        // Oznacz aplikację jako gotową do pokazania interfejsu (niezależnie od wyniku)
        setAppIsReady(true);
      }
    };

    prepareApp();
    // Zależność od stanu załadowania czcionek
  }, [fontsLoaded, fontError]);

  // Efekt do pobierania teł splash screena w tle (uruchamiany raz)
  useEffect(() => {
    fetchAndCacheBackgrounds();
  }, []);

  // Efekt do ukrywania natywnego splash screena
  useEffect(() => {
    // Ukryj splash screen dopiero gdy czcionki są gotowe, aplikacja jest gotowa
    // ORAZ mamy ustaloną początkową trasę.
    if (appIsReady && initialRouteName && (fontsLoaded || fontError)) {
      ExpoSplashScreen.hideAsync();
    }
  }, [appIsReady, initialRouteName, fontsLoaded, fontError]); // Zależność od wszystkich warunków

  // Wyświetlaj LoadingScreen dopóki wszystkie warunki nie są spełnione
  if (!appIsReady || !initialRouteName || (!fontsLoaded && !fontError)) {
    return <LoadingScreen />;
  }

  // Jeśli wystąpił błąd ładowania czcionek, można wyświetlić komunikat błędu
  if (fontError) {
    // Możesz tu zwrócić dedykowany ekran błędu lub prosty tekst
    console.error("Font loading error:", fontError);
    // return <View><Text>Error loading fonts.</Text></View>; // Przykładowy ekran błędu
  }

  // Aplikacja gotowa, renderuj główny nawigator
  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <DraxProvider>
          <ThemeProvider>
            {/* Komponent do zarządzania StatusBar i NavigationBar */}
            <ThemedStatusBarAndNavBar tooltipVisible={false} />
            <QueryClientProvider client={queryClient}>
              {/* Główny Stack Navigator */}
              <Stack
                initialRouteName={initialRouteName} // Użyj dynamicznie ustalonej nazwy
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: "transparent" },
                }} // Ukryj domyślny nagłówek
              >
                {/* 
                  Nie ma potrzeby definiować tutaj <Stack.Screen>, 
                  Expo Router automatycznie wykryje trasy z folderów w /app 
                */}
              </Stack>
            </QueryClientProvider>
          </ThemeProvider>
        </DraxProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
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
  logo: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  loader: {
    marginTop: 20,
  },
});
