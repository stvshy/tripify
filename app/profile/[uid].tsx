// app/profile/[uid].tsx
import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
  useContext,
  useRef,
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
  Animated,
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
import CountryPill from "../../components/CountryPill";
import ShineEntryView from "@/components/ShineEntryView";
import { MotiView } from "moti";

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
  | { type: "countries_row"; id: string; countries: Country[] }; // Wiersz zawiera tablicę krajów

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
const SKELETON_DATA: ListItem[] = [
  { type: "header", id: "skeleton-header-1", continent: "", count: 0 },
  { type: "countries_row", id: "skeleton-row-1", countries: Array(6).fill(null) },
  { type: "header", id: "skeleton-header-2", continent: "", count: 0 },
  { type: "countries_row", id: "skeleton-row-2", countries: Array(4).fill(null) },
  { type: "countries_row", id: "skeleton-row-3", countries: Array(5).fill(null) },
  { type: "header", id: "skeleton-header-3", continent: "", count: 0 },
  { type: "countries_row", id: "skeleton-row-4", countries: Array(3).fill(null) },
];

// NOWY KOMPONENT: Skeleton dla nagłówka kontynentu
const SkeletonHeader = () => {
  const theme = useTheme();
  return (
    <View style={profileStyles.continentSection}>
        <MotiView
            from={{ opacity: 0.4 }}
            animate={{ opacity: 0.8 }}
            transition={{ type: 'timing', duration: 800, loop: true, repeatReverse: true }}
            style={{ 
                width: '40%', 
                height: 20, 
                borderRadius: 8, 
                backgroundColor: theme.colors.surfaceVariant,
                marginBottom: 8,
                marginLeft: 4
            }}
        />
    </View>
  );
};

