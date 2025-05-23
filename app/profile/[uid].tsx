// app/profile/[uid].tsx
import React, {
  useEffect,
  useState,
  useMemo,
  useCallback, // Dodano useCallback
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
import { useTheme } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import countriesData from "../../assets/maps/countries.json";
import CountryFlag from "react-native-country-flag";
import RankingList from "../../components/RankingList";
import { ThemeContext } from "../config/ThemeContext";

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

// FriendRequest interface (jeśli potrzebna, choć nie jest bezpośrednio używana w stanie)
// interface FriendRequest {
//   senderUid: string;
//   receiverUid: string;
//   status: string;
// }

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
  // Owiń w memo
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
          <CountryFlag
            isoCode={slot.country.cca2}
            size={20}
            style={profileStyles.flag}
          />
          <Text
            style={[
              profileStyles.countryName,
              { color: theme.colors.onSurface },
            ]}
          >
            {slot.country.name}
          </Text>
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

export default function ProfileScreen() {
  const { uid } = useLocalSearchParams();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [rankingSlots, setRankingSlots] = useState<RankingSlot[]>([]);
  const [countriesVisited, setCountriesVisited] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true); // Domyślnie true
  const theme = useTheme();
  const router = useRouter();
  const { isDarkTheme, toggleTheme } = useContext(ThemeContext);
  const { width, height } = Dimensions.get("window");
  const [isRankingModalVisible, setIsRankingModalVisible] = useState(false);

  const [friendStatus, setFriendStatus] = useState<
    "none" | "sent" | "received" | "friend"
  >("none");

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
    if (!uid) {
      setLoading(false);
      return;
    }
    setLoading(true); // Ustaw ładowanie przy zmianie UID
    const userRef = doc(db, "users", uid as string);

    const unsubscribe = onSnapshot(userRef, (snap) => {
      if (!snap.exists()) {
        setUserProfile(null);
        setLoading(false);
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
      setLoading(false); // Zakończ ładowanie po pobraniu danych
    });

    return () => unsubscribe();
  }, [uid, mappedCountries]);

  const checkFriendStatus = useCallback(
    async (currentUserUid: string, profileUserUid: string) => {
      console.log(
        `[checkFriendStatus] Checking for currentUser: ${currentUserUid}, profileUser: ${profileUserUid}`
      );
      try {
        const friendshipQuery1 = query(
          collection(db, "friendships"),
          where("userAUid", "==", currentUserUid),
          where("userBUid", "==", profileUserUid),
          where("status", "==", "accepted")
        );
        const friendshipSnapshot1 = await getDocs(friendshipQuery1);

        const friendshipQuery2 = query(
          collection(db, "friendships"),
          where("userAUid", "==", profileUserUid),
          where("userBUid", "==", currentUserUid),
          where("status", "==", "accepted")
        );
        const friendshipSnapshot2 = await getDocs(friendshipQuery2);

        if (!friendshipSnapshot1.empty || !friendshipSnapshot2.empty) {
          console.log("[checkFriendStatus] Status: friend");
          setFriendStatus("friend");
          return;
        }

        const outgoingRequestQuery = query(
          collection(db, "friendRequests"),
          where("senderUid", "==", currentUserUid),
          where("receiverUid", "==", profileUserUid),
          where("status", "==", "pending")
        );
        const outgoingSnapshot = await getDocs(outgoingRequestQuery);
        if (!outgoingSnapshot.empty) {
          console.log("[checkFriendStatus] Status: sent");
          setFriendStatus("sent");
          return;
        }

        const incomingRequestQuery = query(
          collection(db, "friendRequests"),
          where("senderUid", "==", profileUserUid),
          where("receiverUid", "==", currentUserUid),
          where("status", "==", "pending")
        );
        const incomingSnapshot = await getDocs(incomingRequestQuery);
        if (!incomingSnapshot.empty) {
          console.log("[checkFriendStatus] Status: received");
          setFriendStatus("received");
          return;
        }

        console.log("[checkFriendStatus] Status: none");
        setFriendStatus("none");
      } catch (error) {
        console.error("Error checking friend status:", error);
        setFriendStatus("none");
      }
    },
    [setFriendStatus]
  ); // setFriendStatus jest stabilne

  useEffect(() => {
    const currentAuthUser = auth.currentUser;
    const profileUidStr = uid as string;

    if (
      currentAuthUser &&
      profileUidStr &&
      currentAuthUser.uid !== profileUidStr
    ) {
      console.log(
        `[ProfileScreen useEffect] Triggering checkFriendStatus for profile ${profileUidStr}`
      );
      checkFriendStatus(currentAuthUser.uid, profileUidStr);
    } else if (
      currentAuthUser &&
      profileUidStr &&
      currentAuthUser.uid === profileUidStr
    ) {
      setFriendStatus("none"); // Oglądanie własnego profilu
      console.log("[ProfileScreen useEffect] Viewing own profile.");
    } else {
      setFriendStatus("none"); // Użytkownik niezalogowany lub brak UID profilu
      console.log(
        "[ProfileScreen useEffect] User not logged in or profile UID missing for friend status check."
      );
    }
  }, [uid, auth.currentUser?.uid, checkFriendStatus]);

  const handleAddFriend = useCallback(async () => {
    const currentUser = auth.currentUser;
    const profileUserUid = uid as string; // Użyj uid z parametrów

    if (!currentUser || !profileUserUid) {
      Alert.alert("Error", "User data is not available.");
      return;
    }
    if (currentUser.uid === profileUserUid) {
      Alert.alert("Error", "You cannot add yourself as a friend.");
      return;
    }

    const senderUid = currentUser.uid;
    const receiverUid = profileUserUid;

    console.log(
      `[handleAddFriend] Attempting to add friend: ${receiverUid} by ${senderUid}`
    );

    try {
      // Sprawdź, czy już są przyjaciółmi
      const fsQuery1 = query(
        collection(db, "friendships"),
        where("userAUid", "==", senderUid),
        where("userBUid", "==", receiverUid),
        where("status", "==", "accepted")
      );
      const fsSnap1 = await getDocs(fsQuery1);
      const fsQuery2 = query(
        collection(db, "friendships"),
        where("userAUid", "==", receiverUid),
        where("userBUid", "==", senderUid),
        where("status", "==", "accepted")
      );
      const fsSnap2 = await getDocs(fsQuery2);
      if (!fsSnap1.empty || !fsSnap2.empty) {
        Alert.alert("Info", "You are already friends with this user.");
        setFriendStatus("friend");
        return;
      }

      // Sprawdź, czy istnieje już wysłane zaproszenie
      const outQuery = query(
        collection(db, "friendRequests"),
        where("senderUid", "==", senderUid),
        where("receiverUid", "==", receiverUid),
        where("status", "==", "pending")
      );
      const outSnap = await getDocs(outQuery);
      if (!outSnap.empty) {
        Alert.alert(
          "Info",
          "You have already sent a friend request to this user."
        );
        setFriendStatus("sent");
        return;
      }

      // Sprawdź, czy profileUser wysłał zaproszenie do currentUser
      const inQuery = query(
        collection(db, "friendRequests"),
        where("senderUid", "==", receiverUid),
        where("receiverUid", "==", senderUid),
        where("status", "==", "pending")
      );
      const inSnap = await getDocs(inQuery);
      if (!inSnap.empty) {
        Alert.alert("Info", "This user has already sent you a friend request.");
        setFriendStatus("received");
        return;
      }

      const batch = writeBatch(db);
      const friendRequestRef = doc(collection(db, "friendRequests"));
      batch.set(friendRequestRef, {
        senderUid: senderUid,
        receiverUid: receiverUid,
        status: "pending",
        createdAt: serverTimestamp(),
      });
      await batch.commit();
      Alert.alert("Success", "Friend request sent!");
      setFriendStatus("sent");
    } catch (error) {
      console.error("Error sending friend request:", error);
      Alert.alert("Error", "Failed to send friend request.");
    }
  }, [uid, setFriendStatus]);

  const handleAcceptRequest = useCallback(
    async (senderProfileUid: string) => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        Alert.alert(
          "Error",
          "You need to be logged in to accept friend requests."
        );
        return;
      }

      const receiverUid = currentUser.uid; // Obecny użytkownik jest odbiorcą
      const senderUid = senderProfileUid; // Użytkownik z profilu jest nadawcą

      console.log(
        `[handleAcceptRequest] User ${receiverUid} accepting request from ${senderUid}`
      );

      try {
        const batch = writeBatch(db);
        const friendRequestsQuery = query(
          collection(db, "friendRequests"),
          where("senderUid", "==", senderUid),
          where("receiverUid", "==", receiverUid),
          where("status", "==", "pending")
        );
        const snapshot = await getDocs(friendRequestsQuery);
        if (snapshot.empty) {
          Alert.alert("Error", "No pending friend request found.");
          // Możliwe, że stan się zdesynchronizował, warto ponownie sprawdzić status
          checkFriendStatus(receiverUid, senderUid);
          return;
        }
        const friendRequestDoc = snapshot.docs[0];
        const friendRequestRef = doc(db, "friendRequests", friendRequestDoc.id);
        batch.update(friendRequestRef, { status: "accepted" });

        const friendshipRef = doc(collection(db, "friendships"));
        batch.set(friendshipRef, {
          userAUid: senderUid, // Nadawca zaproszenia
          userBUid: receiverUid, // Odbiorca (obecny użytkownik)
          createdAt: serverTimestamp(),
          status: "accepted",
        });

        // Aktualizacja list znajomych nie jest już potrzebna w 'users' jeśli używasz 'friendships'
        // const userDocRef = doc(db, "users", receiverUid);
        // batch.update(userDocRef, { friends: arrayUnion(senderUid) });
        // const senderDocRef = doc(db, "users", senderUid);
        // batch.update(senderDocRef, { friends: arrayUnion(receiverUid) });

        await batch.commit();
        Alert.alert("Success", "Friend request accepted!");
        setFriendStatus("friend");
      } catch (error) {
        console.error("Error accepting friend request:", error);
        Alert.alert("Error", "Failed to accept the friend request.");
      }
    },
    [setFriendStatus, checkFriendStatus]
  );

  const handleDeclineRequest = useCallback(
    async (senderProfileUid: string) => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        Alert.alert(
          "Error",
          "You need to be logged in to decline friend requests."
        );
        return;
      }
      const receiverUid = currentUser.uid;
      const senderUid = senderProfileUid;

      console.log(
        `[handleDeclineRequest] User ${receiverUid} declining request from ${senderUid}`
      );

      try {
        const friendRequestsQuery = query(
          collection(db, "friendRequests"),
          where("senderUid", "==", senderUid),
          where("receiverUid", "==", receiverUid),
          where("status", "==", "pending")
        );
        const snapshot = await getDocs(friendRequestsQuery);
        if (snapshot.empty) {
          Alert.alert("Error", "No pending friend request found.");
          checkFriendStatus(receiverUid, senderUid);
          return;
        }
        const friendRequestDoc = snapshot.docs[0];
        const friendRequestRef = doc(db, "friendRequests", friendRequestDoc.id);
        await updateDoc(friendRequestRef, { status: "rejected" });
        Alert.alert("Success", "Friend request declined!");
        setFriendStatus("none");
      } catch (error) {
        console.error("Error declining friend request:", error);
        Alert.alert("Error", "Failed to decline the friend request.");
      }
    },
    [setFriendStatus, checkFriendStatus]
  );

  if (loading) {
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
        {/* Header z przyciskiem powrotu i motywem, nawet jeśli profil nie istnieje */}
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
        { backgroundColor: theme.colors.background },
      ]}
      contentContainerStyle={{ paddingBottom: 50 }}
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

        {auth.currentUser?.uid !== userProfile.uid && (
          <>
            {friendStatus === "received" ? (
              <View style={profileStyles.friendActionButtons}>
                <TouchableOpacity
                  onPress={() => handleAcceptRequest(userProfile.uid)}
                  style={[
                    profileStyles.acceptButton,
                    { backgroundColor: theme.colors.primary },
                  ]}
                >
                  <Text style={profileStyles.buttonText}>Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDeclineRequest(userProfile.uid)}
                  style={[
                    profileStyles.declineButton,
                    { backgroundColor: "rgba(116, 116, 116, 0.3)" },
                  ]}
                >
                  <Text style={profileStyles.buttonText}>Decline</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={handleAddFriend}
                style={[
                  profileStyles.addFriendButton,
                  {
                    backgroundColor:
                      friendStatus === "friend"
                        ? isDarkTheme
                          ? "rgba(148, 112, 148, 0.50)"
                          : "#D8BFD8"
                        : friendStatus === "sent"
                          ? "#ccc"
                          : theme.colors.primary,
                  },
                ]}
                disabled={friendStatus === "sent" || friendStatus === "friend"}
              >
                <Text style={profileStyles.addFriendButtonText}>
                  {friendStatus === "friend"
                    ? "Friend"
                    : friendStatus === "sent"
                      ? "Request Sent"
                      : "Add"}
                </Text>
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

// StyleSheet dla ProfileScreen (bez zmian)
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
    marginRight: 6, // Dodano margines dla flagi w rankingu
  },
});

// StyleSheet dla Modal (bez zmian)
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
