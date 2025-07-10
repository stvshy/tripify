// app/(tabs)/_layout.tsx
import React, { useEffect, useState, useContext, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
  SafeAreaView,
  Pressable,
  BackHandler,
} from "react-native";
import { Tabs, useRouter, useSegments, useFocusEffect } from "expo-router"; // Usunięto useNavigation

import { onAuthStateChanged, signOut, User } from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { auth } from "../config/firebaseConfig";
import { ThemeContext } from "../config/ThemeContext";
import { useTheme } from "react-native-paper";
import LoadingScreen from "@/components/LoadingScreen";
import AntDesign from "@expo/vector-icons/AntDesign";
import Ionicons from "@expo/vector-icons/Ionicons";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { BottomTabBarButtonProps } from "@react-navigation/bottom-tabs";
import { CountriesProvider, useCountries } from "../config/CountryContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import filteredCountriesData from "../../components/filteredCountries.json";
import { useAuthStore } from "../store/authStore";
import { MapStateProvider } from "../config/MapStateProvider";
import { MMKV } from "react-native-mmkv";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { useCommunityStore } from "../store/communityStore";

const mmkv = new MMKV();
const db = getFirestore();
const persister = createSyncStoragePersister({
  storage: {
    setItem: (key, value) => mmkv.set(key, value),
    getItem: (key) => mmkv.getString(key) ?? null,
    removeItem: (key) => mmkv.delete(key),
  },
});

// Custom TabBarButton component
const CustomTabBarButton: React.FC<BottomTabBarButtonProps> = ({
  children,
  onPress,
}) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [
      styles.customTabButton,
      pressed && styles.pressedTabButton,
    ]}
  >
    {children}
  </Pressable>
);

// Badge component for displaying counts
const Badge: React.FC<{ count: number }> = ({ count }) => {
  const theme = useTheme();
  if (count <= 0) return null;
  return (
    <View
      style={[styles.badgeContainer, { backgroundColor: theme.colors.primary }]}
    >
      <Text style={styles.badgeText}>{count}</Text>
    </View>
  );
};

export default function TabLayout() {
  return (
    // 2. Owiń wszystko w MapStateProvider
    <CountriesProvider>
      <MapStateProvider>
        <TabLayoutContent />
      </MapStateProvider>
    </CountriesProvider>
  );
}

function VisitedToggle() {
  const segments = useSegments();
  const router = useRouter();
  const theme = useTheme();
  const { visitedCountriesCount } = useCountries();
  const totalCountriesCount = filteredCountriesData.countries.length;

  const inVisited =
    segments.length === 3 &&
    segments[0] === "(tabs)" &&
    segments[1] === "two" &&
    segments[2] === "chooseVisitedCountries";

  const iconName = inVisited ? "eye-off-outline" : "eye-check-outline";

  const onPress = () =>
    inVisited ? router.back() : router.push("/two/chooseVisitedCountries");

  return (
    <Pressable
      onPress={onPress}
      style={{ flexDirection: "row", alignItems: "center", marginRight: 16 }}
    >
      {/* <MaterialCommunityIcons
        name={iconName}
        size={20}
        color={theme.colors.primary}
      /> */}
      <Text
        style={{
          marginRight: 7,
          color: theme.colors.onSurface,
          fontSize: 14.3,
          fontFamily: "Figtree-Regular",
        }}
      >
        {visitedCountriesCount}/{totalCountriesCount}
      </Text>
      <MaterialCommunityIcons
        name={iconName}
        size={20}
        color={theme.colors.primary}
        style={{
          marginRight: -2,
        }}
      />
    </Pressable>
  );
}

