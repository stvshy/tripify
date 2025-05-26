// app/community/index.tsx
import React, {
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
  memo,
} from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Alert,
  TouchableWithoutFeedback,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  // TextStyle, // Dodaj, jeśli potrzebujesz bardziej szczegółowego typu dla stylu tekstu
  // ViewStyle, // Dodaj, jeśli potrzebujesz bardziej szczegółowego typu dla stylu widoku
} from "react-native";
import { auth, db } from "../config/firebaseConfig";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  onSnapshot,
  deleteDoc,
  getDocs,
  writeBatch,
  serverTimestamp,
  limit,
} from "firebase/firestore";
import { useRouter } from "expo-router";
import { useTheme } from "react-native-paper";
import type { MD3Theme } from "react-native-paper";
import { useFocusEffect } from "@react-navigation/native";
import { AntDesign, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { LayoutAnimation, UIManager } from "react-native";

// Enable LayoutAnimation for Android
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface User {
  uid: string;
  nickname?: string;
}

interface Friendship {
  id: string;
  friendUid: string;
  nickname: string;
}

const DEBOUNCE_DELAY = 300;

// --- NOWY KOMPONENT: FriendListItem ---
interface FriendListItemProps {
  item: Friendship;
  currentUserUid: string | undefined;
  activeFriendId: string | null;
  theme: MD3Theme;
  onNavigateToProfile: (uid: string) => void;
  onSetActiveFriendId: (id: string | null) => void;
  onRemoveFriend: (id: string) => void;
}

const FriendListItem: React.FC<FriendListItemProps> = memo(
  ({
    item,
    activeFriendId,
    theme,
    onNavigateToProfile,
    onSetActiveFriendId,
    onRemoveFriend,
  }) => {
    return (
      <TouchableOpacity
        onPress={() => onNavigateToProfile(item.friendUid)}
        onLongPress={() => onSetActiveFriendId(item.id)}
        style={[
          styles.friendItem,
          {
            backgroundColor:
              activeFriendId === item.id
                ? theme.colors.surfaceVariant
                : theme.colors.surface,
            borderBottomColor: theme.colors.outline,
          },
        ]}
      >
        <View style={styles.friendInfo}>
          <AntDesign
            name="smileo"
            size={18.3}
            color={theme.colors.primary}
            style={styles.friendIcon}
          />
          <Text
            style={{
              color: theme.colors.onBackground,
              fontSize: 15,
              marginLeft: 1.4,
            }}
          >
            {item.nickname}
          </Text>
        </View>
        {activeFriendId === item.id && (
          <TouchableOpacity
            onPress={() => onRemoveFriend(item.id)}
            style={styles.removeButton}
          >
            <Ionicons name="close-circle" size={24} color="red" />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  }
);

// --- NOWY KOMPONENT: SearchResultItem ---
interface SearchResultItemProps {
  item: User;
  theme: MD3Theme;
  isAlreadyFriend: (uid: string) => boolean;
  hasSentRequest: (uid: string) => boolean;
  onNavigateToProfile: (uid: string) => void;
  onAddFriend: (uid: string) => void;
}

const SearchResultItem: React.FC<SearchResultItemProps> = memo(
  ({
    item,
    theme,
    isAlreadyFriend,
    hasSentRequest,
    onNavigateToProfile,
    onAddFriend,
  }) => {
    const alreadyFriend = isAlreadyFriend(item.uid);
    const requestSent = hasSentRequest(item.uid);

    let buttonContent = <Ionicons name="add" size={17} color="#fff" />;
    let isDisabled = false;
    let specificButtonStyle; // Zmienna na specyficzny styl (addCircle lub sentButton)
    let buttonBackgroundColor = theme.colors.primary; // Domyślny kolor dla "Add"

    if (alreadyFriend) {
      specificButtonStyle = styles.friendButton; // Kształt jak "Sent"
      buttonBackgroundColor = theme.dark
        ? "rgba(171, 109, 197, 0.4)" // NOWY kolor dla "Friend" (ciemny)
        : "rgba(143, 73, 179, 0.37)";
      buttonContent = (
        <Text
          style={{
            color: "#fff", // ZMIANA: Kolor tekstu "Friend" na biały
            fontSize: 14,
            fontWeight: "500",
            // Opcjonalnie: Dodaj padding, aby przesunąć tekst w prawo wewnątrz przycisku
            // paddingLeft: 5, // Przykładowa wartość, dostosuj według potrzeb
          }}
        >
          Friend
        </Text>
      );
      isDisabled = true;
    } else if (requestSent) {
      specificButtonStyle = styles.sentButton;
      buttonBackgroundColor = theme.dark
        ? "rgba(128, 128, 128, 0.4)"
        : "rgba(204, 204, 204, 0.7)";
      buttonContent = <Text style={styles.sentButtonText}>Sent</Text>; // Zakładamy, że styl sentButtonText ma już biały kolor
      isDisabled = true;
    } else {
      specificButtonStyle = styles.addCircle;
      buttonContent = <Ionicons name="add" size={17} color="#fff" />;
      // buttonBackgroundColor pozostaje theme.colors.primary (ustawione domyślnie)
    }

    return (
      <TouchableOpacity
        onPress={() => onNavigateToProfile(item.uid)}
        style={[styles.searchItem, { borderBottomColor: theme.colors.outline }]}
      >
        <Text style={{ color: theme.colors.onBackground, fontSize: 15 }}>
          {item.nickname}
        </Text>
        <TouchableOpacity
          onPress={() => onAddFriend(item.uid)}
          style={[
            specificButtonStyle, // Zastosuj wybrany styl (addCircle lub sentButton)
            { backgroundColor: buttonBackgroundColor },
          ]}
          disabled={isDisabled}
        >
          {buttonContent}
        </TouchableOpacity>
      </TouchableOpacity>
    );
  }
);
// --- KONIEC NOWYCH KOMPONENTÓW ---

export default function CommunityScreen() {
  const [loading, setLoading] = useState(true);
  const [friendshipsAsUserA, setFriendshipsAsUserA] = useState<Friendship[]>(
    []
  );
  const [friendshipsAsUserB, setFriendshipsAsUserB] = useState<Friendship[]>(
    []
  );

  const [searchText, setSearchText] = useState("");
  const [debouncedSearchText, setDebouncedSearchText] = useState("");
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [activeFriendId, setActiveFriendId] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [sentRequests, setSentRequests] = useState<string[]>([]);
  const router = useRouter();
  const theme = useTheme(); // theme jest teraz dostępne w całym komponencie
  const currentUser = auth.currentUser;

  const navigateToProfile = useCallback(
    (uid: string) => {
      router.push(`/profile/${uid}`);
    },
    [router]
  );

  const fetchFriendships = useCallback(() => {
    if (!currentUser) {
      setLoading(false);
      setFriendshipsAsUserA([]);
      setFriendshipsAsUserB([]);
      return () => {};
    }

    const userId = currentUser.uid;
    setLoading(true);

    const processSnapshot = async (
      snapshot: any,
      isUserA: boolean,
      setter: React.Dispatch<React.SetStateAction<Friendship[]>>
    ) => {
      const fetchedFriendships: Friendship[] = [];
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        const friendUid = isUserA ? data.userBUid : data.userAUid;
        try {
          const friendDoc = await getDoc(doc(db, "users", friendUid));
          if (friendDoc.exists()) {
            const friendData = friendDoc.data();
            fetchedFriendships.push({
              id: docSnap.id,
              friendUid: friendUid,
              nickname: friendData.nickname || "Unknown",
            });
          }
        } catch (error) {
          console.error("Error fetching friend document:", error);
        }
      }
      setter(fetchedFriendships);
    };

    const friendshipsQueryA = query(
      collection(db, "friendships"),
      where("userAUid", "==", userId),
      where("status", "==", "accepted")
    );

    const friendshipsQueryB = query(
      collection(db, "friendships"),
      where("userBUid", "==", userId),
      where("status", "==", "accepted")
    );

    const unsubscribeA = onSnapshot(
      friendshipsQueryA,
      (snapshot) => processSnapshot(snapshot, true, setFriendshipsAsUserA),
      (error) => {
        console.error("Error fetching friendships (A):", error);
        setLoading(false);
      }
    );

    const unsubscribeB = onSnapshot(
      friendshipsQueryB,
      (snapshot) => processSnapshot(snapshot, false, setFriendshipsAsUserB),
      (error) => {
        console.error("Error fetching friendships (B):", error);
        setLoading(false);
      }
    );

    Promise.all([
      getDocs(friendshipsQueryA),
      getDocs(friendshipsQueryB),
    ]).finally(() => {
      setLoading(false);
    });

    return () => {
      unsubscribeA();
      unsubscribeB();
    };
  }, [currentUser]);

  useFocusEffect(
    React.useCallback(() => {
      const unsubscribe = fetchFriendships();
      return () => unsubscribe && unsubscribe();
    }, [fetchFriendships])
  );

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearchText(searchText);
    }, DEBOUNCE_DELAY);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchText]);

  const actualSearchFunction = useCallback(
    async (text: string) => {
      if (text.length < 3) {
        setSearchResults([]);
        return;
      }
      if (!currentUser) return;

      try {
        const usersRef = collection(db, "users");
        const q = query(
          usersRef,
          where("nickname", ">=", text),
          where("nickname", "<=", text + "\uf8ff"),
          limit(10)
        );
        const snapshot = await getDocs(q);
        const foundUsers: User[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.nickname && docSnap.id !== currentUser.uid) {
            foundUsers.push({ uid: docSnap.id, nickname: data.nickname });
          }
        });
        setSearchResults(foundUsers);
      } catch (error) {
        console.error("Error searching users:", error);
        Alert.alert("Error", "Failed to search users.");
      }
    },
    [currentUser]
  );

  useEffect(() => {
    if (isSearchMode) {
      actualSearchFunction(debouncedSearchText);
    } else {
      setSearchResults([]);
    }
  }, [debouncedSearchText, isSearchMode, actualSearchFunction]);

  const handleRemoveFriend = useCallback(async (friendshipId: string) => {
    Alert.alert(
      "Confirmation",
      "Are you sure you want to remove this friend?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              LayoutAnimation.configureNext(
                LayoutAnimation.Presets.easeInEaseOut
              );
              await deleteDoc(doc(db, "friendships", friendshipId));
              Alert.alert("Success", "Friend removed!");
              setActiveFriendId(null);
            } catch (error) {
              console.error("Error removing friend:", error);
              Alert.alert("Error", "Failed to remove friend.");
            }
          },
        },
      ]
    );
  }, []);

  const combinedFriendships = useMemo(() => {
    const all = [...friendshipsAsUserA, ...friendshipsAsUserB];
    const uniqueMap = new Map<string, Friendship>();
    all.forEach((f) => {
      if (!uniqueMap.has(f.id)) {
        uniqueMap.set(f.id, f);
      }
    });
    return Array.from(uniqueMap.values());
  }, [friendshipsAsUserA, friendshipsAsUserB]);

  const handleAddFriend = useCallback(
    async (friendUid: string) => {
      if (!currentUser) {
        Alert.alert("Error", "User is not logged in.");
        return;
      }

      const senderUid = currentUser.uid;
      const receiverUid = friendUid;

      try {
        if (combinedFriendships.some((f) => f.friendUid === receiverUid)) {
          Alert.alert("Info", "This person is already your friend.");
          return;
        }

        const outgoingSnapshot = await getDocs(
          query(
            collection(db, "friendRequests"),
            where("senderUid", "==", senderUid),
            where("receiverUid", "==", receiverUid),
            where("status", "==", "pending")
          )
        );
        if (!outgoingSnapshot.empty) {
          Alert.alert(
            "Info",
            "A friend request has already been sent to this person."
          );
          return;
        }

        const incomingSnapshot = await getDocs(
          query(
            collection(db, "friendRequests"),
            where("senderUid", "==", receiverUid),
            where("receiverUid", "==", senderUid),
            where("status", "==", "pending")
          )
        );
        if (!incomingSnapshot.empty) {
          Alert.alert(
            "Info",
            "This person has already sent you a friend request."
          );
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
      } catch (error) {
        console.error("Error sending friend request:", error);
        Alert.alert("Error", "Failed to send friend request.");
      }
    },
    [currentUser, combinedFriendships]
  );

  const toggleMode = useCallback(() => {
    setIsSearchMode((prev) => !prev);
    setSearchText("");
    setDebouncedSearchText("");
    setSearchResults([]);
    setActiveFriendId(null);
  }, []);

  const isAlreadyFriend = useCallback(
    (uid: string): boolean => {
      return combinedFriendships.some((friend) => friend.friendUid === uid);
    },
    [combinedFriendships]
  );

  const hasSentRequest = useCallback(
    (uid: string): boolean => {
      return sentRequests.includes(uid);
    },
    [sentRequests]
  );

  useEffect(() => {
    if (!currentUser) {
      setSentRequests([]);
      return () => {};
    }
    const q = query(
      collection(db, "friendRequests"),
      where("senderUid", "==", currentUser.uid),
      where("status", "==", "pending")
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const sentUids = snapshot.docs.map(
          (doc) => doc.data().receiverUid as string
        );
        setSentRequests(sentUids);
      },
      (error) => {
        console.error("Error fetching sent friend requests snapshot:", error);
      }
    );
    return () => unsubscribe();
  }, [currentUser]);

  const renderFriendItem = useCallback(
    ({ item }: { item: Friendship }) => (
      <FriendListItem
        item={item}
        currentUserUid={currentUser?.uid}
        activeFriendId={activeFriendId}
        theme={theme}
        onNavigateToProfile={navigateToProfile}
        onSetActiveFriendId={setActiveFriendId}
        onRemoveFriend={handleRemoveFriend}
      />
    ),
    [
      currentUser?.uid,
      activeFriendId,
      theme,
      navigateToProfile,
      handleRemoveFriend,
    ]
  );

  const renderSearchItem = useCallback(
    ({ item }: { item: User }) => (
      <SearchResultItem
        item={item}
        theme={theme}
        isAlreadyFriend={isAlreadyFriend}
        hasSentRequest={hasSentRequest}
        onNavigateToProfile={navigateToProfile}
        onAddFriend={handleAddFriend}
      />
    ),
    [theme, isAlreadyFriend, hasSentRequest, navigateToProfile, handleAddFriend]
  );

  if (loading) {
    return (
      <View
        style={[styles.loading, { backgroundColor: theme.colors.background }]}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    // ZMIANA: Dodaj wrapper z tłem - to już było, ale upewnijmy się
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <TouchableWithoutFeedback onPress={() => setActiveFriendId(null)}>
        <SafeAreaView
          style={[
            styles.container,
            { backgroundColor: theme.colors.background },
          ]}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.keyboardAvoidingView}
            keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 20}
          >
            <View style={{ flex: 1 }}>
              <View style={styles.searchAndToggleContainer}>
                <View
                  style={[
                    styles.searchContainer,
                    {
                      borderColor: isFocused
                        ? theme.colors.primary
                        : theme.colors.outline,
                    },
                  ]}
                >
                  <AntDesign
                    name="search1"
                    size={17}
                    color={theme.colors.onSurfaceVariant}
                    style={styles.searchIcon}
                  />
                  <TextInput
                    placeholder={
                      isSearchMode
                        ? "Enter friend's nickname..."
                        : "Search friends..."
                    }
                    value={searchText}
                    onChangeText={setSearchText}
                    keyboardType="default"
                    style={[
                      styles.input,
                      {
                        color: theme.colors.onBackground,
                        opacity: 0.97,
                        marginLeft: 4,
                      },
                    ]}
                    placeholderTextColor={theme.colors.onSurfaceVariant}
                    autoCapitalize="none"
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                  />
                  {searchText.length > 0 && (
                    <TouchableOpacity
                      onPress={() => {
                        setSearchText("");
                        setDebouncedSearchText("");
                      }}
                      style={styles.clearIcon}
                    >
                      <MaterialIcons
                        name="close"
                        size={18}
                        color={theme.colors.onSurfaceVariant}
                      />
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.modeToggleContainer}>
                  <TouchableOpacity
                    style={[
                      styles.modeButton,
                      {
                        backgroundColor: isSearchMode
                          ? theme.colors.surfaceVariant
                          : theme.colors.primary,
                        borderTopLeftRadius: 25,
                        borderBottomLeftRadius: 25,
                      },
                    ]}
                    onPress={() => {
                      if (isSearchMode) toggleMode();
                    }}
                  >
                    <AntDesign
                      name="smileo"
                      size={19}
                      color={
                        isSearchMode ? theme.colors.onSurfaceVariant : "#fff"
                      }
                      style={{ marginLeft: 3 }}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.modeButton,
                      {
                        backgroundColor: isSearchMode
                          ? theme.colors.primary
                          : theme.colors.surfaceVariant,
                        borderTopRightRadius: 25,
                        borderBottomRightRadius: 25,
                      },
                    ]}
                    onPress={() => {
                      if (!isSearchMode) toggleMode();
                    }}
                  >
                    <AntDesign
                      name="adduser"
                      size={19}
                      color={
                        !isSearchMode ? theme.colors.onSurfaceVariant : "#fff"
                      }
                      style={{ marginRight: 3 }}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {!isSearchMode && (
                <>
                  {combinedFriendships.length === 0 ? (
                    <View style={styles.empty}>
                      <Text style={{ color: theme.colors.onBackground }}>
                        You have no friends yet.
                      </Text>
                    </View>
                  ) : (
                    <FlatList
                      data={combinedFriendships.filter((friend) =>
                        friend.nickname
                          .toLowerCase()
                          .includes(debouncedSearchText.toLowerCase())
                      )}
                      keyExtractor={(item) => item.id}
                      renderItem={renderFriendItem}
                    />
                  )}
                </>
              )}

              {isSearchMode && (
                <>
                  {searchResults.length === 0 &&
                  debouncedSearchText.length >= 3 ? (
                    <View style={styles.noResults}>
                      <Text style={{ color: theme.colors.onBackground }}>
                        No users found.
                      </Text>
                    </View>
                  ) : (
                    <FlatList
                      data={searchResults}
                      keyExtractor={(item) => item.uid}
                      renderItem={renderSearchItem}
                    />
                  )}
                </>
              )}
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </TouchableWithoutFeedback>
    </View>
  );
}