// NOWY KOMPONENT: Skeleton dla jednego wiersza pigułek
const SkeletonPillRow = ({ count }: { count: number }) => {
    const theme = useTheme();
    // Generujemy pigułki o losowej szerokości dla bardziej naturalnego wyglądu
    const pills = useMemo(() => 
        [...Array(count)].map((_, i) => ({
            key: `skel-pill-${i}`,
            width: 70 + Math.random() * 50, // Szerokość między 70 a 120
        }))
    , [count]);

    return (
        <View style={profileStyles.visitedListContainer}>
            {pills.map(pill => (
                <MotiView
                    key={pill.key}
                    from={{ opacity: 0.4 }}
                    animate={{ opacity: 0.8 }}
                    transition={{ type: 'timing', duration: 800, loop: true, repeatReverse: true }}
                    style={{
                        width: pill.width,
                        height: 30,
                        borderRadius: 16,
                        margin: 4,
                        backgroundColor: theme.colors.surfaceVariant,
                    }}
                />
            ))}
        </View>
    );
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

    // Reset stanów
    setIsLoadingProfile(true);
    setIsLoadingCountries(true); // Skeleton będzie widoczny
    setListData([]); // Czyścimy dane listy

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

        // KROK 1: Ustaw podstawowe dane i ranking
        setUserProfile({
          uid: snap.id,
          nickname: data.nickname || "Unknown",
          email: data.email,
          ranking: data.ranking || [],
          countriesVisited: data.countriesVisited || [],
        });
        const rankingRaw = data.ranking || [];
        const visitedCodesRaw = data.countriesVisited || [];
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

        // KROK 2: Wyłącz główny loader. Pokazuje się nagłówek i skeleton.
        setIsLoadingProfile(false);

        // KROK 3: Użyj setTimeout, aby oddzielić przetwarzanie danych od renderowania skeletona.
        setTimeout(() => {
          const newCountriesVisited = Array.from(new Set(visitedCodesRaw))
            .map((code) => countriesMap.get(code))
            .filter((c): c is Country => c !== undefined);

          setVisitedCount(newCountriesVisited.length);

          const groupedByContinent = newCountriesVisited.reduce(
            (acc, country) => {
              const continent = country.continent || "Other";
              if (!acc[continent]) acc[continent] = [];
              acc[continent].push(country);
              return acc;
            }, {} as Record<string, Country[]>
          );

          const flatData: ListItem[] = [];
          Object.entries(groupedByContinent)
            .sort(([a], [b]) => a.localeCompare(b))
            .forEach(([continent, countriesInContinent]) => {
              flatData.push({ type: "header", id: continent, continent, count: countriesInContinent.length });
              flatData.push({ type: "countries_row", id: `${continent}-row`, countries: countriesInContinent });
            });
          
          // KROK 4: Ustaw dane i wyłącz loader krajów w tym samym czasie.
          // To spowoduje jeden re-render, który podmieni skeleton na listę.
          setListData(flatData);
          setIsLoadingCountries(false);
        }, 50); // Minimalne opóźnienie (np. 50ms) może dodatkowo zapewnić, że skeleton się wyrenderuje przed ciężkimi obliczeniami.

      },
      (error) => {
        console.error("Błąd podczas pobierania profilu:", error);
        setIsLoadingProfile(false);
        setIsLoadingCountries(false);
      }
    );

    return () => unsubscribe();
  }, [profileUid]);

  // // Funkcja do przetwarzania krajów w partiach
  // const processCountriesInBatches = (visitedCodesRaw: string[]) => {
  //   const BATCH_SIZE = 50;
  //   let processed = 0;

  //   const processBatch = () => {
  //     const batch = visitedCodesRaw.slice(processed, processed + BATCH_SIZE);
  //     const countries = batch
  //       .map((code) => countriesMap.get(code))
  //       .filter((c): c is Country => c !== undefined);

  //     setCountriesVisited((prev) => [...prev, ...countries]);
  //     processed += BATCH_SIZE;

  //     if (processed < visitedCodesRaw.length) {
  //       requestIdleCallback(processBatch);
  //     } else {
  //       setIsLoadingCountries(false);
  //     }
  //   };

  //   processBatch();
  // };
  // // --- Komponenty do renderowania (renderItem, ListHeader, Skeleton) ---
 const renderListItem = useCallback(
  // Dodajemy 'index' do argumentów, FlashList go dostarcza
  ({ item, index }: { item: ListItem; index: number }) => {
    // Obliczamy opóźnienie na podstawie indeksu elementu w liście
    const delay = index * 80; // 80ms opóźnienia na każdy kolejny element

    switch (item.type) {
      case "header":
        return (
          <ShineEntryView delay={delay}>
            <View style={profileStyles.continentSection}>
              <Text style={profileStyles.continentTitle}>
                <Text style={{ color: isDarkTheme ? "#e6b3ff" : "#a821b5" }}>
                  {item.continent}
                </Text>
                <Text style={{ color: "gray", fontSize: 14, fontWeight: "400" }}>
                  {" "}
                  ({item.count})
                </Text>
              </Text>
            </View>
          </ShineEntryView>
        );
      case "countries_row":
        return (
          <ShineEntryView delay={delay}>
            {/* Użyj oryginalnego, niemowanego komponentu CountryPillRow */}
            <CountryPillRow
              countries={item.countries}
              onPress={handleCountryPress}
            />
          </ShineEntryView>
        );
      default:
        return null;
    }
  },
  [handleCountryPress, isDarkTheme] // Dodaj isDarkTheme z powrotem do zależności
);
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
    }: {
      countries: Country[];
      onPress: (id: string) => void;
    }) => {
      const { isDarkTheme } = useContext(ThemeContext);
      return (
        <View style={profileStyles.visitedListContainer}>
          {countries.map((country) => {
            const continent = country.continent || "Other";
            const backgroundColor = isDarkTheme
              ? darkContinentColors[
                  continent as keyof typeof darkContinentColors
                ] || "#333"
              : continentColors[continent as keyof typeof continentColors] ||
                "#f0f0f0";
            return (
              <CountryPill
                key={country.id}
                country={country}
                onPress={onPress}
                backgroundColor={backgroundColor}
              />
            );
          })}
        </View>
      );
    }
  );
 const SectionSkeleton = ({ title, type }: { title: string; type: "ranking" | "countries" }) => {
  const theme = useTheme();

  return (
    <View style={{ marginBottom: 25 }}>
      <Text style={[profileStyles.sectionTitle, { color: theme.colors.onBackground }]}>
        {title}
      </Text>
      {type === "ranking" ? (
        <>
          {[...Array(3)].map((_, i) => (
            <MotiView
              key={`rank-skeleton-${i}`}
              from={{ opacity: 0.4 }}
              animate={{ opacity: 0.8 }}
              // POPRAWKA: Przekazujemy transition bezpośrednio
              transition={{
                type: 'timing',
                duration: 800,
                loop: true,
                // @ts-expect-error Moti akceptuje 'mirror', ale typy TS tego nie wiedzą
                repeatReverse: 'mirror',
              }}
              style={{
                width: '100%',
                height: 40,
                borderRadius: 8,
                marginBottom: 10,
                backgroundColor: theme.colors.surfaceVariant,
              }}
            />
          ))}
        </>
      ) : (
        <View style={{ flexDirection: 'column' }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 4 }}>
            {[...Array(3)].map((_, i) => (
              <MotiView
                key={`country-skeleton-r1-${i}`}
                from={{ opacity: 0.4 }}
                animate={{ opacity: 0.8 }}
                // POPRAWKA: Przekazujemy transition bezpośrednio
                transition={{
                  type: 'timing',
                  duration: 800,
                  loop: true,
                  // @ts-expect-error Moti akceptuje 'mirror', ale typy TS tego nie wiedzą
                  repeatReverse: 'mirror',
                }}
                style={{
                  width: 110,
                  height: 22,
                  borderRadius: 12,
                  margin: 4,
                  backgroundColor: theme.colors.surfaceVariant,
                }}
              />
            ))}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 4 }}>
            {[...Array(4)].map((_, i) => (
              <MotiView
                key={`country-skeleton-r2-${i}`}
                from={{ opacity: 0.4 }}
                animate={{ opacity: 0.8 }}
                // POPRAWKA: Przekazujemy transition bezpośrednio
                transition={{
                  type: 'timing',
                  duration: 800,
                  loop: true,
                  // @ts-expect-error Moti akceptuje 'mirror', ale typy TS tego nie wiedzą
                  repeatReverse: 'mirror',
                }}
                style={{
                  width: 80,
                  height: 22,
                  borderRadius: 12,
                  margin: 4,
                  backgroundColor: theme.colors.surfaceVariant,
                }}
              />
            ))}
          </View>
        </View>
      )}
    </View>
  );
};
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
            <TouchableOpacity onPress={() => setIsRankingModalVisible(true)}>
              <Text
                style={[
                  profileStyles.showAllRankingButton,
                  { color: theme.colors.primary },
                ]}
              >
                Show Full Ranking
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
        scrollEnabled={!isLoadingCountries} 
        
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 50 }}
        
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
    </View>
  );
}
const AnimatedCountryPillRow = React.memo(
  ({
    countries,
    onPress,
  }: {
    countries: Country[];
    onPress: (id: string) => void;
  }) => {
    const { isDarkTheme } = useContext(ThemeContext);
    const fadeAnim = useRef(new Animated.Value(0)).current; // Wartość przezroczystości
    const slideAnim = useRef(new Animated.Value(15)).current; // Wartość przesunięcia w osi Y

    useEffect(() => {
      // Start animacji po zamontowaniu komponentu
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400, // Szybkość pojawiania się
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300, // Szybkość przesuwania
          useNativeDriver: true,
        }),
      ]).start();
    }, []);

    return (
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}
      >
        <View style={profileStyles.visitedListContainer}>
          {countries.map((country) => {
            const continent = country.continent || "Other";
            const backgroundColor = isDarkTheme
              ? darkContinentColors[
                  continent as keyof typeof darkContinentColors
                ] || "#333"
              : continentColors[continent as keyof typeof continentColors] ||
                "#f0f0f0";
            return (
              <CountryPill
                key={country.id}
                country={country}
                onPress={onPress}
                backgroundColor={backgroundColor}
              />
            );
          })}
        </View>
      </Animated.View>
    );
  }
);

// Komponent do animowania nagłówka kontynentu
const AnimatedHeader = React.memo(
  ({ continent, count }: { continent: string; count: number }) => {
    const { isDarkTheme } = useContext(ThemeContext);
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }, []);

    return (
      <Animated.View style={{ opacity: fadeAnim }}>
        <View style={profileStyles.continentSection}>
          <Text style={profileStyles.continentTitle}>
            <Text style={{ color: isDarkTheme ? "#e6b3ff" : "#a821b5" }}>
              {continent}
            </Text>
            <Text style={{ color: "gray", fontSize: 14, fontWeight: "400" }}>
              {" "}
              ({count})
            </Text>
          </Text>
        </View>
      </Animated.View>
    );
  }
);
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
    color: "pink",
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
    margin: 3.5, // Równy margines dookoła
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
