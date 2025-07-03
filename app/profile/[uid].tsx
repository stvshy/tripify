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

interface UserProfile {
  uid: string;
  nickname: string;
  email?: string;
  ranking: string[];
  countriesVisited: string[];
}

const countriesMap = new Map<string, Country>();
countriesData.countries.forEach((country) => {
  countriesMap.set(country.id, {
    id: country.id,
    name: country.name || "Unknown",
    cca2: country.id,
    flag: `https://flagcdn.com/w40/${country.id.toLowerCase()}.png`,
    class: country.class || null,
    path: country.path || "Unknown",
    continent: country.continent || "Other",
  });
});
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

  const { uid: profileUid } = useLocalSearchParams<{ uid: string }>();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [rankingSlots, setRankingSlots] = useState<RankingSlot[]>([]);
  const [countriesVisited, setCountriesVisited] = useState<Country[]>([]);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true); // Dla głównych danych
  const [isLoadingCountries, setIsLoadingCountries] = useState(true); // Dla listy krajów
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
  const processCountriesInBatches = (
    countryCodes: string[],
    onProgress: (data: ListItem[]) => void,
    onDone: (finalData: ListItem[], totalCount: number) => void
  ) => {
    const BATCH_SIZE = 50; // Przetwarzaj 50 krajów na raz
    let currentIndex = 0;
    const groupedByContinent: Record<string, Country[]> = {};

    const processNextBatch = () => {
      const batchEnd = Math.min(currentIndex + BATCH_SIZE, countryCodes.length);
      for (let i = currentIndex; i < batchEnd; i++) {
        const code = countryCodes[i];
        const country = countriesMap.get(code);
        if (country) {
          const continent = country.continent || "Other";
          if (!groupedByContinent[continent]) {
            groupedByContinent[continent] = [];
          }
          groupedByContinent[continent].push(country);
        }
      }

      currentIndex = batchEnd;

      // Po każdej partii, generujemy tymczasowe dane do wyświetlenia
      // Dzięki temu użytkownik widzi, jak lista się "buduje"
      const flatData: ListItem[] = [];
      const sortedContinents = Object.keys(groupedByContinent).sort();
      let cumulativePillCount = 0;
      for (const continent of sortedContinents) {
        const countriesInContinent = groupedByContinent[continent];
        flatData.push({
          type: "header",
          id: continent,
          continent,
          count: countriesInContinent.length,
        });
        flatData.push({
          type: "countries_row",
          id: `${continent}-row`,
          countries: countriesInContinent,
          startingPillIndex: cumulativePillCount,
        });
        cumulativePillCount += countriesInContinent.length;
      }
      onProgress(flatData);

      if (currentIndex < countryCodes.length) {
        // Jeśli jest więcej danych, zaplanuj następną partię
        requestAnimationFrame(processNextBatch);
      } else {
        // Koniec pracy
        onDone(flatData, countryCodes.length);
      }
    };

    // Rozpocznij przetwarzanie
    requestAnimationFrame(processNextBatch);
  };

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
    if (!profileUid) {
      setIsLoadingProfile(false);
      return;
    }

    // KROK 1: Reset stanu
    setIsLoadingProfile(true);
    setIsLoadingCountries(true); // Włączamy skeleton
    setUserProfile(null);
    setListData([]); // Czyścimy stare dane
    setRankingSlots([]);
    setVisitedCount(0);

    const userRef = doc(db, "users", profileUid);

    const unsubscribe = onSnapshot(
      userRef,
      (snap) => {
        if (!snap.exists() || !snap.data()) {
          setUserProfile(null);
          setIsLoadingProfile(false);
          setIsLoadingCountries(false);
          return;
        }

        const data = snap.data() as UserProfile;

        // KROK 2: Ustaw "lekkie" dane
        setUserProfile({
          uid: snap.id,
          nickname: data.nickname || "Unknown",
          email: data.email,
          ranking: data.ranking || [],
          countriesVisited: data.countriesVisited || [],
        });

        const visitedCodesRaw = data.countriesVisited || [];
        const rankingRaw = data.ranking || [];
        const rankingFiltered = rankingRaw.filter((code) =>
          visitedCodesRaw.includes(code)
        );
        setRankingSlots(
          rankingFiltered.map((cca2, idx) => ({
            id: generateUniqueId(),
            rank: idx + 1,
            country: countriesMap.get(cca2) || null,
          }))
        );

        // KROK 3: Wyłącz główny loader. Skeleton jest teraz widoczny.
        setIsLoadingProfile(false);

        // --- NOWA, KLUCZOWA LOGIKA ---
        // Przygotowujemy dane do listy, ale jeszcze ich NIE USTAWIAMY w stanie.
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

        // KROK 4: Użyj setTimeout(..., 0), aby ustawić dane w następnej klatce.
        // To daje Reactowi czas na dokończenie renderowania skeletona,
        // zanim dostanie ciężką listę do przetworzenia.
        setTimeout(() => {
          if (newCountriesVisited.length === 0) {
            setListData([]);
            setVisitedCount(0);
            setIsLoadingCountries(false);
          } else {
            setListData(finalData);
            setVisitedCount(newCountriesVisited.length);
            // Wyłączamy skeleton DOKŁADNIE w tym samym momencie co ustawiamy dane.
            setIsLoadingCountries(false);
          }
        }, 50); // Dajemy 50ms buforu, aby mieć pewność, że skeleton się wyrenderuje. Można eksperymentować z wartością 0.
      },
      (error) => {
        console.error("Błąd profilu:", error);
        setIsLoadingProfile(false);
        setIsLoadingCountries(false);
      }
    );

    return () => unsubscribe();
  }, [profileUid]);

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
  const ListHeader = useCallback(
    () => (
      <>
        <View style={[profileStyles.header, { paddingTop: height * 0.02 }]}>
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

        <View style={profileStyles.userPanel}>
          <Ionicons
            name="person-circle"
            size={100}
            color={theme.colors.primary}
          />
          {userProfile && (
            <>
              <Text
                style={[
                  profileStyles.userName,
                  { color: theme.colors.onBackground },
                ]}
              >
                {userProfile.nickname}
              </Text>
              <Text style={[profileStyles.userEmail, { color: "gray" }]}>
                {userProfile.email}
              </Text>
            </>
          )}
          {currentUser?.uid !== profileUid && userProfile && (
            <>
              {hasReceivedRequest ? (
                <View style={profileStyles.friendActionButtons}>
                  <TouchableOpacity
                    onPress={handleAccept}
                    style={[
                      profileStyles.acceptButton,
                      { backgroundColor: theme.colors.primary },
                    ]}
                  >
                    <Text style={profileStyles.buttonText}>Accept</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleDecline}
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
                  onPress={handleRemove}
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
                  onPress={handleAdd}
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
            {/* TUTAJ WRACA PRZYCISK OTWIERAJĄCY MODAL */}
            <TouchableOpacity onPress={() => setIsRankingModalVisible(true)}>
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
        <View style={profileStyles.visitedHeader}>
          <Text
            style={[
              profileStyles.sectionTitle,
              { color: theme.colors.onBackground },
            ]}
          >
            Visited Countries
          </Text>
          {/* Pokaż liczbę dopiero gdy ładowanie się zakończy. */}
          {!isLoadingCountries && visitedCount > 0 && (
            <Text style={[profileStyles.visitedCount, { color: "gray" }]}>
              ({visitedCount}/218)
            </Text>
          )}
        </View>
      </>
    ),
    [
      // Upewnij się, że zależności są poprawne.
      userProfile,
      rankingSlots,
      theme,
      isDarkTheme,
      toggleTheme,
      router,
      height,
      isFriend,
      hasReceivedRequest,
      hasSentRequest,
      handleAccept,
      handleDecline,
      handleRemove,
      handleAdd,
      visitedCount,
      setIsRankingModalVisible,
      profileUid,
      currentUser,
      isLoadingCountries, // <-- Ta zależność jest teraz potrzebna do ukrywania licznika.
    ]
  );

  if (isLoadingProfile) {
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
        // Krok 1: Dynamicznie wybieramy źródło danych
        data={isLoadingCountries ? SKELETON_DATA : listData}
        // Krok 2: Dynamicznie wybieramy funkcję renderującą
        renderItem={isLoadingCountries ? renderSkeletonItem : renderListItem}
        keyExtractor={(item) => item.id}
        estimatedItemSize={100}
        // Nagłówek jest zawsze ten sam
        ListHeaderComponent={ListHeader}
        // Wyłączamy animację przewijania dla skeletona, aby nie "skakał"
        // Możemy też zostawić włączoną, kwestia gustu
        extraData={isDarkTheme}
        scrollEnabled={!isLoadingCountries}
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
    fontSize: 18,
    fontWeight: "500",
  },
  userEmail: {
    marginTop: 3,
    fontSize: 12,
    color: "gray",
    marginBottom: 6,
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
