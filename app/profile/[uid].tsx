// app/profile/[uid].tsx
import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
  useContext,
  memo,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
  Modal,
  TouchableWithoutFeedback,
  FlatList,
  FlexStyle,
  NativeScrollEvent,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { db, auth } from "../config/firebaseConfig";
import {
  doc,
  getDoc,
  updateDoc,
  writeBatch,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  arrayUnion,
  onSnapshot,
} from "firebase/firestore";
import { useTheme, MD3DarkTheme, MD3LightTheme } from "react-native-paper"; // Added MD3DarkTheme, MD3LightTheme
import { Ionicons } from "@expo/vector-icons";
import countriesData from "../../assets/maps/countries_with_continents.json";
import CountryFlag from "react-native-country-flag";
import RankingList from "../../components/RankingList";
import { ThemeContext } from "../config/ThemeContext";
import { useCommunityStore } from "../store/communityStore";
import { useFocusEffect } from "expo-router";
import { FlashList } from "@shopify/flash-list";
import { Country, RankingSlot } from "../../types/sharedTypes";

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
    class: country.class || null, // Poprawiona wartość domyślna
    path: country.path || "Unknown",
    continent: country.continent || "Other", // <-- KLUCZOWA ZMIANA: Dodajemy kontynent
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
  const [loadingProfile, setLoadingProfile] = useState(true);
  const theme = useTheme();
  const router = useRouter();
  const { isDarkTheme, toggleTheme } = useContext(ThemeContext);
  const { height } = Dimensions.get("window");
  const [isRankingModalVisible, setIsRankingModalVisible] = useState(false);
  const currentUser = auth.currentUser;

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

  const isLoading = loadingProfile;

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

  const { width: screenWidth } = Dimensions.get("window");
  const listPadding = 16 * 2; // Padding kontenera
  const availableWidth = screenWidth - listPadding;
  // Wewnątrz komponentu ProfileScreen
  const groupedByContinent = useMemo(() => {
    return countriesVisited.reduce(
      (acc, country) => {
        // `country.continent` pochodzi teraz z naszego nowego pliku!
        const continent = country.continent || "Other";
        if (!acc[continent]) {
          acc[continent] = [];
        }
        acc[continent].push(country);
        return acc;
      },
      {} as Record<string, any[]>
    ); // Zmieniony typ na `any[]` dla prostoty
  }, [countriesVisited]);
  // const groupedCountries = useMemo(() => {
  //   if (countriesVisited.length === 0) {
  //     return [];
  //   }

  //   const rows: Country[][] = [];
  //   let currentRow: Country[] = [];
  //   let currentRowWidth = 0;

  //   countriesVisited.forEach((country) => {
  //     const countryWidth = estimateCountryWidth(country.name);

  //     if (
  //       currentRowWidth + countryWidth > availableWidth &&
  //       currentRow.length > 0
  //     ) {
  //       rows.push(currentRow); // Zakończ obecny wiersz
  //       currentRow = [country]; // Zacznij nowy wiersz
  //       currentRowWidth = countryWidth;
  //     } else {
  //       currentRow.push(country); // Dodaj do obecnego wiersza
  //       currentRowWidth += countryWidth;
  //     }
  //   });

  //   if (currentRow.length > 0) {
  //     rows.push(currentRow); // Dodaj ostatni, niepełny wiersz
  //   }

  //   return rows;
  // }, [countriesVisited, availableWidth]); // Przelicz tylko, gdy zmienią się kraje lub szerokość ekranu
  const [renderedCount, setRenderedCount] = useState(INITIAL_BATCH_SIZE);

  // ZMIANA 4: Handler do obsługi przewijania
  const handleScroll = useCallback(
    (event: NativeScrollEvent) => {
      const { layoutMeasurement, contentOffset, contentSize } = event;
      const paddingToEnd = 200; // Bufor

      if (
        layoutMeasurement.height + contentOffset.y >=
          contentSize.height - paddingToEnd &&
        renderedCount < countriesVisited.length
      ) {
        setRenderedCount((prevCount) =>
          Math.min(prevCount + SCROLL_BATCH_SIZE, countriesVisited.length)
        );
      }
    },
    [renderedCount, countriesVisited.length]
  );
  // ZMIANA #2: Stwórz `renderItem` dla FlashList, który renderuje cały wiersz
  // const renderRow = useCallback(
  //   ({ item: row }: { item: Country[] }) => {
  //     // Zawsze wyrównujemy do lewej. To wygląda naturalnie i ukrywa niedoskonałości pakowania.
  //     return (
  //       <View style={profileStyles.visitedRow}>
  //         {row.map((country) => (
  //           <View
  //             key={country.id}
  //             style={[
  //               profileStyles.visitedItemContainer,
  //               { backgroundColor: isDarkTheme ? "#262626" : "#f0f0f0" },
  //             ]}
  //           >
  //             <CountryFlag
  //               isoCode={country.cca2}
  //               size={20}
  //               style={profileStyles.flag}
  //             />
  //             <Text
  //               style={[
  //                 profileStyles.visitedItemText,
  //                 { color: theme.colors.onSurface },
  //               ]}
  //             >
  //               {country.name}
  //             </Text>
  //           </View>
  //         ))}
  //       </View>
  //     );
  //   },
  //   [isDarkTheme, theme.colors.onSurface]
  // );
  useEffect(() => {
    if (!profileUid) {
      setLoadingProfile(false);
      setUserProfile(null);
      return;
    }
    setLoadingProfile(true);
    const userRef = doc(db, "users", profileUid);
    const unsubscribe = onSnapshot(
      userRef,
      (snap) => {
        if (!snap.exists()) {
          setUserProfile(null);
          setLoadingProfile(false);
          return;
        }
        const data = snap.data() as UserProfile;
        const rankingRaw = data.ranking || [];
        const visitedCodes = data.countriesVisited || [];
        const rankingFiltered = rankingRaw.filter((code) =>
          visitedCodes.includes(code)
        );
        const newRankingSlots = rankingFiltered.map((cca2, idx) => ({
          id: generateUniqueId(),
          rank: idx + 1,
          country: countriesMap.get(cca2) || null,
        }));

        const newCountriesVisited = Array.from(new Set(visitedCodes)) // Usuwanie duplikatów
          .map((code) => countriesMap.get(code))
          .filter((country): country is Country => country !== undefined); // Filtrowanie undefined i typowanie

        setRankingSlots(newRankingSlots);
        setCountriesVisited(newCountriesVisited);

        setUserProfile({
          uid: snap.id,
          nickname: data.nickname || "Unknown",
          email: data.email,
          ranking: rankingFiltered,
          countriesVisited: visitedCodes,
        });
        setLoadingProfile(false);
      },
      (error) => {
        console.error("Error fetching profile:", error);
        setLoadingProfile(false);
      }
    );
    return () => unsubscribe();
  }, [profileUid]);
  // const [listContainerWidth, setListContainerWidth] = useState(0);

  // Oblicz liczbę kolumn na podstawie zmierzonej szerokości

  // Callback do `onLayout`, który ustawi szerokość w stanie
  // const onListLayout = useCallback(
  //   (event: { nativeEvent: { layout: { width: any } } }) => {
  //     const { width } = event.nativeEvent.layout;
  //     setListContainerWidth(width);
  //   },
  //   []
  // ); // Pusty dependency array, bo funkcja się nie zmienia

  // const renderVisitedCountry = useCallback(
  //   ({ item }: { item: Country }) => (
  //     <View
  //       style={[
  //         profileStyles.visitedItemContainer, // Użyj nowego stylu
  //         { backgroundColor: isDarkTheme ? "#262626" : "#f0f0f0" },
  //       ]}
  //     >
  //       <CountryFlag isoCode={item.cca2} size={20} style={profileStyles.flag} />
  //       <Text
  //         style={[
  //           profileStyles.visitedItemText,
  //           { color: theme.colors.onSurface },
  //         ]}
  //         numberOfLines={1}
  //       >
  //         {item.name}
  //       </Text>
  //     </View>
  //   ),
  //   [isDarkTheme, theme.colors.onSurface]
  // );
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

  if (isLoading) {
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
  const renderFriendshipButtons = () => {
    // --- OPTYMALIZACJA 4: Oddzielne renderowanie przycisków ---
    // Jeśli dane o znajomych się jeszcze ładują, pokazujemy placeholder.
    if (isLoadingCommunity) {
      return (
        <View
          style={[
            profileStyles.addFriendButton,
            { backgroundColor: theme.colors.surfaceVariant },
          ]}
        >
          <ActivityIndicator size="small" color={theme.colors.primary} />
        </View>
      );
    }

    if (hasReceivedRequest) {
      return (
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
      );
    }

    if (isFriend) {
      return (
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
          <Text style={{ color: "#fff", fontSize: 14, fontWeight: "500" }}>
            Friend
          </Text>
        </TouchableOpacity>
      );
    }

    if (hasSentRequest) {
      return (
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
      );
    }

    return (
      <TouchableOpacity
        onPress={handleAdd}
        style={[
          profileStyles.addFriendButton,
          { backgroundColor: theme.colors.primary },
        ]}
      >
        <Text style={profileStyles.addFriendButtonText}>Add</Text>
      </TouchableOpacity>
    );
  };
  return (
    // ZMIANA 5: Używamy onScroll w głównym ScrollView
    <ScrollView
      style={[
        profileStyles.container,
        { backgroundColor: theme.colors.background },
      ]}
      contentContainerStyle={{ paddingBottom: 50 }}
      onScroll={({ nativeEvent }) => handleScroll(nativeEvent)}
      scrollEventThrottle={16} // Optymalizacja - jak często event onScroll ma się odpalać
    >
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
        <Text
          style={[profileStyles.userName, { color: theme.colors.onBackground }]}
        >
          {userProfile.nickname}
        </Text>
        <Text style={[profileStyles.userEmail, { color: "gray" }]}>
          {userProfile.email}
        </Text>

        {/* MODYFIKACJA 4: Zaktualizuj logikę renderowania przycisku */}
        {auth.currentUser?.uid !== userProfile.uid && userProfile && (
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
      {/* --- Visited Countries Section (nowa logika) --- */}
      <View style={profileStyles.visitedContainer}>
        <View style={profileStyles.visitedHeader}>
          <Text
            style={[
              profileStyles.sectionTitle,
              { color: theme.colors.onBackground },
            ]}
          >
            Visited Countries
          </Text>
          <Text style={[profileStyles.visitedCount, { color: "gray" }]}>
            ({countriesVisited.length}/218)
          </Text>
        </View>

        {/* Grupowanie po kontynentach */}
        {Object.entries(groupedByContinent)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([continent, countriesInContinent]) => (
            <View key={continent} style={profileStyles.continentSection}>
              <Text style={profileStyles.continentTitle}>
                <Text style={{ color: isDarkTheme ? "#e6b3ff" : "#a821b5" }}>
                  {continent}
                </Text>
                <Text
                  style={{
                    color: "gray",
                    fontSize: 14,
                    fontWeight: "400",
                  }}
                >
                  {" "}
                  ({countriesInContinent.length})
                </Text>
              </Text>
              <View style={profileStyles.visitedListContainer}>
                {countriesInContinent.slice(0, renderedCount).map((country) => (
                  <TouchableOpacity
                    key={country.id}
                    onPress={() => router.push(`/country/${country.id}`)}
                    style={[
                      profileStyles.visitedItemContainer,
                      {
                        backgroundColor: isDarkTheme
                          ? darkContinentColors[
                              continent as keyof typeof darkContinentColors
                            ] || "#333"
                          : continentColors[
                              continent as keyof typeof continentColors
                            ] || "#f0f0f0",
                      },
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
                ))}
              </View>
            </View>
          ))}

        {/* Wskaźnik ładowania na końcu */}
        {renderedCount < countriesVisited.length && (
          <ActivityIndicator
            size="small"
            color={theme.colors.primary}
            style={{ marginTop: 20 }}
          />
        )}
      </View>

      <Modal
        visible={isRankingModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsRankingModalVisible(false)}
      >
        <TouchableWithoutFeedback
          onPress={() => setIsRankingModalVisible(false)}
        >
          <View style={modalStyles.modalOverlay} />
        </TouchableWithoutFeedback>
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
      </Modal>
    </ScrollView>
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
    // textTransform: "uppercase",
    // letterSpacing: 1,
    color: "pink",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  visitedListContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginLeft: -4, // Dostosowanie marginesów, aby uniknąć przesunięcia
    // Nie potrzebujemy justowania - naturalny układ jest najlepszy
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
    minWidth: 80, // Dodano minimalną szerokość, aby pomieścić ActivityIndicator
    minHeight: 30, // Dodano minimalną wysokość
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
    marginRight: -8,
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
