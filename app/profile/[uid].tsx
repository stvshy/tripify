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
  TouchableOpacity,
  Dimensions,
  BackHandler,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { db, auth } from "../config/firebaseConfig";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { useTheme } from "react-native-paper"; // Added MD3DarkTheme, MD3LightTheme
import { Ionicons } from "@expo/vector-icons";
import RankingList from "../../components/RankingList";
import { ThemeContext } from "../config/ThemeContext";
import { useCommunityStore } from "../store/communityStore";
import { useFocusEffect } from "expo-router";
import { FlashList } from "@shopify/flash-list";
import { Country, RankingSlot } from "../../types/sharedTypes";
import { MotiView, AnimatePresence } from "moti";
import ShineMask from "@/components/ShineMask";
import CountryFlag from "react-native-country-flag";
import { useCountryStore } from "../store/countryStore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import VisitedCountriesSkeleton from "@/components/VisitedCountriesSkeleton";
import ConfirmationModal from "../../components/ConfirmationModal";
import { FriendshipActionButtons } from "@/components/FriendshipActionButton";
interface UserProfile {
  uid: string;
  nickname: string;
  ranking: string[];
  countriesVisited: string[];
}

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
  ({ userProfile }: { userProfile: UserProfile }) => {
    const theme = useTheme();
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

        {/* Jeśli to nie jest profil zalogowanego użytkownika, pokaż przyciski */}
        {currentUser?.uid !== userProfile.uid && (
          <FriendshipActionButtons
            profileUid={userProfile.uid}
            profileNickname={userProfile.nickname}
          />
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
    onCountryPress,
  }: {
    rankingSlots: RankingSlot[];
    onShowFull: () => void;
    onCountryPress: (countryId: string) => void;
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
        <RankingList
          rankingSlots={rankingSlots.slice(0, 5)}
          onCountryPress={onCountryPress}
        />
      </View>
    );
  }
);

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
  const [modalState, setModalState] = useState({
    visible: false,
    title: "",
    message: "",
    onConfirm: () => {},
    confirmText: "Yes",
    isDestructive: false,
  });
  const { uid: profileUid } = useLocalSearchParams<{ uid: string }>();
  const [isListProcessing, setIsListProcessing] = useState(true);
  const [rankingSlots, setRankingSlots] = useState<RankingSlot[]>([]);
  const modalRankingData = useRef<RankingSlot[]>([]);
  const prevCountriesVisitedRef = useRef<string[]>();
  const prevRankingRef = useRef<string[]>();
  const [visitedCount, setVisitedCount] = useState(0);
  const theme = useTheme();
  const router = useRouter();
  const { height } = Dimensions.get("window");
  const insets = useSafeAreaInsets();
  const { isDarkTheme, toggleTheme } = useContext(ThemeContext);
  const [screenPhase, setScreenPhase] = useState<
    "loading" | "presenting" | "error"
  >("loading");
  const [isRankingModalVisible, setIsRankingModalVisible] = useState(false);
  const [canRenderModalContent, setCanRenderModalContent] = useState(false);
  const [listData, setListData] = useState<ListItem[]>([]);
  // const [isProcessingList, setIsProcessingList] = useState(true); // Loader dla danych listy

  const handleCountryPress = useCallback(
    (countryId: string) => {
      router.push(`/country/${countryId}`);
    },
    [router]
  );
  // WSTAW TO
  // app/profile/[uid].tsx

  // Krok 1: Selektywny odczyt stanu
  // const friends = useCommunityStore((state) => state.friends);
  // const incomingRequests = useCommunityStore((state) => state.incomingRequests);
  // const outgoingRequests = useCommunityStore((state) => state.outgoingRequests);
  // const isLoadingCommunity = useCommunityStore((state) => state.isLoading);

  // Krok 2: Odczyt akcji. Te się nie zmieniają, więc nie powodują re-renderów.
  // const {
  //   acceptFriendRequest,
  //   rejectFriendRequest,
  //   sendFriendRequest,
  //   removeFriend,
  //   cancelOutgoingRequest,
  // } = useCommunityStore.getState(); // Używamy .getState() do jednorazowego pobrania akcji

  // const isLoading = loadingProfile;

  // // Sprawdzenie statusu znajomości (POPRAWIONE)
  // const isFriend = useMemo(
  //   () => friends.some((friend) => friend.uid === profileUid),
  //   [friends, profileUid]
  // );
  // const hasSentRequest = useMemo(
  //   () => outgoingRequests.some((req) => req.receiverUid === profileUid),
  //   [outgoingRequests, profileUid]
  // );
  // const hasReceivedRequest = useMemo(
  //   () => incomingRequests.some((req) => req.senderUid === profileUid),
  //   [incomingRequests, profileUid]
  // );
  // const incomingRequestFromProfile = useMemo(
  //   () => incomingRequests.find((req) => req.senderUid === profileUid),
  //   [incomingRequests, profileUid]
  // );
  // const outgoingRequestToProfile = useMemo(
  //   () => outgoingRequests.find((req) => req.receiverUid === profileUid),
  //   [outgoingRequests, profileUid]
  // );
  const [rawUserProfile, setRawUserProfile] = useState<UserProfile | null>(
    null
  );

  // app/profile/[uid].tsx

  // --- WSTAW TĘ WERSJĘ ---
  // app/profile/[uid].tsx

  // --- WSTAW TĘ NOWĄ, POPRAWIONĄ WERSJĘ useEffect ---
  useEffect(() => {
    if (!profileUid) {
      setScreenPhase("error");
      return;
    }

    // Funkcja do pobrania i przetworzenia danych
    const fetchAndProcessProfile = async () => {
      // Krok 1: Resetuj stany przed nowym pobraniem
      setScreenPhase("loading");
      setIsListProcessing(true); // Loader dla listy krajów jest włączony
      setRawUserProfile(null);
      setListData([]);
      setRankingSlots([]);
      setVisitedCount(0);

      try {
        const userRef = doc(db, "users", profileUid);
        const snap = await getDoc(userRef);

        const currentCountriesMap = useCountryStore.getState().countriesMap;

        if (!snap.exists() || !currentCountriesMap) {
          setScreenPhase("error");
          setIsListProcessing(false);
          return;
        }

        const data = snap.data() as UserProfile;
        setRawUserProfile(data);

        // ==========================================================
        // ETAP 1: Błyskawiczne przetwarzanie lekkich danych (ranking)
        // Robimy to NATYCHMIAST, bez setTimeout.
        // ==========================================================
        const rankingRaw = data.ranking || [];
        const visitedForRanking = data.countriesVisited || [];
        const newRankingSlots = rankingRaw
          .filter((code) => visitedForRanking.includes(code))
          .map((cca2, idx) => ({
            id: generateUniqueId(),
            rank: idx + 1,
            country: currentCountriesMap.get(cca2) || null,
          }));

        setRankingSlots(newRankingSlots); // Ustaw dane rankingu od razu
        setScreenPhase("presenting"); // Pokaż ekran z już załadowanym rankingiem

        // ==========================================================
        // ETAP 2: Odroczone przetwarzanie ciężkich danych (lista krajów)
        // Używamy setTimeout, aby dać UI czas na oddech.
        // ==========================================================
        setTimeout(() => {
          const visitedCodesRaw = data.countriesVisited || [];
          const newCountriesVisited = Array.from(new Set(visitedCodesRaw))
            .map((code) => currentCountriesMap.get(code))
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

          setVisitedCount(newCountriesVisited.length);
          setListData(finalData);
          setIsListProcessing(false); // Wyłącz loader dla listy krajów
        }, 150); // Minimalne opóźnienie (150ms) dla płynności
      } catch (error) {
        console.error("Error fetching profile data:", error);
        setScreenPhase("error");
        setIsListProcessing(false);
      }
    };

    fetchAndProcessProfile();

    // Ponieważ nie ma subskrypcji, funkcja czyszcząca jest pusta
    return () => {};
  }, [profileUid]); // Efekt uruchamia się tylko, gdy zmieni się UID profilu
  // --- Handlers (POPRAWIONE) ---
  // const handleAdd = () => {
  //   if (rawUserProfile) {
  //     // Zmieniono z userProfile
  //     sendFriendRequest(rawUserProfile.uid, rawUserProfile.nickname);
  //   }
  // };
  const handleCloseModal = () => {
    setModalState({ ...modalState, visible: false });
  };

  // const handleRemove = () => {
  //   if (!profileUid || !rawUserProfile) return;

  //   setModalState({
  //     visible: true,
  //     title: "Remove Friend",
  //     message: `Are you sure you want to remove ${rawUserProfile.nickname} from your friends?`,
  //     confirmText: "Remove",
  //     isDestructive: true, // Użyjemy czerwonego przycisku
  //     onConfirm: () => {
  //       removeFriend(profileUid);
  //       handleCloseModal(); // Zamknij modal po potwierdzeniu
  //     },
  //   });
  // };

  // const handleCancelRequest = () => {
  //   if (!outgoingRequestToProfile) return;

  //   setModalState({
  //     visible: true,
  //     title: "Cancel Request",
  //     message: "Are you sure you want to cancel the friend request?",
  //     confirmText: "Yes",
  //     isDestructive: false,
  //     onConfirm: () => {
  //       cancelOutgoingRequest(outgoingRequestToProfile.receiverUid);
  //       handleCloseModal(); // Zamknij modal po potwierdzeniu
  //     },
  //   });
  // };
  // const handleAccept = () => {
  //   if (incomingRequestFromProfile) {
  //     // Po prostu wywołaj akcję. Ona sama zajmie się resztą.
  //     acceptFriendRequest(incomingRequestFromProfile);
  //   }
  // };

  // const handleDecline = () => {
  //   if (incomingRequestFromProfile) {
  //     rejectFriendRequest(incomingRequestFromProfile.id);
  //   }
  // };

  const CountryPillRow = React.memo(
    ({
      countries,
      onPress,
      startingPillIndex, // Indeks pierwszej pigułki w tym wierszu
    }: {
      countries: Country[];
      onPress: (id: string) => void;
      startingPillIndex: number;
    }) => {
      const { isDarkTheme } = useContext(ThemeContext);
      const theme = useTheme();
      const SHINE_LIMIT = 15; // Stosuj efekt tylko dla pierwszych 15 pigułek
      const SHINE_STAGGER = 50; // Opóźnienie między kolejnymi animacjami

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

            // Obliczamy absolutny indeks pigułki na całej liście
            const absolutePillIndex = startingPillIndex + index;
            const enableShine = absolutePillIndex < SHINE_LIMIT;

            const pill = (
              <TouchableOpacity
                onPress={() => onPress(country.id)}
                style={[
                  profileStyles.visitedItemContainer,
                  { backgroundColor },
                ]}
              >
                <CountryFlag
                  isoCode={country.cca2}
                  size={20}
                  style={profileStyles.flag}
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
                  // Używamy ShineMask tylko jeśli warunek jest spełniony
                  <ShineMask delay={500 + absolutePillIndex * SHINE_STAGGER}>
                    {pill}
                  </ShineMask>
                ) : (
                  // W przeciwnym razie renderujemy samą pigułkę
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
  // app/profile/[uid].tsx

  // ZASTĄP LUB ZWERYFIKUJ ISTNIEJĄCĄ FUNKCJĘ renderListItem
  const renderListItem = useCallback(
    ({ item, index }: { item: ListItem; index: number }) => {
      // Opóźnienie rośnie wraz z indeksem, co tworzy kaskadowy efekt od góry do dołu.
      const delay = index * 80;

      switch (item.type) {
        case "header":
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
            <MotiView
              // ZMIANA: Zaczynamy animację z przesunięciem w górę (ujemny translateY)
              from={{ opacity: 0, translateY: -13 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: "timing", duration: 400, delay }}
              style={profileStyles.continentSection}
            >
              <ShineMask delay={delay + 400}>{headerText}</ShineMask>
            </MotiView>
          );

        case "countries_row":
          return (
            <MotiView
              // ZMIANA: Tutaj również zaczynamy z przesunięciem w górę
              from={{ opacity: 0, translateY: -13 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: "timing", duration: 400, delay }}
            >
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
    // Kiedy chcemy pokazać modal:
    // 1. Zapisz aktualne dane do refa.
    modalRankingData.current = rankingSlots;
    // 2. Ustaw widoczność na true.
    setIsRankingModalVisible(true);
  }, [rankingSlots]); // Zależność od rankingSlots, aby ref miał zawsze aktualne dane

  const handleCloseFullRanking = () => {
    setIsRankingModalVisible(false);
  };
  const ListHeader = useCallback(
    () => (
      <>
        <ProfileTopBar
          onBack={handleBack}
          onToggleTheme={toggleTheme}
          isDarkTheme={isDarkTheme}
        />
        {rawUserProfile && (
          // Przekazujemy tylko dane profilu. Komponent sam zajmie się resztą.
          <UserInfoPanel userProfile={rawUserProfile} />
        )}
        <RankingPreview
          rankingSlots={rankingSlots}
          onShowFull={handleShowFullRanking}
          onCountryPress={handleCountryPress}
        />

        {/* ZMIANA 1: Nagłówek sekcji jest teraz ZAWSZE widoczny. */}
        {/* Nie ma tu już szkieletu! */}
        <View style={profileStyles.visitedHeader}>
          <Text
            style={[
              profileStyles.sectionTitle,
              { color: theme.colors.onBackground },
            ]}
          >
            Visited Countries
          </Text>

          <View style={profileStyles.indicatorOrCountContainer}>
            {isListProcessing ? (
              <ActivityIndicator
                size="small"
                color={theme.colors.primary}
                style={{ transform: [{ scale: 0.8 }] }}
              />
            ) : (
              <Text style={[profileStyles.visitedCount, { color: "gray" }]}>
                ({visitedCount})
              </Text>
            )}
          </View>
        </View>
      </>
    ),
    [
      rawUserProfile,
      rankingSlots,
      visitedCount,
      isDarkTheme,
      handleBack,
      toggleTheme,
      handleCountryPress,
      handleShowFullRanking,
      isListProcessing,
      theme,
    ]
  );
  // const ListLoader = useCallback(() => {
  //   if (!isListProcessing) return null; // Nie pokazuj nic, jeśli lista jest gotowa

  //   return (
  //     <View style={{ padding: 40, alignItems: "center" }}>
  //       <ActivityIndicator size="small" color={theme.colors.primary} />
  //     </View>
  //   );
  // }, [isListProcessing, theme.colors.primary]);
  if (screenPhase === "loading") {
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

  // Krok 2: Obsługa błędu lub braku użytkownika
  if (screenPhase === "error") {
    return (
      <View
        style={[
          profileStyles.container,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <ProfileTopBar
          onBack={handleBack}
          onToggleTheme={toggleTheme}
          isDarkTheme={isDarkTheme}
        />
        <Text
          style={{
            color: theme.colors.onBackground,
            marginTop: 20,
            textAlign: "center",
          }}
        >
          User not found.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {/* 
        Lista jest renderowana tylko gdy jesteśmy w fazie 'presenting'.
        Jej własne animacje wejścia (MotiView w renderItem) zajmą się pojawieniem.
      */}
      {/* {screenPhase === "presenting" && ( */}
      <FlashList
        // Gdy lista się przetwarza, przekazujemy pustą tablicę.
        // Gdy jest gotowa, przekazujemy prawdziwe dane.
        data={!isListProcessing ? listData : []}
        renderItem={renderListItem}
        keyExtractor={(item) => item.id}
        estimatedItemSize={100}
        ListHeaderComponent={ListHeader}
        // ZMIANA 2: Używamy ListEmptyComponent do pokazania szkieletu.
        // FlashList pokaże to, gdy `data` będzie pustą tablicą (czyli w trakcie ładowania).
        // Gdy `data` się zapełni, FlashList sam podmieni szkielet na listę.
        ListEmptyComponent={
          isListProcessing ? (
            // Gdy ładujemy, pokazujemy szkielet
            <VisitedCountriesSkeleton />
          ) : (
            // Gdy ładowanie skończone i lista jest pusta, pokazujemy komunikat
            // stylizowany DOKŁADNIE tak, jak w RankingList.
            <Text
              style={{
                color: theme.colors.onBackground,
                marginTop: 8, // Drobny margines, aby oddzielić od nagłówka, tak jak w liście
              }}
            >
              No countries visited yet.
            </Text>
          )
        }
        // extraData jest ważne, aby FlashList wiedział o zmianach stanu
        extraData={{ isDarkTheme, isListProcessing }}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 50,
        }}
        overrideItemLayout={(layout, item) => {
          if (item.type === "header") {
            layout.size = 10;
          } else {
            layout.size = 40;
          }
        }}
      />
      {/* Modal pozostaje bez zmian */}
      <AnimatePresence>
        {isRankingModalVisible && (
          <MotiView
            from={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: "timing", duration: 250 }}
            style={modalStyles.overlay} // Nowy styl dla tła
          >
            <MotiView
              from={{ translateY: height }}
              animate={{ translateY: 0 }}
              exit={{ translateY: height }}
              transition={{
                type: "spring",
                stiffness: 400, // Wysoka sztywność dla szybkiej reakcji
                damping: 40, // Wysokie tłumienie, aby zapobiec "odbijaniu" i zapewnić gładkie zatrzymanie
                mass: 1.2, // Lekkie zwiększenie "masy" dla bardziej "solidnego" odczucia
              }}
              style={[
                modalStyles.modalContentContainer,
                {
                  backgroundColor: theme.colors.background,
                  // Nie potrzebujemy paddingu tutaj, bo jest w stylach
                },
              ]}
            >
              {/* === TREŚĆ MODALA === */}
              <View style={modalStyles.modalHeader}>
                <Text
                  style={[
                    modalStyles.modalTitle,
                    { color: theme.colors.onBackground },
                  ]}
                >
                  Full Ranking
                </Text>
                <TouchableOpacity
                  onPress={handleCloseFullRanking}
                  style={{ marginRight: -5 }}
                >
                  <Ionicons
                    name="close"
                    size={26}
                    color={theme.colors.onBackground}
                  />
                </TouchableOpacity>
              </View>

              <FlashList
                data={modalRankingData.current} // Użyj danych z refa!
                renderItem={({ item }) => (
                  <RankingList
                    rankingSlots={[item]}
                    onCountryPress={handleCountryPress} // <-- DODAJ TO
                  />
                )}
                keyExtractor={(item) => item.id}
                estimatedItemSize={50}
                contentContainerStyle={modalStyles.modalScrollContent}
              />
            </MotiView>
          </MotiView>
        )}
      </AnimatePresence>
      <ConfirmationModal
        visible={modalState.visible}
        title={modalState.title}
        message={modalState.message}
        onCancel={handleCloseModal}
        onConfirm={modalState.onConfirm}
        confirmText={modalState.confirmText}
        isDestructive={modalState.isDestructive}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10, // Upewnij się, że jest na wierzchu
  },
});

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
  visitedHeaderTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerButton: {
    padding: 8,
  },
  indicatorOrCountContainer: {
    // Ten styl umieszcza wskaźnik/licznik obok tytułu z małym odstępem
    marginLeft: 8,
    marginBottom: 10, // Dopasowujemy do marginesu sectionTitle, aby wszystko było w jednej linii
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
    // justifyContent: "space-between",
    alignItems: "center",
    marginBottom: -9,
  },
  visitedCount: {
    fontSize: 14.5,
    color: "gray",
    marginLeft: -4,
    // marginBottom: 10,
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
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "flex-end", // Wyrównuje zawartość do dołu
    zIndex: 50,
  },
  // Nowy styl dla głównego, wysuwanego kontenera
  modalContentContainer: {
    height: "95%", // Wysokość modala
    width: "100%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden", // Ważne dla border-radius
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 19, // Odstęp po bokach
    paddingBottom: 16, // Odstęp na dole (ważne, aby oddzielić od listy)
    paddingTop: 16, // Zmniejszony odstęp na górze (dostosuj wg uznania)
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  modalScrollContent: {
    paddingHorizontal: 16.5,
    paddingBottom: 20,
  },
});
