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
import countriesData from "../../assets/maps/countries.json";
import CountryFlag from "react-native-country-flag";
import RankingList from "../../components/RankingList";
import { ThemeContext } from "../config/ThemeContext";
import { useCommunityStore } from "../store/communityStore";
import { useFocusEffect } from "expo-router";

interface Country {
  id: string;
  cca2: string;
  name: string;
  flag: string;
  class: string;
  path: string;
}
interface UserProfile {
  uid: string;
  nickname: string;
  email?: string;
  ranking: string[];
  countriesVisited: string[];
}
interface RankingSlot {
  id: string;
  rank: number;
  country: Country | null;
}
const removeDuplicates = (countries: Country[]): Country[] => {
  const unique = new Map<string, Country>();
  countries.forEach((c) => {
    unique.set(c.id, c);
  });
  return Array.from(unique.values());
};
const generateUniqueId = () =>
  `rank-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
const ProfileRankingItem: React.FC<{ slot: RankingSlot }> = memo(({ slot }) => {
  const theme = useTheme();
  return (
    <View
      style={[
        profileStyles.rankingItemContainer,
        { backgroundColor: theme.colors.surface },
      ]}
    >
      <Text style={[profileStyles.rank, { color: theme.colors.onSurface }]}>
        {slot.rank}.
      </Text>
      {slot.country ? (
        <>
          {" "}
          <CountryFlag
            isoCode={slot.country.cca2}
            size={20}
            style={profileStyles.flag}
          />{" "}
          <Text
            style={[
              profileStyles.countryName,
              { color: theme.colors.onSurface },
            ]}
          >
            {slot.country.name}
          </Text>{" "}
        </>
      ) : (
        <Text
          style={[profileStyles.countryName, { color: theme.colors.onSurface }]}
        >
          Unknown
        </Text>
      )}
    </View>
  );
});
// type FriendStatus = "none" | "sent" | "received" | "friend" | "checking";

export default function ProfileScreen() {
  // useFocusEffect(
  //   useCallback(() => {
  //     const { listenForCommunityData, cleanup } = useCommunityStore.getState();
  //     listenForCommunityData();
  //     return () => cleanup();
  //   }, [])
  // );

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

  const isLoading = loadingProfile || isLoadingCommunity;

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
  const mappedCountries: Country[] = useMemo(() => {
    return countriesData.countries.map((country) => ({
      ...country,
      cca2: country.id,
      flag: `https://flagcdn.com/w40/${country.id.toLowerCase()}.png`,
      name: country.name || "Unknown",
      class: country.class || "Unknown",
      path: country.path || "Unknown",
    }));
  }, []);
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
        setRankingSlots(
          rankingFiltered.map((cca2, idx) => ({
            id: generateUniqueId(),
            rank: idx + 1,
            country: mappedCountries.find((c) => c.cca2 === cca2) || null,
          }))
        );
        setCountriesVisited(
          removeDuplicates(
            mappedCountries.filter((c) => visitedCodes.includes(c.cca2))
          )
        );
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
  }, [profileUid, mappedCountries]);

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

  return (
    <ScrollView
      style={[
        profileStyles.container,
        { backgroundColor: theme.colors.background, opacity: 1 },
      ]}
      contentContainerStyle={{
        paddingBottom: 50,
        backgroundColor: theme.colors.background,
      }}
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
        {countriesVisited.length === 0 ? (
          <Text style={{ color: theme.colors.onBackground, marginLeft: 2 }}>
            No visited countries.
          </Text>
        ) : (
          <View style={profileStyles.visitedList}>
            {countriesVisited.map((country) => (
              <View
                key={`visited-${country.id}`}
                style={[
                  profileStyles.visitedItemContainer,
                  {
                    backgroundColor: isDarkTheme ? "#262626" : "#f0f0f0",
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
                    {
                      color: theme.colors.onSurface,
                      marginLeft: 6,
                    },
                  ]}
                >
                  {country.name}
                </Text>
              </View>
            ))}
          </View>
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
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
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
  },
  visitedCount: {
    fontSize: 14,
    color: "gray",
    marginBottom: 10,
  },
  visitedList: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginLeft: -5,
    marginRight: -5,
    marginTop: -5,
  },
  visitedItemContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    margin: 5.4,
    borderRadius: 8,
  },
  visitedItemText: {
    fontSize: 14,
    fontWeight: "600",
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