// StyleSheet.create jest wywoływane tylko raz na poziomie modułu.
// Style zależne od theme muszą być definiowane inline lub przez funkcję przyjmującą theme.
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    paddingTop: 4,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  searchAndToggleContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  searchContainer: {
    flex: 2.5,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 25,
    paddingLeft: 40,
    paddingRight: 40,
    height: 45,
  },
  searchIcon: {
    position: "absolute",
    left: 16,
  },
  clearIcon: {
    position: "absolute",
    right: 16,
  },
  input: {
    flex: 1,
    fontSize: 13,
  },
  modeToggleContainer: {
    flex: 1.1,
    flexDirection: "row",
    marginLeft: 5,
  },
  modeButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  friendItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 11,
    borderBottomWidth: 1,
    borderRadius: 15,
    marginBottom: 7,
  },
  friendInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 4.8,
  },
  friendIcon: {
    marginRight: 10,
  },
  removeButton: {
    padding: 4,
  },
  addCircle: {
    // Styl dla przycisku "Add" (kółko)
    width: 27,
    height: 27,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    marginRight: 10,
  },
  sentButton: {
    // Styl dla przycisków "Sent" i "Friend" (kształt prostokąta)
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    left: 2.7, // Możesz dostosować lub usunąć, jeśli nie jest potrzebne
    // marginRight: 10, // Możesz dodać, jeśli chcesz odstęp jak w addCircle
  },
  friendButton: {
    // Styl dla przycisków "Sent" i "Friend" (kształt prostokąta)
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    left: 8, // Możesz dostosować lub usunąć, jeśli nie jest potrzebne
    // marginRight: 10, // Możesz dodać, jeśli chcesz odstęp jak w addCircle
  },
  sentButtonText: {
    // Styl tekstu dla przycisku "Sent"
    color: "#fff", // Zakładając, że tło (#ccc) jest wystarczająco jasne
    fontSize: 14,
    fontWeight: "500",
  },
  // Usunięto friendButtonText, ponieważ styl tekstu "Friend" jest teraz inline
  searchItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    marginLeft: 4,
  },
  noResults: {
    alignItems: "center",
    marginTop: 20,
  },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
