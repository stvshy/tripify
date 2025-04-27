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
import RankingList from "../../components/RankingList"; // Upewnij się, że ścieżka jest poprawna
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
  ranking: string[]; // Lista kodów krajów
  countriesVisited: string[]; // Lista kodów odwiedzonych krajów
  // Dodaj inne pola, które chcesz wyświetlać
}

interface RankingSlot {
  id: string;
  rank: number;
  country: Country | null;
}

interface FriendRequest {
  senderUid: string;
  receiverUid: string;
  status: string;
}

const removeDuplicates = (countries: Country[]): Country[] => {
  const unique = new Map<string, Country>();
  countries.forEach((c) => {
    unique.set(c.id, c); // Użyj `c.id` jako klucza, zakładając że jest unikalne
  });
  return Array.from(unique.values());
};

const generateUniqueId = () =>
  `rank-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Nowy komponent ProfileRankingItem z własnymi stylami
const ProfileRankingItem: React.FC<{ slot: RankingSlot }> = ({ slot }) => {
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
};

export default function ProfileScreen() {
  const { uid } = useLocalSearchParams(); // Użyj useLocalSearchParams
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [rankingSlots, setRankingSlots] = useState<RankingSlot[]>([]);
  const [countriesVisited, setCountriesVisited] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const theme = useTheme();
  const router = useRouter();
  const { isDarkTheme, toggleTheme } = useContext(ThemeContext);
  const { width, height } = Dimensions.get("window");
  const [isRankingModalVisible, setIsRankingModalVisible] = useState(false);

  // Nowe stany dla przycisku "Add to Friends"
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

  // 1) Podmień fetchUserProfile na onSnapshot:
  useEffect(() => {
    if (!uid) return;
    const userRef = doc(db, "users", uid as string);

    const unsubscribe = onSnapshot(userRef, (snap) => {
      if (!snap.exists()) return;
      const data = snap.data() as UserProfile;

      // 🔥 DEBUG
      console.log(
        "🔥 [Profile] snapshot countriesVisited:",
        data.countriesVisited
      );
      console.log("🔥 [Profile] snapshot ranking (raw):", data.ranking);

      const rankingRaw = data.ranking || [];
      const visitedCodes = data.countriesVisited || [];

      const rankingFiltered = rankingRaw.filter((code) =>
        visitedCodes.includes(code)
      );
      // 🔥 DEBUG
      console.log("🔥 [Profile] filtered ranking:", rankingFiltered);

      // dalej mapujesz rankingFiltered na slots...
      setRankingSlots(
        rankingFiltered.map((cca2, idx) => ({
          id: generateUniqueId(),
          rank: idx + 1,
          country: mappedCountries.find((c) => c.cca2 === cca2) || null,
        }))
      );
      // i countriesVisited
      setCountriesVisited(
        removeDuplicates(
          mappedCountries.filter((c) => visitedCodes.includes(c.cca2))
        )
      );
      // oraz profile
      setUserProfile({
        uid: snap.id,
        nickname: data.nickname || "Unknown",
        email: data.email,
        ranking: rankingFiltered,
        countriesVisited: visitedCodes,
      });

      // 🔥 DEBUG
      console.log(
        "🔥 [Profile] rankingSlots state:",
        rankingSlots.map((s) => s.country?.cca2)
      );
    });

    return () => unsubscribe();
  }, [uid, mappedCountries]);

  // Funkcja sprawdzająca status przyjaźni
  const checkFriendStatus = async (
    currentUserUid: string,
    profileUserUid: string
  ) => {
    try {
      // Sprawdź, czy są już przyjaciółmi (userAUid == currentUserUid AND userBUid == profileUserUid)
      const friendshipQuery1 = query(
        collection(db, "friendships"),
        where("userAUid", "==", currentUserUid),
        where("userBUid", "==", profileUserUid),
        where("status", "==", "accepted")
      );
      const friendshipSnapshot1 = await getDocs(friendshipQuery1);

      // Sprawdź, czy są już przyjaciółmi (userAUid == profileUserUid AND userBUid == currentUserUid)
      const friendshipQuery2 = query(
        collection(db, "friendships"),
        where("userAUid", "==", profileUserUid),
        where("userBUid", "==", currentUserUid),
        where("status", "==", "accepted")
      );
      const friendshipSnapshot2 = await getDocs(friendshipQuery2);

      if (!friendshipSnapshot1.empty || !friendshipSnapshot2.empty) {
        setFriendStatus("friend");
        return;
      }

      // Sprawdź, czy wysłano zaproszenie (senderUid == currentUserUid AND receiverUid == profileUserUid)
      const outgoingRequestQuery = query(
        collection(db, "friendRequests"),
        where("senderUid", "==", currentUserUid),
        where("receiverUid", "==", profileUserUid),
        where("status", "==", "pending")
      );
      const outgoingSnapshot = await getDocs(outgoingRequestQuery);
      if (!outgoingSnapshot.empty) {
        setFriendStatus("sent");
        return;
      }

      // Sprawdź, czy otrzymano zaproszenie (senderUid == profileUserUid AND receiverUid == currentUserUid)
      const incomingRequestQuery = query(
        collection(db, "friendRequests"),
        where("senderUid", "==", profileUserUid),
        where("receiverUid", "==", currentUserUid),
        where("status", "==", "pending")
      );
      const incomingSnapshot = await getDocs(incomingRequestQuery);
      if (!incomingSnapshot.empty) {
        setFriendStatus("received"); // Zmieniono z 'none' na 'received'
        return;
      }

      setFriendStatus("none");
    } catch (error) {
      console.error("Error checking friend status:", error);
      setFriendStatus("none");
    }
  };

  const handleAddFriend = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser || !userProfile) {
      Alert.alert("Error", "You need to be logged in to add friends.");
      return;
    }

    const senderUid = currentUser.uid;
    const receiverUid = userProfile.uid;

    if (senderUid === receiverUid) {
      Alert.alert("Error", "You cannot add yourself as a friend.");
      return;
    }

    const friendRequestData = {
      senderUid: senderUid,
      receiverUid: receiverUid,
      status: "pending",
      createdAt: serverTimestamp(),
    };

    console.log("Sending friend request with data:", friendRequestData);

    try {
      // Sprawdź, czy już są przyjaciółmi
      const friendshipQuery1 = query(
        collection(db, "friendships"),
        where("userAUid", "==", senderUid),
        where("userBUid", "==", receiverUid),
        where("status", "==", "accepted")
      );
      const friendshipSnapshot1 = await getDocs(friendshipQuery1);

      const friendshipQuery2 = query(
        collection(db, "friendships"),
        where("userAUid", "==", receiverUid),
        where("userBUid", "==", senderUid),
        where("status", "==", "accepted")
      );
      const friendshipSnapshot2 = await getDocs(friendshipQuery2);

      if (!friendshipSnapshot1.empty || !friendshipSnapshot2.empty) {
        Alert.alert("Info", "You are already friends with this user.");
        setFriendStatus("friend");
        return;
      }

      // Sprawdź, czy istnieje już wysłane zaproszenie
      const outgoingRequestQuery = query(
        collection(db, "friendRequests"),
        where("senderUid", "==", senderUid),
        where("receiverUid", "==", receiverUid),
        where("status", "==", "pending")
      );
      const outgoingSnapshot = await getDocs(outgoingRequestQuery);
      if (!outgoingSnapshot.empty) {
        Alert.alert(
          "Info",
          "You have already sent a friend request to this user."
        );
        setFriendStatus("sent");
        return;
      }

      // Sprawdź, czy profileUser wysłał zaproszenie do currentUser
      const incomingRequestQuery = query(
        collection(db, "friendRequests"),
        where("senderUid", "==", receiverUid),
        where("receiverUid", "==", senderUid),
        where("status", "==", "pending")
      );
      const incomingSnapshot = await getDocs(incomingRequestQuery);
      if (!incomingSnapshot.empty) {
        Alert.alert("Info", "This user has already sent you a friend request.");
        setFriendStatus("received"); // Możemy automatycznie przyjąć lub pozostawić 'received'
        return;
      }

      // Dodaj zaproszenie do przyjaciół
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
  };

  const handleAcceptRequest = async (senderUid: string) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        Alert.alert(
          "Error",
          "You need to be logged in to accept friend requests."
        );
        return;
      }

      const receiverUid = currentUser.uid;

      const batch = writeBatch(db);

      // Znajdź odpowiedni dokument zaproszenia
      const friendRequestsQuery = query(
        collection(db, "friendRequests"),
        where("senderUid", "==", senderUid),
        where("receiverUid", "==", receiverUid),
        where("status", "==", "pending")
      );

      const snapshot = await getDocs(friendRequestsQuery);
      if (snapshot.empty) {
        Alert.alert("Error", "No pending friend request found.");
        return;
      }

      const friendRequestDoc = snapshot.docs[0];
      const friendRequestRef = doc(db, "friendRequests", friendRequestDoc.id);

      // Aktualizuj status zaproszenia na 'accepted'
      batch.update(friendRequestRef, { status: "accepted" });

      // Dodaj dokument do kolekcji friendships
      const friendshipRef = doc(collection(db, "friendships"));
      batch.set(friendshipRef, {
        userAUid: senderUid,
        userBUid: receiverUid,
        createdAt: serverTimestamp(),
        status: "accepted",
      });

      // Aktualizuj własną listę znajomych
      const userDocRef = doc(db, "users", receiverUid);
      batch.update(userDocRef, {
        friends: arrayUnion(senderUid),
      });

      await batch.commit();

      Alert.alert("Success", "Friend request accepted!");
      setFriendStatus("friend");
    } catch (error) {
      console.error("Error accepting friend request:", error);
      Alert.alert("Error", "Failed to accept the friend request.");
    }
  };

  const handleDeclineRequest = async (senderUid: string) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        Alert.alert(
          "Error",
          "You need to be logged in to decline friend requests."
        );
        return;
      }

      const receiverUid = currentUser.uid;

      // Znajdź odpowiedni dokument zaproszenia
      const friendRequestsQuery = query(
        collection(db, "friendRequests"),
        where("senderUid", "==", senderUid),
        where("receiverUid", "==", receiverUid),
        where("status", "==", "pending")
      );

      const snapshot = await getDocs(friendRequestsQuery);
      if (snapshot.empty) {
        Alert.alert("Error", "No pending friend request found.");
        return;
      }

      const friendRequestDoc = snapshot.docs[0];
      const friendRequestRef = doc(db, "friendRequests", friendRequestDoc.id);

      // Aktualizuj status zaproszenia na 'rejected'
      await updateDoc(friendRequestRef, { status: "rejected" });

      Alert.alert("Success", "Friend request declined!");
      setFriendStatus("none");
    } catch (error) {
      console.error("Error declining friend request:", error);
      Alert.alert("Error", "Failed to decline the friend request.");
    }
  };

  if (!userProfile) {
    return (
      <View style={profileStyles.container}>
        <Text style={{ color: theme.colors.onBackground }}>
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
      {/* Nagłówek z przyciskiem powrotu i przełącznikiem motywu */}
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

      {/* User Panel */}
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

        {/* Przycisk "Add to Friends" lub "Accept"/"Decline" w zależności od statusu */}
        {auth.currentUser?.uid !== userProfile.uid &&
          (friendStatus === "received" ? (
            <View style={profileStyles.friendActionButtons}>
              <TouchableOpacity
                onPress={() => handleAcceptRequest(userProfile.uid)}
                style={[
                  profileStyles.acceptButton,
                  { backgroundColor: theme.colors.primary },
                ]}
                accessibilityLabel="Accept Friend Request"
                accessibilityRole="button"
              >
                <Text style={profileStyles.buttonText}>Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleDeclineRequest(userProfile.uid)}
                style={[
                  profileStyles.declineButton,
                  { backgroundColor: "rgba(116, 116, 116, 0.3)" },
                ]}
                accessibilityLabel="Decline Friend Request"
                accessibilityRole="button"
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
              accessibilityLabel={
                friendStatus === "friend" ? "Already Friends" : "Add Friend"
              }
              accessibilityRole="button"
            >
              <Text style={profileStyles.addFriendButtonText}>
                {friendStatus === "friend"
                  ? "Friend"
                  : friendStatus === "sent"
                    ? "Request Sent"
                    : "Add"}
              </Text>
            </TouchableOpacity>
          ))}
      </View>

      {/* Ranking Section */}
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

      {/* Visited Countries Section */}
      <View style={profileStyles.visitedContainer}>
        {/* Zmodyfikowany tytuł z liczbą odwiedzonych krajów po prawej */}
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
          <Text style={{ color: theme.colors.onBackground }}>
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

      {/* Modal z pełnym rankingiem */}
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

// StyleSheet dla ProfileScreen
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
    fontSize: 20, // Zmniejszony rozmiar czcionki
    fontWeight: "600",
  },
  userPanel: {
    alignItems: "center",
    marginBottom: 25,
  },
  userName: {
    marginTop: -2,
    fontSize: 18, // Zmniejszony rozmiar czcionki
    fontWeight: "500",
  },
  userEmail: {
    marginTop: 3,
    fontSize: 12, // Zmniejszony rozmiar czcionki
    color: "gray",
    marginBottom: 6,
  },
  friendActionButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "48%", // Dostosuj szerokość według potrzeb
    marginTop: 10,
  },
  acceptButton: {
    flex: 1,
    // marginTop: 2,
    paddingVertical: 5.5,
    borderRadius: 20,
    alignItems: "center",
    marginRight: 3,
    elevation: 2, // Dodanie cienia (opcjonalnie)
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  declineButton: {
    flex: 1,
    // marginTop: 2,
    paddingVertical: 5.5,
    // paddingHorizontal: 3,
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
    elevation: 2, // Dodanie cienia (opcjonalnie)
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
    fontSize: 18, // Zmniejszony rozmiar czcionki
    fontWeight: "600",
    marginBottom: 10,
    marginLeft: 2,
  },
  showAllRankingButton: {
    fontSize: 14, // Mniejszy rozmiar czcionki
    textDecorationLine: "none", // Usunięto podkreślenie
    marginBottom: 6,
  },
  rankingItemContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8, // Mniejszy padding
    paddingHorizontal: 12, // Mniejszy padding
    marginBottom: 10, // Większy odstęp między elementami
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ccc", // Dodanie obwódki
  },
  rank: {
    fontSize: 16, // Mniejszy rozmiar czcionki
    fontWeight: "bold",
    marginRight: 8,
  },
  countryName: {
    fontSize: 14, // Mniejszy rozmiar czcionki
  },
  visitedContainer: {
    marginBottom: 20,
  },
  visitedHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    // marginBottom: 10, // Opcjonalny margines dolny
  },
  visitedCount: {
    fontSize: 14, // Dopasuj rozmiar czcionki do swoich potrzeb
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
  addButtonIcon: {
    marginLeft: 8,
  },
  flag: {
    width: 20,
    height: 15,
    borderRadius: 2,
  },
});

// StyleSheet dla Modal
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
    backgroundColor: "#fff", // Zostanie nadpisane przez dynamiczne tło
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
