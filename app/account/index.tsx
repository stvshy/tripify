import React, {
  useContext,
  useState,
  useMemo,
  useCallback,
  useEffect,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  ScrollView,
  LayoutAnimation,
  TouchableWithoutFeedback,
  Modal,
} from "react-native";
import { useRouter } from "expo-router";
import { ThemeContext } from "../config/ThemeContext";
import { useTheme } from "react-native-paper";
import {
  getDoc,
  doc,
  updateDoc,
  collection,
  getDocs,
} from "firebase/firestore";
import { db, auth } from "../config/firebaseConfig";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import RightSlideMenu, {
  RightSlideMenuHandles,
  RightSlideMenuItem,
} from "../../components/RightSlideMenu";
import ConfirmationModal from "../../components/ConfirmationModal";
import { Linking } from "react-native";
import countriesData from "../../assets/maps/countries.json";
import CountryFlag from "react-native-country-flag";
import RankingItem from "../../components/RankItem";
import { storage } from "../config/storage";
import { useAuthStore } from "../store/authStore";

interface Country {
  id: string;
  cca2: string;
  name: string;
  flag: string;
  class: string;
  path: string;
}
import { useFocusEffect } from "@react-navigation/native";
import { signOut } from "firebase/auth";

interface RankingSlot {
  id: string;
  rank: number;
  country: Country | null;
}
interface Note {
  id: string;
  countryCca2: string;
  noteText: string;
  createdAt: any;
}
const generateUniqueId = () =>
  `rank-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export default function AccountScreen() {
  const { isDarkTheme } = useContext(ThemeContext);
  const theme = useTheme();
  const router = useRouter();
  const authUser = auth.currentUser;
  const storeUserProfile = useAuthStore((s) => s.userProfile);
  const menuRef = React.useRef<RightSlideMenuHandles>(null);
  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);

  // Helpers for MMKV cache keys
  const cacheKeys = useMemo(() => {
    const uid = authUser?.uid;
    return uid
      ? {
          ranking: `user:${uid}:ranking`,
          notes: `user:${uid}:notes`,
          nickname: `user:${uid}:nickname`,
          email: `user:${uid}:email`,
        }
      : null;
  }, [authUser?.uid]);

  // Countries mapping for ranking slots
  const [activeRankingItemId, setActiveRankingItemId] = useState<string | null>(
    null
  );
  const [userName, setUserName] = useState<string>(() => {
    // Prefer nickname from auth store; fallback to cached value; else empty
    const fromStore = useAuthStore.getState().userProfile?.nickname;
    if (fromStore) return fromStore;
    const key = auth.currentUser
      ? `user:${auth.currentUser.uid}:nickname`
      : null;
    return key ? storage.getString(key) || "" : "";
  });
  const [userEmail, setUserEmail] = useState<string>(() => {
    const email = auth.currentUser?.email;
    if (email) return email;
    const key = auth.currentUser ? `user:${auth.currentUser.uid}:email` : null;
    return key ? storage.getString(key) || "" : "";
  });
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

  const [rankingSlots, setRankingSlots] = useState<RankingSlot[]>(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return [];
    const raw = storage.getString(`user:${uid}:ranking`);
    if (!raw) return [];
    try {
      const rankingArr: string[] = JSON.parse(raw);
      return rankingArr.map((cca2, index) => {
        const country = mappedCountries.find((c) => c.cca2 === cca2) || null;
        return { id: generateUniqueId(), rank: index + 1, country };
      });
    } catch {
      return [];
    }
  });

  const [notes, setNotes] = useState<Note[]>(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return [];
    const raw = storage.getString(`user:${uid}:notes`);
    if (!raw) return [];
    try {
      const parsed: Note[] = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const openMailTo = useCallback(
    (subject: string) => {
      const nickname =
        userName ||
        useAuthStore.getState().userProfile?.nickname ||
        auth.currentUser?.uid ||
        "unknown";
      const mailto = `mailto:tripify.travelapp@gmail.com?subject=${encodeURIComponent(subject.replace("{nickname}", String(nickname)))}`;
      Linking.openURL(mailto).catch(() => {
        Alert.alert("Error", "Could not open the mail app.");
      });
    },
    [userName]
  );

  const { width, height } = Dimensions.get("window");
  const [isNotePreviewVisible, setIsNotePreviewVisible] =
    useState<boolean>(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);

  // Keep userName in sync with auth store updates (e.g., after nickname set)
  useEffect(() => {
    if (storeUserProfile?.nickname) {
      setUserName(storeUserProfile.nickname);
      if (cacheKeys) storage.set(cacheKeys.nickname, storeUserProfile.nickname);
    }
  }, [storeUserProfile?.nickname, cacheKeys]);
  useEffect(() => {
    if (authUser?.email) {
      setUserEmail(authUser.email);
      if (cacheKeys) storage.set(cacheKeys.email, authUser.email);
    }
  }, [authUser?.email, cacheKeys]);

  const fetchUserData = useCallback(async () => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      const userDocRef = doc(db, "users", currentUser.uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const rankingData: string[] = userData.ranking || [];
        const nickname: string | undefined = userData.nickname;
        const email: string | null | undefined = currentUser.email;
        // Update text fields and persist
        if (nickname) {
          setUserName(nickname);
          if (cacheKeys) storage.set(cacheKeys.nickname, nickname);
        }
        if (email) {
          setUserEmail(email);
          if (cacheKeys) storage.set(cacheKeys.email, email);
        }

        // Create initial ranking slots with unique IDs
        const initialSlots: RankingSlot[] = rankingData.map((cca2, index) => {
          const country =
            mappedCountries.find((c: Country) => c.cca2 === cca2) || null;
          return {
            id: generateUniqueId(),
            rank: index + 1,
            country: country,
          };
        });

        setRankingSlots(initialSlots);
        // Persist ranking for instant next load
        try {
          if (cacheKeys)
            storage.set(cacheKeys.ranking, JSON.stringify(rankingData));
        } catch {}

        // Fetch user notes
        const notesCollectionRef = collection(
          db,
          "users",
          currentUser.uid,
          "notes"
        );
        const notesSnapshot = await getDocs(notesCollectionRef);
        const notesList: Note[] = notesSnapshot.docs.map((doc) => ({
          id: doc.id,
          countryCca2: doc.data().countryCca2,
          noteText: doc.data().noteText,
          createdAt: doc.data().createdAt,
        }));
        setNotes(notesList);
        // Persist notes
        try {
          if (cacheKeys)
            storage.set(cacheKeys.notes, JSON.stringify(notesList));
        } catch {}
      } else {
        console.log("User document does not exist.");
      }
    } else {
      console.log("No current user.");
    }
  }, [mappedCountries, cacheKeys]);

  useFocusEffect(
    useCallback(() => {
      fetchUserData();
    }, [fetchUserData])
  );
  const handleGoBack = () => {
    router.back();
  };

  const handleRemoveFromRanking = (index: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (index >= 0 && index < rankingSlots.length) {
      const updatedSlots = [...rankingSlots];
      updatedSlots.splice(index, 1);
      // Update ranks
      const reRankedSlots = updatedSlots.map((item, idx) => ({
        ...item,
        rank: idx + 1,
      }));
      setRankingSlots(reRankedSlots);
      handleSaveRanking(reRankedSlots);
      setActiveRankingItemId(null);
    } else {
      console.warn(`Invalid index for removal: ${index}`);
    }
  };

  const handleSaveRanking = async (newRankingSlots: RankingSlot[]) => {
    const ranking = newRankingSlots
      .filter((slot) => slot.country !== null)
      .map((slot) => slot.country!.cca2);
    const currentUser = auth.currentUser;
    if (currentUser) {
      const userDocRef = doc(db, "users", currentUser.uid);
      await updateDoc(userDocRef, { ranking: ranking });
      // Update cache optimistically
      try {
        storage.set(`user:${currentUser.uid}:ranking`, JSON.stringify(ranking));
      } catch {}
      Alert.alert("Success", "Ranking has been saved successfully.");
    }
  };

  const handleNavigateToNotes = () => {
    router.push("/notes");
  };

  const handleNotePress = (note: Note) => {
    setSelectedNote(note);
    setIsNotePreviewVisible(true);
  };
  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace("/welcome");
    } catch (error) {
      console.error("Error logging out:", error);
      Alert.alert("Error", "Failed to log out. Please try again.");
    }
  };

  // Account deletion flow
  const triggerDeleteFlow = useCallback(() => {
    setConfirmDeleteVisible(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    setConfirmDeleteVisible(false);
    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Not signed in", "Please sign in again and retry.");
      return;
    }
    try {
      // Note: Firestore user doc cleanup could be added here if desired
      await user.delete();
      Alert.alert("Account deleted", "Your account has been removed.");
      router.replace("/welcome");
    } catch (err: any) {
      // Common case: requires recent login
      if (err?.code === "auth/requires-recent-login") {
        Alert.alert(
          "Reauthentication required",
          "For security, please sign in again and then delete your account."
        );
      } else {
        console.error("Delete account error:", err);
        Alert.alert("Error", "Could not delete the account. Please try again.");
      }
    }
  }, [router]);

  const menuItems = React.useMemo<RightSlideMenuItem[]>(
    () => [
      {
        key: "delete-account",
        label: "Delete your account",
        danger: true,
        icon: (
          <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
        ),
        onPress: triggerDeleteFlow,
      },
      {
        key: "report-bug",
        label: "Report a bug",
        icon: (
          <Ionicons
            name="bug-outline"
            size={20}
            color={theme.colors.onBackground}
          />
        ),
        onPress: () => openMailTo("Bug report from {nickname}"),
      },
      {
        key: "contact-us",
        label: "Contact us",
        icon: (
          <Ionicons
            name="mail-outline"
            size={20}
            color={theme.colors.onBackground}
          />
        ),
        onPress: () => openMailTo("Contact from {nickname}"),
      },
    ],
    [
      theme.colors.error,
      theme.colors.onBackground,
      triggerDeleteFlow,
      openMailTo,
    ]
  );

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <ScrollView
        contentContainerStyle={{ paddingBottom: 20 }}
        scrollIndicatorInsets={{ right: -3 }}
      >
        <TouchableWithoutFeedback onPress={() => setActiveRankingItemId(null)}>
          <View>
            {/* Header aligned with Friend Requests style */}
            <View
              style={[
                styles.header,
                {
                  paddingTop: height * 0.0238,
                  paddingBottom: 10,
                  // paddingHorizontal: 10
                  marginHorizontal: -4.5,
                },
              ]}
            >
              <TouchableOpacity
                onPress={handleGoBack}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={{ padding: 8, marginLeft: -10 }}
              >
                <MaterialIcons
                  name="arrow-back-ios"
                  size={21}
                  color={theme.colors.onBackground}
                  style={{ marginTop: -0.2 }}
                />
              </TouchableOpacity>
              <Text
                style={{
                  fontSize: 19.5,
                  fontWeight: "600",
                  fontFamily: "Figtree-Regular",
                  color: theme.colors.onBackground,
                }}
              >
                Account
              </Text>
              <TouchableOpacity
                onPress={() => menuRef.current?.toggle()}
                style={{ padding: 8, marginRight: -10 }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name="ellipsis-vertical"
                  size={21}
                  color={theme.colors.onBackground}
                />
              </TouchableOpacity>
            </View>

            {/* User Panel */}
            <View style={styles.userPanel}>
              <Ionicons
                name="person-circle"
                size={100}
                color={theme.colors.primary}
              />
              <Text style={[styles.userName, { color: theme.colors.primary }]}>
                {userName}
              </Text>
              <Text style={[styles.userEmail, { color: "gray" }]}>
                {userEmail}
              </Text>
            </View>

            {/* Ranking Section */}
            <View
              style={[
                styles.rankingWindow,
                { backgroundColor: isDarkTheme ? "#333333" : "#f5f5f5" },
              ]}
            >
              <Text
                style={[styles.rankingTitle, { color: theme.colors.onSurface }]}
              >
                Ranking
              </Text>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => router.push("/ranking")}
              >
                <Text
                  style={[
                    styles.editButtonText,
                    { color: theme.colors.primary },
                  ]}
                >
                  {rankingSlots.length > 0
                    ? "Show and Edit Ranking"
                    : "Create Ranking"}
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={15}
                  color={theme.colors.primary}
                  style={{ marginRight: -11, marginBottom: -7 }}
                />
              </TouchableOpacity>
            </View>

            {/* Horizontal Ranking List */}
            {rankingSlots.length > 0 ? (
              <View
                style={[
                  styles.horizontalRankingContainer,
                  { backgroundColor: isDarkTheme ? "#333333" : "#f5f5f5" },
                ]}
              >
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {rankingSlots.map((slot, index) => (
                    <RankingItem
                      key={slot.id}
                      slot={slot}
                      index={index}
                      onRemove={handleRemoveFromRanking}
                      activeRankingItemId={activeRankingItemId}
                      setActiveRankingItemId={setActiveRankingItemId}
                      isDarkTheme={isDarkTheme} // Pass the theme prop
                    />
                  ))}
                </ScrollView>
              </View>
            ) : (
              <View
                style={[
                  styles.noRankingContainer,
                  { backgroundColor: isDarkTheme ? "#333333" : "#f5f5f5" },
                ]}
              >
                <Text
                  style={[
                    styles.noRankingText,
                    { color: theme.colors.onBackground },
                  ]}
                >
                  You haven't created a ranking yet.
                </Text>
              </View>
            )}

            {/* Notes Section */}
            <View
              style={[
                styles.notesContainer,
                { backgroundColor: isDarkTheme ? "#333333" : "#f5f5f5" },
              ]}
            >
              <Text
                style={[styles.notesTitle, { color: theme.colors.onSurface }]}
              >
                Notes
              </Text>
              <TouchableOpacity
                style={styles.editButton}
                onPress={handleNavigateToNotes}
              >
                <Text
                  style={[
                    styles.editButtonText,
                    { color: theme.colors.primary },
                  ]}
                >
                  {notes.length > 0 ? "View and Create Notes" : "Create Note"}
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={15}
                  color={theme.colors.primary}
                  style={{ marginRight: -11, marginBottom: -7 }}
                />
              </TouchableOpacity>
            </View>

            {/* Horizontal Notes List */}
            {notes.length > 0 ? (
              <View
                style={[
                  styles.horizontalNotesContainer,
                  { backgroundColor: isDarkTheme ? "#333333" : "#f5f5f5" },
                ]}
              >
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {notes.map((note) => {
                    const country = mappedCountries.find(
                      (c) => c.cca2 === note.countryCca2
                    );
                    return (
                      <TouchableOpacity
                        key={note.id}
                        style={[
                          styles.noteItem,
                          {
                            backgroundColor: isDarkTheme
                              ? "#333333"
                              : "#f5f5f5",
                            borderColor: isDarkTheme ? "#555" : "#ccc",
                            borderWidth: 1,
                          },
                        ]}
                        onPress={() => handleNotePress(note)}
                      >
                        <View style={styles.noteHeader}>
                          {country && (
                            <CountryFlag
                              isoCode={country.cca2}
                              size={20}
                              style={styles.noteFlag}
                            />
                          )}
                          <Text
                            style={[
                              styles.noteCountryName,
                              { color: theme.colors.onSurface },
                            ]}
                            numberOfLines={2}
                          >
                            {country ? country.name : "Unknown Country"}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.noteText,
                            { color: theme.colors.onSurface },
                          ]}
                          numberOfLines={3}
                          ellipsizeMode="tail"
                        >
                          {note.noteText}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            ) : (
              <View
                style={[
                  styles.noNotesContainer,
                  { backgroundColor: isDarkTheme ? "#333333" : "#f5f5f5" },
                ]}
              >
                <Text
                  style={[
                    styles.noNotesText,
                    { color: theme.colors.onBackground },
                  ]}
                >
                  You haven't created any notes yet.
                </Text>
              </View>
            )}
          </View>
        </TouchableWithoutFeedback>
      </ScrollView>
      {/* Logout Link */}
      <View style={{ alignItems: "center", marginBottom: -30 }}>
        <TouchableOpacity onPress={handleLogout}>
          <Text
            style={{
              color: theme.colors.primary,
              fontSize: 12,
              fontFamily: "Figtree-Regular",
            }}
          >
            Logout
          </Text>
        </TouchableOpacity>
      </View>
      {/* Note Preview Modal */}
      <Modal
        visible={isNotePreviewVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsNotePreviewVisible(false)}
      >
        <View style={styles.modalBackground}>
          <TouchableWithoutFeedback
            onPress={() => setIsNotePreviewVisible(false)}
          >
            <View style={styles.modalOverlay} />
          </TouchableWithoutFeedback>
          <View style={styles.modalContainer}>
            <View
              style={[
                styles.modalContent,
                { backgroundColor: theme.colors.surface },
              ]}
            >
              {/* Close Button */}
              <TouchableOpacity
                onPress={() => setIsNotePreviewVisible(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons
                  name="close"
                  size={24}
                  color={theme.colors.onSurface}
                />
              </TouchableOpacity>

              {/* Modal interior */}
              <ScrollView
                contentContainerStyle={styles.modalScrollContent}
                showsVerticalScrollIndicator={false}
              >
                {selectedNote && (
                  <View style={styles.modalHeaderContainer}>
                    {mappedCountries.find(
                      (c) => c.cca2 === selectedNote.countryCca2
                    ) && (
                      <CountryFlag
                        isoCode={selectedNote.countryCca2}
                        size={25}
                        style={styles.modalFlag}
                      />
                    )}
                    <Text
                      style={[
                        styles.modalHeader,
                        { color: theme.colors.onSurface },
                      ]}
                    >
                      {mappedCountries.find(
                        (c) => c.cca2 === selectedNote.countryCca2
                      )?.name || ""}
                    </Text>
                  </View>
                )}
                <Text
                  style={[
                    styles.modalNoteText,
                    { color: theme.colors.onSurface },
                  ]}
                >
                  {selectedNote ? selectedNote.noteText : ""}
                </Text>
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>
      {/* Right slide-out menu */}
      <RightSlideMenu ref={menuRef} items={menuItems} />
      {/* Confirm delete dialog */}
      <ConfirmationModal
        visible={confirmDeleteVisible}
        title="Delete account"
        message="This action is permanent and will remove your account. Continue?"
        onCancel={() => setConfirmDeleteVisible(false)}
        onConfirm={handleConfirmDelete}
        confirmText="Delete"
        isDestructive
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 50,
    flex: 1,
    justifyContent: "flex-start",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  headerButton: {
    padding: 8,
    width: 40,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 21,
    fontWeight: "700",
  },
  userPanel: {
    alignItems: "center",
    marginBottom: 30,
    marginTop: 0,
  },
  userName: {
    marginTop: -7,
    fontSize: 20,
    fontWeight: "600",
    fontFamily: "Figtree-SemiBold",
  },
  userEmail: {
    marginTop: 4,
    fontSize: 14,
    color: "gray",
    fontFamily: "Figtree-Regular",
  },
  rankingWindow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    paddingVertical: 5,
    paddingHorizontal: 15,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  rankingTitle: {
    fontSize: 17,
    fontWeight: "600",
    fontFamily: "PlusJakartaSans-Bold",
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  editButtonText: {
    // color: "#6200ee",
    fontSize: 14.2,
    marginRight: 4,
    fontFamily: "Figtree-Regular",
    marginBottom: -4.5,
  },
  horizontalRankingContainer: {
    marginBottom: 20,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    padding: 10,
    paddingBottom: 15,
    paddingTop: 10,
  },
  noRankingContainer: {
    alignItems: "center",
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    marginBottom: 20,
    padding: 10,
    paddingBottom: 20,
    paddingTop: 20,
  },
  noRankingText: {
    fontSize: 14,
    fontFamily: "Figtree-Regular",
  },
  notesContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    paddingVertical: 5,
    paddingHorizontal: 15,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  notesTitle: {
    fontSize: 17,
    fontWeight: "600",
    fontFamily: "PlusJakartaSans-Bold",
  },
  horizontalNotesContainer: {
    marginBottom: 20,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    padding: 10,
    paddingBottom: 15,
    paddingTop: 10,
  },
  noteItem: {
    width: 200,
    borderRadius: 10,
    padding: 16,
    marginRight: 10,
    // Remove shadows
    // Instead, use border to match ranking items
  },
  noteHeader: {
    flexDirection: "row",
    alignItems: "flex-start", // Align items to the top
    marginBottom: 8,
  },
  noteFlag: {
    marginRight: 8,
    borderRadius: 4,
    width: 25,
    height: 15,
    marginTop: 3, // Adjust to align with multi-line text
  },
  noteCountryName: {
    fontSize: 15,
    fontWeight: "600",
    flexShrink: 1,
    flexWrap: "wrap",
    maxWidth: "90%",
    fontFamily: "Figtree-SemiBold",
  },
  noteText: {
    fontSize: 14,
    fontFamily: "Figtree-Regular",
  },
  noNotesContainer: {
    alignItems: "center",
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    marginBottom: 20,
    padding: 10,
    paddingBottom: 20,
    paddingTop: 20,
  },
  noNotesText: {
    fontSize: 14,
    fontFamily: "Figtree-Regular",
  },
  modalBackground: {
    flex: 1,
    position: "relative",
  },
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    borderRadius: 10,
    padding: 20,
    paddingTop: 40, // Aby uwzględnić przycisk zamknięcia
    maxHeight: "86%", // Maksymalna wysokość modala
    width: "90%", // Szerokość modala
  },
  modalCloseButton: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 1,
  },
  modalHeaderContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  modalFlag: {
    marginRight: 8,
    borderRadius: 4,
    width: 30,
    height: 20,
  },
  modalHeader: {
    fontSize: 18,
    fontWeight: "bold",
    fontFamily: "Figtree-SemiBold",
  },
  modalNoteText: {
    fontSize: 16,
    fontFamily: "Figtree-Regular",
  },
  modalScrollContent: {
    paddingBottom: 20,
  },
  logoutButton: {
    position: "absolute",
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
  },
  logoutText: {
    fontSize: 16,
    color: "#FF0000", // Czerwony kolor tekstu, możesz zmienić
    fontWeight: "bold",
  },
});
