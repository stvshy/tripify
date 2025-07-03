// app/profile/[uid].tsx
import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
  useContext,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Modal,
  NativeScrollEvent,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { db, auth } from "../config/firebaseConfig";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { useTheme, MD3DarkTheme, MD3LightTheme } from "react-native-paper"; // Added MD3DarkTheme, MD3LightTheme
import { Ionicons } from "@expo/vector-icons";
import countriesData from "../../assets/maps/countries_with_continents.json";
import RankingList from "../../components/RankingList";
import { ThemeContext } from "../config/ThemeContext";
import { useCommunityStore } from "../store/communityStore";
import { useFocusEffect } from "expo-router";
import { FlashList } from "@shopify/flash-list";
import { Country, RankingSlot } from "../../types/sharedTypes";
import { MotiView } from "moti";
import { LinearGradient } from "expo-linear-gradient";
import ShineMask from "@/components/ShineMask";
import CountryFlag from "react-native-country-flag";
import { useCountryStore } from "../store/countryStore";

interface UserProfile {
  uid: string;
  nickname: string;
  ranking: string[];
  countriesVisited: string[];
}

// Przenieś to poza komponent jako singleton
// const getCountriesMap = (() => {
//   let countriesMapCache: Map<any, any> | null = null;

//   return () => {
//     if (!countriesMapCache) {
//       countriesMapCache = new Map();
//       countriesData.countries.forEach((country) => {
//         countriesMapCache!.set(country.id, {
//           id: country.id,
//           name: country.name || "Unknown",
//           cca2: country.id,
//           continent: country.continent || "Other",
//         });
//       });
//     }
//     return countriesMapCache;
//   };
// })();
// Komponent 1: Górny pasek nawigacyjny
const ProfileTopBar = React.memo(
  ({
    onBack,
    onToggleTheme,
    isDarkTheme,
  }: {
    onBack: () => void;
    onToggleTheme: () => void;
    isDarkTheme: boolean;
  }) => {
    const theme = useTheme();
    return (
      <View
        style={[
          profileStyles.header,
          { paddingTop: Dimensions.get("window").height * 0.02 },
        ]}
      >
        <TouchableOpacity
          onPress={onBack}
          style={[
            profileStyles.headerButton,
            { marginLeft: -11, marginRight: -1 },
          ]}
        >
          <Ionicons
            name="arrow-back"
            size={26}
            color={theme.colors.onBackground}
          />
        </TouchableOpacity>
        <Text
          style={[
            profileStyles.headerTitle,
            { color: theme.colors.onBackground },
          ]}
        >
          Profile
        </Text>
        <TouchableOpacity
          onPress={onToggleTheme}
          style={[profileStyles.headerButton, { marginRight: -7 }]}
        >
          <Ionicons
            name={isDarkTheme ? "sunny" : "moon"}
            size={24}
            color={theme.colors.onBackground}
          />
        </TouchableOpacity>
      </View>
    );
  }
);