const TabLayoutContent: React.FC = () => {
  const theme = useTheme();
  // const [user, setUser] = useState<User | null>(auth.currentUser);
  // const [loading, setLoading] = useState(true);
  // const [isUserDataFetched, setIsUserDataFetched] = useState(false);
  // const [nickname, setNickname] = useState<string | null>(null);
  const window = useWindowDimensions();
  // const [friendRequestsCount, setFriendRequestsCount] = useState<number>(0);
  const segments = useSegments();
  const {
    firebaseUser,
    userProfile,
    isLoadingAuth,
    clearAuthData, // Do wylogowania
  } = useAuthStore();
  const router = useRouter();
  // const [friendRequestsCount, setFriendRequestsCount] = useState<number>(0);
  useFocusEffect(
    React.useCallback(() => {
      console.log(
        "TabLayout FOCUSED. isLoadingAuth:",
        isLoadingAuth,
        "firebaseUser:",
        !!firebaseUser,
        "userProfile:",
        userProfile
      );

      // 1. Jeśli RootLayout nadal ładuje, nic nie rób tutaj.
      //    RootLayout sam pokaże LoadingScreen.
      if (isLoadingAuth) {
        console.log("TabLayout: isLoadingAuth is TRUE, waiting.");
        return;
      }

      // 2. Jeśli po zakończeniu ładowania przez RootLayout nie ma użytkownika lub profilu,
      //    przekieruj. To obsłuży przypadek wylogowania.
      if (!firebaseUser || !userProfile) {
        console.log(
          "TabLayout: No firebaseUser or userProfile (isLoadingAuth is false). REPLACING to /welcome."
        );
        router.replace("/welcome");
        return; // Ważne, aby zakończyć tutaj, jeśli przekierowujemy
      }

      // 3. Sprawdź inne warunki, jeśli użytkownik i profil istnieją
      if (!userProfile.emailVerified) {
        console.log("TabLayout: Email NOT verified. REPLACING to /welcome.");
        router.replace("/welcome");
        return;
      }
      if (!userProfile.nickname) {
        console.log(
          "TabLayout: Nickname IS NULL/empty. REPLACING to /setNickname."
        );
        router.replace("/setNickname");
        return;
      }
      if (!userProfile.firstLoginComplete) {
        console.log(
          "TabLayout: First login NOT complete. REPLACING to /chooseCountries."
        );
        router.replace("/chooseCountries");
        return;
      }

      console.log("TabLayout: All checks PASSED. Staying in tabs.");
    }, [isLoadingAuth, firebaseUser, userProfile, router])
  );

  // useEffect dla friendRequestsCount
  // ZMIANA: Pobierz nowe dane i akcje ze store'a (dodaj je na górze komponentu TabLayoutContent)
  const { listenToFriendRequests, friendRequestsCount } = useAuthStore();

  // ZMIANA: Zastąp stary useEffect tym
  useEffect(() => {
    if (firebaseUser?.uid) {
      // Uruchom nasłuchiwanie, przekazując UID użytkownika
      listenToFriendRequests(firebaseUser.uid);
    }

    // Funkcja czyszcząca jest teraz zarządzana wewnątrz store'a,
    // więc nie musimy jej tutaj zwracać.
  }, [firebaseUser, listenToFriendRequests]);

  // if (isLoadingAuth) {
  //   // Jeśli RootLayout (i store) nadal ładuje podstawowe dane autentykacji/profilu
  //   return <LoadingScreen showLogo={true} />;
  // }
  // useFocusEffect dla BackHandler (ten jest OK, bo jest hookiem)
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        console.log("BackHandler: segments=", segments);

        const layoutGroup = segments[0]; // np. "(tabs)"
        const currentTabRouteName = segments[1] as string | undefined; // np. "three", "two", lub undefined

        // Jeśli jesteśmy na ekranie głębiej wewnątrz stosu zakładki
        // np. ["(tabs)", "three", "friendRequests"]
        if (segments.length > 2) {
          console.log(
            "Deeper screen in tab, allowing default back behavior (e.g., navigating back within the tab's stack)."
          );
          return false; // Pozwól na cofanie wewnątrz stosu zakładki
        }

        if (layoutGroup === "(tabs)") {
          // Przypadek 1: Jesteśmy na initialRouteName (zakładamy, że to 'index')
          // Wtedy segments to np. ["(tabs)"] (długość 1)
          if (segments.length === 1) {
            console.log(
              "On (tabs) initial route (which is 'index'). Allowing app exit/minimize."
            );
            return false; // Pozwól na domyślne zachowanie (wyjście/minimalizacja)
          }
          // Przypadek 2: Jesteśmy na innej nazwanej zakładce (nie initialRouteName)
          // Wtedy segments to np. ["(tabs)", "three"] lub ["(tabs)", "two"]
          else if (
            segments.length === 2 &&
            (currentTabRouteName === "three" || currentTabRouteName === "two")
          ) {
            console.log(
              `On tab '${currentTabRouteName}'. Navigating to initial tab (index).`
            );
            // Nawiguj do initialRouteName layoutu (tabs), czyli do ścieżki bazowej tego layoutu.
            // Jeśli initialRouteName="index", to / (tabs) / rozwiąże się do / (tabs)/index.
            router.navigate("/(tabs)/");
            return true; // Zapobiegnij domyślnemu zachowaniu
          }
          // Przypadek 3 (zabezpieczenie, choć mniej prawdopodobny z initialRouteName="index"):
          // Jeśli segments to ["(tabs)", "index"]
          else if (segments.length === 2 && currentTabRouteName === "index") {
            console.log(
              "Explicitly on 'index' tab (segments: ['(tabs)', 'index']). Allowing app exit/minimize."
            );
            return false;
          }
        }

        console.log(
          "Unhandled custom back behavior case or not in (tabs) layout. Allowing default back behavior."
        );
        return false;
      };

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress
      );

      return () => subscription.remove();
    }, [segments, router]) // Usunięto navigation z zależności
  );

  // --- Logika renderowania ---
  // Pokazuj LoadingScreen tylko, gdy RootLayout (i store) sygnalizuje ładowanie.
  // Jeśli isLoadingAuth jest false, ale nie ma użytkownika, useFocusEffect powinien
  // był już zainicjować przekierowanie, a my tu zwrócimy null lub lekki placeholder,
  // aby uniknąć renderowania Tabs.
  if (isLoadingAuth) {
    return <LoadingScreen showLogo={true} />;
  }

  // Jeśli nie ładujemy, ale nie ma użytkownika lub profilu
  // (co oznacza, że useFocusEffect zaraz przekieruje lub już to zrobił),
  // zwróć null, aby uniknąć próby renderowania Tabs z niekompletnymi danymi.
  // To zapobiega błędowi "Rendered fewer hooks" bo nie ma wczesnego return *przed* innymi hookami.
  if (!firebaseUser || !userProfile) {
    console.log(
      "TabLayout: Rendering null/placeholder because no firebaseUser or userProfile (and not isLoadingAuth). Redirect should be in progress."
    );
    return null; // Lub <View style={{ flex: 1, backgroundColor: theme.colors.background }} />;
  }

  // Jeśli dotarliśmy tutaj, mamy użytkownika, profil i nie ładujemy. Renderuj Tabs.
  const handleLogout = async () => {
    try {
      await signOut(auth);
      clearAuthData(); // To spowoduje zmianę firebaseUser/userProfile na null,
      // co z kolei triggeruje useFocusEffect do przekierowania.
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const handleNavigateToAccount = () => {
    router.push("/account");
  };
  const HEADER_HEIGHT = 75; // Stała wysokość headera w pikselach
  const TAB_BAR_HEIGHT = 50; // Stała wysokość paska zakładek w pikselach
  const TAB_ICON_MARGIN_TOP = 12; // Stały margines górny ikon w pikselach
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Tabs
        initialRouteName="index"
        backBehavior="none"
        screenOptions={{
          tabBarIconStyle: {
            marginTop: TAB_ICON_MARGIN_TOP, // Stała wartość zamiast window.height * 0.014
          },
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
          tabBarStyle: {
            backgroundColor: theme.colors.surface,
            height: TAB_BAR_HEIGHT, // Stała wartość zamiast window.height * 0.067
            borderTopWidth: 0,
            justifyContent: "center",
          },
          tabBarItemStyle: {
            justifyContent: "center",
            alignItems: "center",
            marginTop: TAB_ICON_MARGIN_TOP, // Stała wartość zamiast window.height * 0.014
          },
          headerStyle: {
            backgroundColor: theme.colors.surface,
            height: HEADER_HEIGHT, // Stała wartość zamiast window.height * 0.108
            shadowOpacity: 0,
            elevation: 0,
          },
          headerTitle: () => (
            <SafeAreaView>
              <Pressable
                onPress={handleNavigateToAccount}
                style={({ pressed }) => [
                  styles.headerTitleContainer,
                  pressed && styles.pressedHeader,
                ]}
              >
                <AntDesign
                  name="user"
                  size={19}
                  color={theme.colors.onSurface}
                  style={styles.userIcon}
                />
                <Text
                  style={[
                    styles.headerTitleText,
                    { color: theme.colors.onSurface },
                  ]}
                >
                  {userProfile.nickname ? userProfile.nickname : "Welcome"}
                </Text>
              </Pressable>
            </SafeAreaView>
          ),
        }}
      >
        {/* Three Tab (Community) - Pierwsze miejsce w UI */}
        <Tabs.Screen
          name="three"
          options={{
            title: "",
            tabBarButton: (props) => (
              <CustomTabBarButton onPress={props.onPress}>
                {props.children}
              </CustomTabBarButton>
            ),
            tabBarIcon: ({ color }) => (
              <Ionicons name="people" size={26} color={color} />
            ),
            headerRight: () => (
              <Pressable
                onPress={() => router.push("/community/friendRequests")}
                style={({ pressed }) => [
                  styles.headerRightContainer,
                  pressed && styles.pressedHeaderRight,
                ]}
              >
                <View style={{ position: "relative" }}>
                  <Ionicons
                    name="mail-outline"
                    size={23}
                    color={theme.colors.onSurface}
                  />
                  <Badge count={friendRequestsCount} />
                </View>
              </Pressable>
            ),
          }}
        />
        {/* Index Tab (Main/InteractiveMap) - Środkowe miejsce w UI */}
        <Tabs.Screen
          name="index"
          options={{
            // unmountOnBlur: true,
            title: "",
            tabBarButton: (props) => (
              <CustomTabBarButton onPress={props.onPress}>
                {props.children}
              </CustomTabBarButton>
            ),
            tabBarIcon: ({ color }) => (
              <Ionicons name="earth" size={26} color={color} />
            ),
            headerRight: () => (
              <Pressable
                onPress={() => {
                  /* TODO: Implement search functionality */
                }}
                style={({ pressed }) => [
                  styles.headerRightContainer,
                  pressed && styles.pressedHeaderRight,
                ]}
              >
                <AntDesign
                  name="search1"
                  size={20.1}
                  color={theme.colors.onSurface}
                />
              </Pressable>
            ),
          }}
        />
        {/* Two Tab (ChooseCountries) - Trzecie miejsce w UI */}
        <Tabs.Screen
          name="two"
          options={{
            title: "",
            tabBarButton: (props) => (
              <CustomTabBarButton onPress={props.onPress}>
                {props.children}
              </CustomTabBarButton>
            ),
            tabBarIcon: ({ color }) => (
              <View style={styles.tabIconContainer}>
                <FontAwesome6 name="list-check" size={22} color={color} />
              </View>
            ),
            headerRight: () => <VisitedToggle />,
          }}
        />
      </Tabs>
    </View>
  );
};

const styles = StyleSheet.create({
  headerTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  pressedHeader: {
    opacity: 0.6,
  },
  headerRightContainer: {
    marginRight: 16,
  },
  pressedHeaderRight: {
    opacity: 0.6,
  },
  pressedTabButton: {
    opacity: 0.6,
  },
  customTabButton: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  tabIconContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  userIcon: {
    marginRight: 8,
    marginLeft: -4,
  },
  headerTitleText: {
    fontSize: 17,
    fontFamily: "Figtree-Regular",
  },
  badgeContainer: {
    position: "absolute",
    right: -6,
    top: -3,
    // backgroundColor: "#8A2BE2",
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
    minWidth: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
  visitedCountriesContainer: {
    marginRight: 16,
    borderRadius: 12,
  },
  visitedCountriesText: {
    color: "#fff",
  },
});
