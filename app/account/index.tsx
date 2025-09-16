import React, {
  useContext,
  useState,
  useMemo,
  useCallback,
  useEffect,
  useTransition,
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
  InteractionManager,
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
// import countriesData from "../../assets/maps/countries.json";
import CountryFlag from "react-native-country-flag";
import RankingItem from "../../components/RankItem";
import { storage } from "../config/storage";
import { useAuthStore } from "../store/authStore";
import { useFocusEffect } from "@react-navigation/native";
import { signOut } from "firebase/auth";
import { COUNTRY_BY_CCA2, getFlagUrl } from "../../components/countriesIndex";
import { FlatList } from "react-native";
import FastImage from "@d11/react-native-fast-image";
import type { CountryLite } from "../../components/countriesIndex";

// interface Country {
//   id: string;
//   cca2: string;
//   name: string;
//   flag: string;
//   class: string;
//   path: string;
// }

interface RankingSlot {
  id: string; // stabilne: = cca2
  rank: number;
  country: CountryLite | null;
}

interface Note {
  id: string;
  countryCca2: string;
  noteText: string;
  createdAt: any;
}

// pomocniczo
// const getFlagUrl = (cca2: string) =>
//   `https://flagcdn.com/w40/${cca2.toLowerCase()}.png`;

// Generates a unique ID (simple implementation)
// const generateUniqueId = () => {
//   return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
// };
// const countryByCca2 = COUNTRY_BY_CCA2;
// // const mappedCountries: Country[] = useMemo(() => {
// //   return countriesData.countries.map((country: any) => ({
// //     ...country,
// //     cca2: country.id,
// //     flag: getFlagUrl(country.id),
// //     name: country.name || "Unknown",
// //     class: country.class || "Unknown",
// //     path: country.path || "Unknown",
// //   }));
// // }, []);
// const getCachedData = (key: string | null) => {
//   if (!key) return null;
//   const raw = storage.getString(key);
//   if (!raw) return null;
//   try {
//     return JSON.parse(raw);
//   } catch {
//     return null;
//   }
// };
export default function AccountScreen() {
  const { isDarkTheme } = useContext(ThemeContext);
  const theme = useTheme();
  const router = useRouter();
  const authUser = auth.currentUser;
  const nicknameFromStore = useAuthStore((s) => s.userProfile?.nickname);
  const menuRef = React.useRef<RightSlideMenuHandles>(null);
  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Cache keys
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
  // useEffect(() => {
  //   const loadInitialData = () => {
  //     // Ustawienie nazwy użytkownika i emaila
  //     const initialNickname =
  //       storeUserProfile?.nickname ||
  //       (cacheKeys?.nickname ? storage.getString(cacheKeys.nickname) : "") ||
  //       "";
  //     const initialEmail =
  //       authUser?.email ||
  //       (cacheKeys?.email ? storage.getString(cacheKeys.email) : "") ||
  //       "";
  //     setUserName(initialNickname);
  //     setUserEmail(initialEmail);

  //     // Ustawienie rankingu z pamięci podręcznej
  //     const cachedRanking = getCachedData(
  //       cacheKeys?.ranking ?? null
  //     ) as string[];
  //     if (cachedRanking) {
  //       const initialSlots = cachedRanking.map((cca2, index) => ({
  //         id: generateUniqueId(),
  //         rank: index + 1,
  //         country: mappedCountries.find((c) => c.cca2 === cca2) || null,
  //       }));
  //       setRankingSlots(initialSlots);
  //     }

  //     // Ustawienie notatek z pamięci podręcznej
  //     const cachedNotes = getCachedData(cacheKeys?.notes ?? null) as Note[];
  //     if (cachedNotes && Array.isArray(cachedNotes)) {
  //       setNotes(cachedNotes);
  //     }
  //   };

  //   loadInitialData();
  // }, [cacheKeys, storeUserProfile, authUser]);
  const [activeRankingItemId, setActiveRankingItemId] = useState<string | null>(
    null
  );

  const [userName, setUserName] = useState<string>(() => {
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

  const countryByCca2 = COUNTRY_BY_CCA2;

  // Ranking z cache (stabilne id = cca2, aby nie przemontowywać elementów po fetchu)
  const [rankingSlots, setRankingSlots] = useState<RankingSlot[]>(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return [];
    const raw = storage.getString(`user:${uid}:ranking`);
    if (!raw) return [];
    try {
      const arr: string[] = JSON.parse(raw);
      return arr.map((cca2, idx) => ({
        id: cca2,
        rank: idx + 1,
        country: countryByCca2[cca2] || null,
      }));
    } catch {
      return [];
    }
  });
  // Notatki z cache
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

  // Notatki + kraj, przygotowane poza renderem listy
  const notesWithCountry = useMemo(
    () =>
      notes.map((n) => ({
        ...n,
        country: countryByCca2[n.countryCca2] || null,
      })),
    [notes]
  );
  const openMailTo = useCallback(
    (subject: string) => {
      const nickname =
        userName ||
        useAuthStore.getState().userProfile?.nickname ||
        auth.currentUser?.uid ||
        "unknown";
      const mailto = `mailto:tripify.travelapp@gmail.com?subject=${encodeURIComponent(
        subject.replace("{nickname}", String(nickname))
      )}`;
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

  // Sync nazwy z profilem
  useEffect(() => {
    if (nicknameFromStore && nicknameFromStore !== userName) {
      setUserName(nicknameFromStore);
      cacheKeys && storage.set(cacheKeys.nickname, nicknameFromStore);
    }
  }, [nicknameFromStore, cacheKeys, userName]);

  useEffect(() => {
    if (authUser?.email) {
      setUserEmail(authUser.email);
      if (cacheKeys) storage.set(cacheKeys.email, authUser.email);
    }
  }, [authUser?.email, cacheKeys]);

  const fetchUserData = useCallback(async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.log("No current user.");
      return;
    }

    try {
      const userDocRef = doc(db, "users", currentUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        console.log("User document does not exist.");
        return;
      }

      const userData = userDoc.data();
      const rankingData: string[] = userData.ranking || [];
      const nickname: string | undefined = userData.nickname;
      const email: string | null | undefined = currentUser.email;

      const initialSlots: RankingSlot[] = rankingData.map((cca2, index) => ({
        id: cca2,
        rank: index + 1,
        country: countryByCca2[cca2] || null,
      }));

      // Pobierz notatki
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

      // Aktualizacje niepilne – nie blokują renderu
      startTransition(() => {
        if (nickname && nickname !== userName) {
          setUserName(nickname);
          cacheKeys && storage.set(cacheKeys.nickname, nickname);
        }
        if (email && email !== userEmail) {
          setUserEmail(email);
          cacheKeys && storage.set(cacheKeys.email, email);
        }

        const sameRanking =
          initialSlots.length === rankingSlots.length &&
          initialSlots.every((s, i) => s.id === rankingSlots[i]?.id);

        if (!sameRanking) {
          setRankingSlots(initialSlots);
          cacheKeys &&
            storage.set(cacheKeys.ranking, JSON.stringify(rankingData));
        }

        const sameNotes =
          notesList.length === notes.length &&
          notesList.every(
            (n, i) => n.id === notes[i]?.id && n.noteText === notes[i]?.noteText
          );

        if (!sameNotes) {
          setNotes(notesList);
          cacheKeys && storage.set(cacheKeys.notes, JSON.stringify(notesList));
        }
      });
    } catch (e) {
      console.log("fetchUserData error:", e);
    }
  }, [countryByCca2, cacheKeys]);

  // Odpal fetch PO animacji nawigacji -> płynniejsze przejście
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const task = InteractionManager.runAfterInteractions(() => {
        if (!cancelled) fetchUserData();
      });
      return () => {
        cancelled = true;
        // @ts-ignore (w RN i Hermes może nie być cancel)
        task?.cancel?.();
      };
    }, [fetchUserData])
  );

  // Prefetch flag PO animacji, żeby dekodowanie obrazków nie wpływało na przejście
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      const urls = new Set<string>();
      for (const s of rankingSlots)
        if (s.country) urls.add(getFlagUrl(s.country.cca2));
      for (const n of notes) urls.add(getFlagUrl(n.countryCca2));

      const sources = Array.from(urls).map((uri) => ({
        uri,
        priority: FastImage.priority.low,
      }));
      try {
        FastImage.preload(sources);
      } catch {}
    });
    return () => {
      // @ts-ignore
      task?.cancel?.();
    };
  }, [rankingSlots, notes]);

  const handleGoBack = () => {
    router.back();
  };

  const saveRankingTimer = React.useRef<NodeJS.Timeout | null>(null);

  const handleSaveRanking = useCallback(
    async (newRankingSlots: RankingSlot[]) => {
      const ranking = newRankingSlots
        .filter((slot) => slot.country)
        .map((slot) => slot.country!.cca2);

      const currentUser = auth.currentUser;
      if (!currentUser) return;

      try {
        await updateDoc(doc(db, "users", currentUser.uid), { ranking });
        storage.set(`user:${currentUser.uid}:ranking`, JSON.stringify(ranking));
      } catch (e) {
        console.log("save ranking error", e);
      }
    },
    []
  );
  const handleSaveRankingDebounced = useCallback(
    (slots: RankingSlot[]) => {
      if (saveRankingTimer.current) clearTimeout(saveRankingTimer.current);
      saveRankingTimer.current = setTimeout(
        () => handleSaveRanking(slots),
        350
      );
    },
    [handleSaveRanking]
  );
  const handleNavigateToNotes = () => {
    router.push("/notes");
  };

  const handleNotePress = (note: Note) => {
    setSelectedNote(note);
    setIsNotePreviewVisible(true);
  };

  const renderNoteText = useCallback(
    (text: string) => {
      const urlRegex =
        /(https?:\/\/[\w.-]+(?:\/[\w\-._~:/?#[\]@!$&'()*+,;=%]*)?)/gi;
      const parts = text.split(urlRegex);
      return parts.map((part, idx) => {
        if (urlRegex.test(part)) {
          urlRegex.lastIndex = 0;
          return (
            <Text
              key={`link-${idx}`}
              style={{ color: theme.colors.primary }}
              onPress={() =>
                Linking.openURL(part).catch(() =>
                  Alert.alert("Error", "Could not open the link.")
                )
              }
            >
              {part}
            </Text>
          );
        }
        return <Text key={`text-${idx}`}>{part}</Text>;
      });
    },
    [theme.colors.primary]
  );
  const handleRemoveFromRanking = useCallback(
    (id: string) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setRankingSlots((prev) => {
        const idx = prev.findIndex((s) => s.id === id);
        if (idx < 0) return prev;
        const next = prev.slice(0, idx).concat(prev.slice(idx + 1));
        const reRanked = next.map((it, i) => ({ ...it, rank: i + 1 }));
        // zapis po usunięciu (debounce)
        handleSaveRankingDebounced(reRanked);
        return reRanked;
      });
      setActiveRankingItemId(null);
    },
    [handleSaveRankingDebounced]
  );
  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace("/welcome");
    } catch (error) {
      console.error("Error logging out:", error);
      Alert.alert("Error", "Failed to log out. Please try again.");
    }
  };

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
      await user.delete();
      Alert.alert("Account deleted", "Your account has been removed.");
      router.replace("/welcome");
    } catch (err: any) {
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
      {
        key: "delete-account",
        label: "Delete your account",
        danger: true,
        icon: (
          <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
        ),
        onPress: triggerDeleteFlow,
      },
    ],
    [
      theme.colors.error,
      theme.colors.onBackground,
      triggerDeleteFlow,
      openMailTo,
    ]
  );
  const [menuMounted, setMenuMounted] = useState(false);
  useEffect(() => {
    const t = InteractionManager.runAfterInteractions(() =>
      setMenuMounted(true)
    );
    return () => t?.cancel?.();
  }, []);
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
            {/* Header */}
            <View
              style={[
                styles.header,
                {
                  paddingTop: height * 0.0238,
                  paddingBottom: 10,
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
                onPress={() => {
                  if (!menuMounted) setMenuMounted(true);
                  menuRef.current?.toggle();
                }}
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
                <FlatList
                  data={rankingSlots}
                  keyExtractor={(item) => item.id}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  removeClippedSubviews={false} // ważne
                  windowSize={7}
                  initialNumToRender={Math.min(20, rankingSlots.length)}
                  maxToRenderPerBatch={8}
                  extraData={{ activeRankingItemId, isDarkTheme }} // żeby przerysować itemy przy zmianie aktywnego
                  renderItem={({ item, index }) => (
                    <RankingItem
                      slot={item}
                      index={index}
                      onRemove={handleRemoveFromRanking}
                      isActive={activeRankingItemId === item.id}
                      setActiveRankingItemId={setActiveRankingItemId}
                      isDarkTheme={isDarkTheme}
                    />
                  )}
                />
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
            {notesWithCountry.length > 0 ? (
              <View
                style={[
                  styles.horizontalNotesContainer,
                  { backgroundColor: isDarkTheme ? "#333333" : "#f5f5f5" },
                ]}
              >
                <FlatList
                  data={notesWithCountry}
                  keyExtractor={(note) => note.id}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  removeClippedSubviews
                  windowSize={7}
                  initialNumToRender={Math.min(20, notesWithCountry.length)}
                  maxToRenderPerBatch={8}
                  renderItem={({ item: note }) => (
                    <TouchableOpacity
                      style={[
                        styles.noteItem,
                        {
                          backgroundColor: isDarkTheme ? "#333333" : "#f5f5f5",
                          borderColor: isDarkTheme ? "#555" : "#ccc",
                          borderWidth: 1,
                        },
                      ]}
                      onPress={() => handleNotePress(note)}
                    >
                      <View style={styles.noteHeader}>
                        {note.country && (
                          <FastImage
                            source={{
                              uri: getFlagUrl(note.country.cca2, 40),
                              priority: FastImage.priority.normal,
                            }}
                            style={styles.noteFlag}
                            resizeMode={FastImage.resizeMode.cover}
                          />
                        )}
                        <Text
                          style={[
                            styles.noteCountryName,
                            { color: theme.colors.onSurface },
                          ]}
                          numberOfLines={2}
                        >
                          {note.country ? note.country.name : "Unknown Country"}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.noteText,
                          { color: theme.colors.onSurface },
                        ]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {note.noteText}
                      </Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            ) : (
              // bez zmian

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
              <View style={styles.modalHeaderRow}>
                {selectedNote && (
                  <View style={styles.modalHeaderLeft}>
                    {selectedNote?.countryCca2 && (
                      <FastImage
                        source={{
                          uri: getFlagUrl(selectedNote.countryCca2, 40),
                          priority: FastImage.priority.normal,
                        }}
                        style={styles.modalFlag}
                        resizeMode={FastImage.resizeMode.cover}
                      />
                    )}
                    <Text
                      style={[
                        styles.modalHeader,
                        { color: theme.colors.onSurface },
                      ]}
                      numberOfLines={2}
                    >
                      {countryByCca2[selectedNote.countryCca2]?.name || ""}
                    </Text>
                  </View>
                )}
                <TouchableOpacity
                  onPress={() => setIsNotePreviewVisible(false)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name="close"
                    size={22}
                    color={theme.colors.onSurface}
                  />
                </TouchableOpacity>
              </View>

              <ScrollView
                contentContainerStyle={styles.modalScrollContent}
                showsVerticalScrollIndicator={false}
              >
                <Text
                  selectable
                  style={[
                    styles.modalNoteText,
                    { color: theme.colors.onSurface },
                  ]}
                >
                  {selectedNote ? renderNoteText(selectedNote.noteText) : ""}
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
  userPanel: {
    alignItems: "center",
    marginBottom: 30,
    marginTop: 0,
  },
  userName: {
    marginTop: -7,
    fontSize: 20,
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
    fontFamily: "PlusJakartaSans-Bold",
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  editButtonText: {
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
    marginRight: 8,
    height: 72,
    overflow: "hidden",
  },
  noteHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
    marginTop: -2,
  },
  noteFlag: {
    marginRight: 8,
    borderRadius: 4,
    width: 25,
    height: 15,
    marginTop: 0,
  },
  noteCountryName: {
    fontSize: 15,
    fontWeight: "600",
    flexShrink: 1,
    flexWrap: "wrap",
    maxWidth: "90%",
    fontFamily: "Figtree-SemiBold",
    marginTop: -1.2,
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
    paddingTop: 20,
    maxHeight: "97%",
    minHeight: 20,
    width: "95%",
  },
  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  modalHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    paddingRight: 8,
  },
  modalFlag: {
    marginRight: 8,
    borderRadius: 4,
    width: 30,
    height: 20,
  },
  modalHeader: {
    fontSize: 18,
    fontFamily: "Figtree-SemiBold",
  },
  modalNoteText: {
    fontSize: 16,
    fontFamily: "Figtree-Regular",
    marginBottom: -20,
  },
  modalScrollContent: {
    paddingBottom: 20,
  },
});