// Komponent 2: Panel z informacjami o użytkowniku i przyciskami
const UserInfoPanel = React.memo(
  ({
    userProfile,
    isFriend,
    hasSentRequest,
    hasReceivedRequest,
    incomingRequestFromProfile,
    handlers,
  }: {
    userProfile: UserProfile;
    isFriend: boolean;
    hasSentRequest: boolean;
    hasReceivedRequest: boolean;
    incomingRequestFromProfile: any; // Dostosuj typ, jeśli go masz
    handlers: {
      onAdd: () => void;
      onRemove: () => void;
      onAccept: () => void;
      onDecline: () => void;
    };
  }) => {
    const theme = useTheme();
    const { isDarkTheme } = useContext(ThemeContext);
    const currentUser = auth.currentUser;

    return (
      <View style={profileStyles.userPanel}>
        <Ionicons
          name="person-circle"
          size={100}
          color={theme.colors.primary}
        />
        <Text
          style={[profileStyles.userName, { color: theme.colors.onBackground }]}
        >
          {userProfile.nickname}
        </Text>

        {currentUser?.uid !== userProfile.uid && (
          <>
            {hasReceivedRequest ? (
              <View style={profileStyles.friendActionButtons}>
                <TouchableOpacity
                  onPress={handlers.onAccept}
                  style={[
                    profileStyles.acceptButton,
                    { backgroundColor: theme.colors.primary },
                  ]}
                >
                  <Text style={profileStyles.buttonText}>Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handlers.onDecline}
                  style={[
                    profileStyles.declineButton,
                    { backgroundColor: "rgba(116, 116, 116, 0.3)" },
                  ]}
                >
                  <Text style={profileStyles.buttonText}>Decline</Text>
                </TouchableOpacity>
              </View>
            ) : isFriend ? (
              <TouchableOpacity
                onPress={handlers.onRemove}
                style={[
                  profileStyles.addFriendButton,
                  {
                    backgroundColor: isDarkTheme
                      ? "rgba(171, 109, 197, 0.4)"
                      : "rgba(191, 115, 229, 0.43)",
                  },
                ]}
              >
                <Text
                  style={{ color: "#fff", fontSize: 14, fontWeight: "500" }}
                >
                  Friend
                </Text>
              </TouchableOpacity>
            ) : hasSentRequest ? (
              <TouchableOpacity
                style={[
                  profileStyles.addFriendButton,
                  {
                    backgroundColor: isDarkTheme
                      ? "rgba(128, 128, 128, 0.4)"
                      : "rgba(204, 204, 204, 0.7)",
                  },
                ]}
                disabled={true}
              >
                <Text style={profileStyles.addFriendButtonText}>Sent</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={handlers.onAdd}
                style={[
                  profileStyles.addFriendButton,
                  { backgroundColor: theme.colors.primary },
                ]}
              >
                <Text style={profileStyles.addFriendButtonText}>Add</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    );
  }
);

// Komponent 3: Podgląd rankingu
const RankingPreview = React.memo(
  ({
    rankingSlots,
    onShowFull,
  }: {
    rankingSlots: RankingSlot[];
    onShowFull: () => void;
  }) => {
    const theme = useTheme();
    return (
      <View style={profileStyles.rankingContainer}>
        <View style={profileStyles.rankingHeader}>
          <Text
            style={[
              profileStyles.sectionTitle,
              { color: theme.colors.onSurface },
            ]}
          >
            Ranking
          </Text>
          <TouchableOpacity onPress={onShowFull}>
            <Text
              style={[
                profileStyles.showAllRankingButton,
                { color: theme.colors.primary },
              ]}
            >
              Show Full
            </Text>
          </TouchableOpacity>
        </View>
        <RankingList rankingSlots={rankingSlots.slice(0, 5)} />
      </View>
    );
  }
);

// // W komponencie użyj:
// const countriesMap = getCountriesMap();
const continentColors = {
  Europe: "#E6E6FA", // Lawendowy
  Asia: "#DFF0D8", // Bladozielony
  Africa: "#fcf4ca", // Waniliowy
  "North America": "#D9EDF7", // Błękitny
  "South America": "#F2DEDE", // Różany
  Oceania: "#E0FFFF", // Jasny cyjan
  Antarctica: "#FFFFFF",
  Other: "#EAEAEA",
};

const darkContinentColors = {
  Europe: "#4A4A6A",
  Asia: "#425C3B",
  Africa: "#665B31",
  "North America": "#3E5666",
  "South America": "#694141",
  Oceania: "#3A6363",
  Antarctica: "#333333",
  Other: "#333333",
};

const generateUniqueId = () =>
  `rank-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
// ZMIANA 2: Definiujemy stałe dla renderowania przyrostowego
const INITIAL_BATCH_SIZE = 40; // Ile krajów pokazać na start
const SCROLL_BATCH_SIZE = 20; // Ile krajów dorenderować przy każdym scrollu
type ListItem =
  | { type: "header"; id: string; continent: string; count: number }
  | {
      type: "countries_row";
      id: string;
      countries: Country[];
      startingPillIndex: number; // <-- NOWE POLE
    };

export default function ProfileScreen() {
  useFocusEffect(
    useCallback(() => {
      // Pobieramy funkcje ze store'u wewnątrz callbacka
      const { listenForCommunityData, cleanup } = useCommunityStore.getState();

      listenForCommunityData(); // Uruchom nasłuchiwanie

      return () => cleanup(); // Sprzątaj, gdy ekran traci fokus
    }, [])
  );
  const { countriesMap, isLoading: isLoadingCountriesMap } = useCountryStore();

  const { uid: profileUid } = useLocalSearchParams<{ uid: string }>();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [rankingSlots, setRankingSlots] = useState<RankingSlot[]>([]);
  const [countriesVisited, setCountriesVisited] = useState<Country[]>([]);
  const [isProfileLoading, setIsProfileLoading] = useState(true); // Dotyczy danych z Firestore
  const [isCountryListProcessing, setIsCountryListProcessing] = useState(true); // Dotyczy przetwarzania listy krajów
  // const [loadingProfile, setLoadingProfile] = useState(true);
  const [visitedCount, setVisitedCount] = useState(0);
  const theme = useTheme();
  const router = useRouter();
  const { isDarkTheme, toggleTheme } = useContext(ThemeContext);
  const { height } = Dimensions.get("window");
  const [isRankingModalVisible, setIsRankingModalVisible] = useState(false);
  const currentUser = auth.currentUser;
  const [isScrolling, setIsScrolling] = useState(false);
  const [listData, setListData] = useState<ListItem[]>([]);
  const timerId = React.useRef<NodeJS.Timeout | null>(null);
  // const [isDataReadyForAnimation, setIsDataReadyForAnimation] = useState(false);
  const handleCountryPress = useCallback(
    (countryId: string) => {
      router.push(`/country/${countryId}`);
    },
    [router]
  );
  const {
    friends,
    incomingRequests,
    outgoingRequests,
    isLoading: isLoadingCommunity,
    acceptFriendRequest,
    rejectFriendRequest,
    sendFriendRequest,
    removeFriend,
  } = useCommunityStore();

  // const isLoading = loadingProfile;

  // Sprawdzenie statusu znajomości (POPRAWIONE)
  const isFriend = useMemo(
    () => friends.some((friend) => friend.uid === profileUid), // ZMIANA
    [friends, profileUid]
  );
  const hasSentRequest = useMemo(
    () => outgoingRequests.some((req) => req.receiverUid === profileUid),
    [outgoingRequests, profileUid]
  );
  const hasReceivedRequest = useMemo(
    () => incomingRequests.some((req) => req.senderUid === profileUid),
    [incomingRequests, profileUid]
  );
  const incomingRequestFromProfile = useMemo(
    () => incomingRequests.find((req) => req.senderUid === profileUid),
    [incomingRequests, profileUid]
  );

  // --- Dane dla Skeletona (twoja wersja, jest poprawna) ---
  const SKELETON_DATA: ListItem[] = useMemo(
    () => [
      {
        type: "header",
        id: "skeleton-header-1",
        continent: "",
        count: 0,
        startingPillIndex: 0,
      },
      {
        type: "countries_row",
        id: "skeleton-row-1",
        countries: Array(6).fill(null),
        startingPillIndex: 0,
      },
      {
        type: "header",
        id: "skeleton-header-2",
        continent: "",
        count: 0,
        startingPillIndex: 0,
      },
      {
        type: "countries_row",
        id: "skeleton-row-2",
        countries: Array(4).fill(null),
        startingPillIndex: 0,
      },
      {
        type: "countries_row",
        id: "skeleton-row-3",
        countries: Array(5).fill(null),
        startingPillIndex: 0,
      },
    ],
    []
  );
  // NOWY KOMPONENT: Skeleton dla nagłówka kontynentu
  const SkeletonHeader = () => {
    const theme = useTheme();
    return (
      <View style={profileStyles.continentSection}>
        <MotiView
          from={{ opacity: 0.4 }}
          animate={{ opacity: 0.8 }}
          transition={{
            type: "timing",
            duration: 800,
            loop: true,
            repeatReverse: true,
          }}
          style={{
            width: "40%",
            height: 20,
            borderRadius: 8,
            backgroundColor: theme.colors.surfaceVariant,
            marginBottom: 8,
            marginLeft: 4,
          }}
        />
      </View>
    );
  };
  const PillShineEffect = React.memo(
    ({ initialDelay }: { initialDelay: number }) => {
      const { isDarkTheme } = useContext(ThemeContext);
      const shineColor = isDarkTheme
        ? "rgba(255, 255, 255, 0.15)"
        : "rgba(255, 255, 255, 0.4)";

      // Nie ma już stanu ani useEffect! Komponent jest teraz znacznie lżejszy.
      return (
        <View
          style={{
            position: "absolute",
            width: "95%",
            height: "80%",
            top: "10%",
            left: "2.5%",
            overflow: "hidden",
            borderRadius: 12,
          }}
          pointerEvents="none"
        >
          <MotiView
            style={{ width: "100%", height: "100%" }}
            from={{ translateX: -120 }}
            animate={{ translateX: 120 }}
            transition={{
              type: "timing",
              duration: 1000,
              delay: initialDelay, // Używamy opóźnienia bezpośrednio
              loop: false,
            }}
          >
            <LinearGradient
              colors={["transparent", shineColor, "transparent"]}
              locations={[0.4, 0.5, 0.6]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ flex: 1, transform: [{ rotateZ: "20deg" }] }}
            />
          </MotiView>
        </View>
      );
    }
  );

  // NOWY KOMPONENT: Skeleton dla jednego wiersza pigułek
  const SkeletonPillRow = ({ count }: { count: number }) => {
    const theme = useTheme();
    // Generujemy pigułki o losowej szerokości dla bardziej naturalnego wyglądu
    const pills = useMemo(
      () =>
        [...Array(count)].map((_, i) => ({
          key: `skel-pill-${i}`,
          width: 50 + Math.random() * 50, // Szerokość między 70 a 120
        })),
      [count]
    );

    return (
      <View style={profileStyles.visitedListContainer}>
        {pills.map((pill) => (
          <MotiView
            key={pill.key}
            from={{ opacity: 0.4 }}
            animate={{ opacity: 0.8 }}
            transition={{
              type: "timing",
              duration: 800,
              loop: true,
              repeatReverse: true,
            }}
            style={{
              width: pill.width,
              height: 30,
              borderRadius: 40,
              margin: 4,
              backgroundColor: theme.colors.surfaceVariant,
            }}
          />
        ))}
      </View>
    );
  };
  // const processCountriesInBatches = (
  //   countryCodes: string[],
  //   onProgress: (progressData: ListItem[]) => void,
  //   onDone: (finalData: ListItem[], totalCount: number) => void
  // ) => {
  //   const BATCH_SIZE = 50; // Przetwarzaj 50 krajów na raz
  //   let currentIndex = 0;
  //   const groupedByContinent: Record<string, Country[]> = {};

  //   const processNextBatch = () => {
  //     const batchEnd = Math.min(currentIndex + BATCH_SIZE, countryCodes.length);
  //     for (let i = currentIndex; i < batchEnd; i++) {
  //       const code = countryCodes[i];
  //       const country = countriesMap.get(code);
  //       if (country) {
  //         const continent = country.continent || "Other";
  //         if (!groupedByContinent[continent]) {
  //           groupedByContinent[continent] = [];
  //         }
  //         groupedByContinent[continent].push(country);
  //       }
  //     }

  //     currentIndex = batchEnd;

  //     // Po każdej partii generujemy tymczasowe dane do wyświetlenia
  //     // Dzięki temu użytkownik widzi, jak lista się "buduje"
  //     const flatData: ListItem[] = [];
  //     const sortedContinents = Object.keys(groupedByContinent).sort();
  //     let cumulativePillCount = 0;

  //     for (const continent of sortedContinents) {
  //       const countriesInContinent = groupedByContinent[continent];
  //       flatData.push({
  //         type: "header",
  //         id: continent,
  //         continent,
  //         count: countriesInContinent.length,
  //       });
  //       flatData.push({
  //         type: "countries_row",
  //         id: `${continent}-row`,
  //         countries: countriesInContinent,
  //         startingPillIndex: cumulativePillCount,
  //       });
  //       cumulativePillCount += countriesInContinent.length;
  //     }
  //     onProgress(flatData); // Aktualizuj UI z postępem

  //     if (currentIndex < countryCodes.length) {
  //       // Jeśli jest więcej danych, zaplanuj następną partię w kolejnej klatce
  //       requestAnimationFrame(processNextBatch);
  //     } else {
  //       // Koniec pracy
  //       onDone(flatData, countryCodes.length);
  //     }
  //   };

  //   // Rozpocznij przetwarzanie
  //   requestAnimationFrame(processNextBatch);
  // };

  const [renderedCount, setRenderedCount] = useState(INITIAL_BATCH_SIZE);

  const handleScroll = useCallback(
    (event: NativeScrollEvent) => {
      if (isScrolling) return; // Zapobiegaj wielokrotnemu wywołaniu

      const { layoutMeasurement, contentOffset, contentSize } = event;
      const paddingToEnd = 100; // Zmniejszony bufor

      if (
        layoutMeasurement.height + contentOffset.y >=
          contentSize.height - paddingToEnd &&
        renderedCount < countriesVisited.length
      ) {
        setIsScrolling(true);

        requestAnimationFrame(() => {
          setRenderedCount((prevCount) =>
            Math.min(prevCount + SCROLL_BATCH_SIZE, countriesVisited.length)
          );
          setIsScrolling(false);
        });
      }
    },
    [renderedCount, countriesVisited.length, isScrolling]
  );
  useEffect(() => {
    // Warunek wyjścia nr 1: Nie mamy UID profilu
    if (!profileUid) {
      setIsProfileLoading(false);
      setIsCountryListProcessing(false);
      return;
    }

    // Warunek wyjścia nr 2: Mapa krajów jeszcze się nie załadowała
    if (isLoadingCountriesMap || !countriesMap) {
      // Nie robimy nic. Komponent pokaże loader, a ten useEffect uruchomi się ponownie,
      // gdy `isLoadingCountriesMap` zmieni się na `false`.
      return;
    }

    // Reset stanów na początku
    setIsProfileLoading(true);
    setIsCountryListProcessing(true);
    setUserProfile(null);
    setListData([]);
    setRankingSlots([]);
    setVisitedCount(0);

    const userRef = doc(db, "users", profileUid);
    const unsubscribe = onSnapshot(
      userRef,
      (snap) => {
        if (!snap.exists() || !snap.data()) {
          setUserProfile(null);
          setIsProfileLoading(false);
          setIsCountryListProcessing(false);
          return;
        }

        const data = snap.data() as UserProfile;

        // Krok 1: Ustaw "lekkie" dane i wyłącz główny loader
        setUserProfile(data);
        setIsProfileLoading(false); // <--- Główny loader profilu wyłączony. Ukaże się szkielet.

        const visitedCodesRaw = data.countriesVisited || [];
        const rankingRaw = data.ranking || [];

        // Krok 2: Przetwarzanie ciężkich danych (ranking i lista krajów)
        // TypeScript jest teraz zadowolony, bo wie, że `countriesMap` nie jest null.
        const newRankingSlots = rankingRaw
          .filter((code) => visitedCodesRaw.includes(code))
          .map((cca2, idx) => ({
            id: generateUniqueId(),
            rank: idx + 1,
            country: countriesMap.get(cca2) || null,
          }));
        setRankingSlots(newRankingSlots);

        // Krok 3: Przygotuj dane do listy (ta logika jest OK)
        const newCountriesVisited = Array.from(new Set(visitedCodesRaw))
          .map((code) => countriesMap.get(code))
          .filter((c): c is Country => c !== undefined);

        const groupedByContinent = newCountriesVisited.reduce(
          (acc, country) => {
            const continent = country.continent || "Other";
            if (!acc[continent]) acc[continent] = [];
            acc[continent].push(country);
            return acc;
          },
          {} as Record<string, Country[]>
        );

        let cumulativePillCount = 0;
        const finalData: ListItem[] = [];
        Object.entries(groupedByContinent)
          .sort(([a], [b]) => a.localeCompare(b))
          .forEach(([continent, countriesInContinent]) => {
            finalData.push({
              type: "header",
              id: continent,
              continent,
              count: countriesInContinent.length,
            });
            finalData.push({
              type: "countries_row",
              id: `${continent}-row`,
              countries: countriesInContinent,
              startingPillIndex: cumulativePillCount,
            });
            cumulativePillCount += countriesInContinent.length;
          });

        // Krok 4: Użyj `setTimeout`, aby dać UI czas na oddech
        setTimeout(() => {
          setListData(finalData);
          setVisitedCount(newCountriesVisited.length);
          setIsCountryListProcessing(false); // Wyłącz szkielet
        }, 50); // 50ms to bezpieczny bufor
      },
      (error) => {
        console.error("Błąd profilu:", error);
        setIsProfileLoading(false);
        setIsCountryListProcessing(false);
      }
    );

    return () => unsubscribe();
  }, [profileUid, countriesMap, isLoadingCountriesMap]);

  const renderSkeletonItem = useCallback(({ item }: { item: ListItem }) => {
    switch (item.type) {
      case "header":
        return <SkeletonHeader />;
      case "countries_row":
        // Przekazujemy liczbę "fałszywych" krajów do wyrenderowania
        return <SkeletonPillRow count={item.countries.length} />;
      default:
        return null;
    }
  }, []);
  // --- Handlers (POPRAWIONE) ---
  const handleAdd = () => {
    if (userProfile) {
      sendFriendRequest(userProfile.uid, userProfile.nickname);
    }
  };

  const handleRemove = () => {
    if (profileUid) {
      removeFriend(profileUid); // removeFriend oczekuje UID
    }
  };

  const handleAccept = () => {
    if (incomingRequestFromProfile) {
      acceptFriendRequest(incomingRequestFromProfile);
    }
  };

  const handleDecline = () => {
    if (incomingRequestFromProfile) {
      rejectFriendRequest(incomingRequestFromProfile.id);
    }
  };
  const CountryPillRow = React.memo(
    ({
      countries,
      onPress,
      startingPillIndex,
    }: {
      countries: Country[];
      onPress: (id: string) => void;
      startingPillIndex: number;
    }) => {
      const { isDarkTheme } = useContext(ThemeContext);
      const theme = useTheme(); // Potrzebujemy dostępu do theme
      const SHINE_LIMIT = 15;
      const SHINE_STAGGER = 50;

      return (
        <View style={profileStyles.visitedListContainer}>
          {countries.map((country, index) => {
            const continent = country.continent || "Other";
            const backgroundColor = isDarkTheme
              ? darkContinentColors[
                  continent as keyof typeof darkContinentColors
                ] || "#333"
              : continentColors[continent as keyof typeof continentColors] ||
                "#f0f0f0";

            const absolutePillIndex = startingPillIndex + index;
            const enableShine = absolutePillIndex < SHINE_LIMIT;

            // Bazowy komponent pigułki, zrekonstruowany wg starej wersji
            const pill = (
              <TouchableOpacity
                onPress={() => onPress(country.id)}
                style={[
                  profileStyles.visitedItemContainer, // Używamy starych, poprawnych stylów
                  { backgroundColor },
                ]}
              >
                <CountryFlag
                  isoCode={country.cca2}
                  size={20}
                  style={profileStyles.flag} // Używamy stylów flagi
                />
                <Text
                  style={[
                    profileStyles.visitedItemText,
                    { color: theme.colors.onSurface },
                  ]}
                >
                  {country.name}
                </Text>
              </TouchableOpacity>
            );

            return (
              <View key={country.id}>
                {enableShine ? (
                  <ShineMask delay={500 + absolutePillIndex * SHINE_STAGGER}>
                    {pill}
                  </ShineMask>
                ) : (
                  pill
                )}
              </View>
            );
          })}
        </View>
      );
    }
  );

  // ZASTĄP renderListItem tą wersją:
  const renderListItem = useCallback(
    ({ item, index }: { item: ListItem; index: number }) => {
      const delay = index * 80; // Kaskadowe opóźnienie dla animacji wejścia

      switch (item.type) {
        case "header":
          // Tekst nagłówka do owinięcia
          const headerText = (
            <Text style={profileStyles.continentTitle}>
              <Text style={{ color: isDarkTheme ? "#e6b3ff" : "#a821b5" }}>
                {item.continent}
              </Text>
              <Text style={{ color: "gray", fontSize: 14, fontWeight: "400" }}>
                {" "}
                ({item.count})
              </Text>
            </Text>
          );

          return (
            // 1. Animacja wejścia dla całego bloku
            <MotiView
              from={{ opacity: 0, translateY: 10 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: "timing", duration: 400, delay }}
              style={profileStyles.continentSection}
            >
              {/* 2. Dodatkowy, nałożony efekt shine */}
              <ShineMask delay={delay + 400}>{headerText}</ShineMask>
            </MotiView>
          );

        case "countries_row":
          return (
            // 1. Animacja wejścia dla całego wiersza pigułek
            <MotiView
              from={{ opacity: 0, translateY: 10 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: "timing", duration: 400, delay }}
            >
              {/* 2. Przekazujemy wiersz, który wewnątrz sam zdecyduje, gdzie dodać shine */}
              <CountryPillRow
                countries={item.countries}
                onPress={handleCountryPress}
                startingPillIndex={item.startingPillIndex}
              />
            </MotiView>
          );
        default:
          return null;
      }
    },
    [handleCountryPress, isDarkTheme]
  );
  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleShowFullRanking = useCallback(() => {
    setIsRankingModalVisible(true);
  }, []);

  const ListHeader = useCallback(
    () => (
      <>
        {/* Komponent 1: Zawsze renderowany, zależy tylko od motywu i funkcji nawigacji */}
        <ProfileTopBar
          onBack={handleBack}
          onToggleTheme={toggleTheme}
          isDarkTheme={isDarkTheme}
        />

        {/* Komponent 2: Renderowany tylko, gdy mamy profil, zależy od danych usera i statusu znajomych */}
        {userProfile && (
          <UserInfoPanel
            userProfile={userProfile}
            isFriend={isFriend}
            hasSentRequest={hasSentRequest}
            hasReceivedRequest={hasReceivedRequest}
            incomingRequestFromProfile={incomingRequestFromProfile}
            handlers={{
              onAdd: handleAdd,
              onRemove: handleRemove,
              onAccept: handleAccept,
              onDecline: handleDecline,
            }}
          />
        )}

        {/* Komponent 3: Zależy tylko od danych rankingu */}
        <RankingPreview
          rankingSlots={rankingSlots}
          onShowFull={handleShowFullRanking}
        />

        {/* Ta część jest tak mała, że nie wymaga osobnego komponentu.
            Zależy od isLoadingCountries i visitedCount, więc będzie się renderować
            niezależnie od reszty nagłówka. */}
        <View style={profileStyles.visitedHeader}>
          <Text
            style={[
              profileStyles.sectionTitle,
              { color: theme.colors.onBackground },
            ]}
          >
            Visited Countries
          </Text>
          {!isLoadingCountriesMap && visitedCount > 0 && (
            <Text style={[profileStyles.visitedCount, { color: "gray" }]}>
              ({visitedCount}/218)
            </Text>
          )}
        </View>
      </>
    ),
    [
      // NOWA, ZNACZNIE MNIEJSZA LISTA ZALEŻNOŚCI!
      isDarkTheme,
      toggleTheme,
      handleBack,
      userProfile,
      isFriend,
      hasSentRequest,
      hasReceivedRequest,
      incomingRequestFromProfile,
      handleAdd,
      handleRemove,
      handleAccept,
      handleDecline,
      rankingSlots,
      handleShowFullRanking,
      isCountryListProcessing,
      visitedCount,
      theme.colors.onBackground, // Dodajemy kolory z motywu, jeśli są używane bezpośrednio w tym komponencie
      theme.colors.onSurface,
    ]
  );

  if (isProfileLoading || isLoadingCountriesMap) {
    return (
      <View
        style={[
          profileStyles.loading,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!userProfile) {
    // Zwróć widok "User not found" w całości
    return (
      <View
        style={[
          profileStyles.container,
          { backgroundColor: theme.colors.background, alignItems: "center" },
        ]}
      >
        <View
          style={[
            profileStyles.header,
            { paddingTop: height * 0.02, width: "100%" },
          ]}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={[
              profileStyles.headerButton,
              { marginLeft: -11, marginRight: -1 },
            ]}
          >
            <Ionicons
              name="arrow-back"
              size={26}
              color={theme.colors.onBackground}
            />
          </TouchableOpacity>
          <Text
            style={[
              profileStyles.headerTitle,
              { color: theme.colors.onBackground },
            ]}
          >
            Profile
          </Text>
          <TouchableOpacity
            onPress={toggleTheme}
            style={[profileStyles.headerButton, { marginRight: -7 }]}
          >
            <Ionicons
              name={isDarkTheme ? "sunny" : "moon"}
              size={24}
              color={theme.colors.onBackground}
            />
          </TouchableOpacity>
        </View>
        <Text style={{ color: theme.colors.onBackground, marginTop: 20 }}>
          User not found.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <FlashList
        data={isCountryListProcessing ? SKELETON_DATA : listData}
        renderItem={
          isCountryListProcessing ? renderSkeletonItem : renderListItem
        }
        keyExtractor={(item) => item.id}
        estimatedItemSize={100}
        ListHeaderComponent={ListHeader}
        extraData={isDarkTheme} // i inne
        scrollEnabled={!isCountryListProcessing}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 50,
        }}
        overrideItemLayout={(layout, item) => {
          if (item.type === "header") {
            // Możemy tu dodać bardziej precyzyjne estymacje
            layout.size = 40;
          } else {
            // Estymacja dla wiersza krajów
            layout.size = 80;
          }
        }}
      />
      <Modal
        visible={isRankingModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsRankingModalVisible(false)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }}
          activeOpacity={1}
          onPressOut={() => setIsRankingModalVisible(false)}
        >
          <View
            style={[
              modalStyles.modalContent,
              { backgroundColor: theme.colors.background },
            ]}
          >
            <View style={modalStyles.modalHeader}>
              <Text
                style={[
                  modalStyles.modalTitle,
                  { color: theme.colors.onBackground },
                ]}
              >
                Full Ranking
              </Text>
              <TouchableOpacity onPress={() => setIsRankingModalVisible(false)}>
                <Ionicons
                  name="close"
                  size={24}
                  color={theme.colors.onBackground}
                />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={modalStyles.modalScrollContent}>
              <RankingList rankingSlots={rankingSlots} />
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const profileStyles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  headerButton: {
    padding: 8,
  },
  continentSection: { marginTop: 10 },
  continentTitle: {
    fontSize: 15,
    fontWeight: "500",
    marginBottom: 8,
    marginLeft: 4,
    // color: "pink",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  visitedListContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginLeft: -4,
    marginRight: -4,
  },
  userPanel: {
    alignItems: "center",
    marginBottom: 25,
  },
  userName: {
    marginTop: -2,
    marginBottom: 7,
    fontSize: 18,
    fontWeight: "500",
  },
  friendActionButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "48%",
    marginTop: 10,
  },
  acceptButton: {
    flex: 1,
    paddingVertical: 5.5,
    borderRadius: 20,
    alignItems: "center",
    marginRight: 3,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  declineButton: {
    flex: 1,
    paddingVertical: 5.5,
    borderRadius: 20,
    alignItems: "center",
    marginLeft: 3,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
  },
  addFriendButton: {
    marginTop: 5,
    paddingVertical: 5.5,
    paddingHorizontal: 15,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    minWidth: 80,
    minHeight: 30,
  },
  addFriendButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  rankingContainer: {
    marginBottom: 25,
  },
  rankingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 10,
    marginLeft: 2,
  },
  showAllRankingButton: {
    fontSize: 14,
    textDecorationLine: "none",
    marginBottom: 6,
  },
  rankingItemContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  rank: {
    fontSize: 16,
    fontWeight: "bold",
    marginRight: 8,
  },
  countryName: {
    fontSize: 14,
  },
  visitedContainer: {
    marginBottom: 20,
  },
  visitedHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: -9,
  },
  visitedCount: {
    fontSize: 14,
    color: "gray",
    marginBottom: 10,
  },
  visitedList: {
    // flexDirection: "row",
    // flexWrap: "wrap",
    marginLeft: -15,
    marginRight: -15,
    marginTop: -9,
  },
  visitedRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap", // Dodajemy flexWrap dla bezpieczeństwa, gdyby heurystyka zawiodła
    marginBottom: 5,
  },
  // PRZYWRÓCONY STYL DLA POJEDYNCZEGO ELEMENTU
  visitedItemContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12, // Trochę więcej miejsca w pigułce
    paddingVertical: 6,
    marginVertical: 3.5,
    marginHorizontal: 3,
    borderRadius: 16,
  },
  visitedItemText: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 1,
  },
  flag: {
    width: 20,
    height: 15,
    borderRadius: 2,
    marginRight: 6,
  },
});

const modalStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    position: "absolute",
    bottom: 0,
    height: "90%",
    width: "100%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 10,
  },
  modalScrollContent: {
    paddingBottom: 20,
  },
});
