import React, {
  useEffect,
  useState,
  useCallback,
  useRef,
  memo,
  useMemo,
} from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  TouchableWithoutFeedback,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  TouchableNativeFeedback,
  Pressable,
  Keyboard,
} from "react-native";
import { useRouter } from "expo-router";
import { useTheme, MD3Theme } from "react-native-paper";
import { useFocusEffect } from "@react-navigation/native";
import { AntDesign, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { LayoutAnimation, UIManager } from "react-native";
// ZMIANA: Importujemy Friendship, bo jest potrzebny do typowania
import {
  useCommunityStore,
  User,
  Friendship,
  OutgoingRequest,
} from "../store/communityStore";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../config/firebaseConfig";
import ConfirmationModal from "../../components/ConfirmationModal";
import { moderateScale, ScaledSheet } from "react-native-size-matters";
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
const ADD_CIRCLE_DIAMETER = moderateScale(26);
const ADD_CIRCLE_BORDER_RADIUS = moderateScale(20);

// Grubość "sztucznego" obramowania, również skalowalna
const BORDER_THICKNESS = moderateScale(2.94);
const DEBOUNCE_DELAY = 190;
const styles = ScaledSheet.create({
  container: {
    flex: 1,
    padding: "10@ms",
    paddingTop: "4@mvs",
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  searchAndToggleContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "4@mvs",
  },
  visibleList: {
    flex: 1,
  },
  hiddenList: {
    flex: 1,
    display: "none",
  },
  searchContainer: {
    flex: 2.5,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: "25@ms",
    paddingLeft: "40@s",
    paddingRight: "40@s",
    height: "45@mvs0.5",
  },
  searchIcon: {
    position: "absolute",
    left: "16@s",
  },
  clearIcon: {
    position: "absolute",
    right: "14@s",
  },
  input: {
    flex: 1,
    fontSize: "14.19@ms0.4",
    marginLeft: "3.8@s",
    fontFamily: "Figtree-Regular",
  },
  modeToggleContainer: {
    width: "78@s",
    flexDirection: "row",
    marginLeft: "5@s",
  },
  modeButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: "12@mvs",
  },
  friendItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: "14.4@mvs",
    paddingHorizontal: "11@s",
    borderBottomWidth: 1, // Zostawiamy 1, skalowanie może go zepsuć
    borderRadius: "15@ms",
    // marginBottom: "7@mvs",
  },
  friendInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: "4.8@s",
  },
  friendIcon: {
    marginRight: "10@s",
  },
  removeButton: {
    // padding: "4@ms",
  },
  addCircle: {
    width: ADD_CIRCLE_DIAMETER, // <--- Użyj stałej
    height: ADD_CIRCLE_DIAMETER, // <--- Użyj stałej
    borderRadius: ADD_CIRCLE_BORDER_RADIUS, // <--- Użyj stałej
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    marginRight: "10@s",
  },
  sentButton: {
    paddingVertical: "4.6@mvs",
    paddingHorizontal: "10@s",
    borderRadius: "20@ms",
    alignItems: "center",
    justifyContent: "center",
    left: "0.5@s",
  },
  friendButton: {
    paddingVertical: "5.6@mvs",
    paddingHorizontal: "11@s",
    borderRadius: "20@ms",
    alignItems: "center",
    justifyContent: "center",
    left: "6@s",
  },
  sentButtonText: {
    color: "#fff",
    fontSize: "14@ms0.4",
    fontWeight: "500",
    fontFamily: "Figtree-Regular",
    transform: [{ translateY: moderateScale(-0.7, 0.5) }],
  },
  searchItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: "10.5@mvs",
    paddingHorizontal: "16@s",
    borderBottomWidth: 1, // Zostawiamy 1
    marginLeft: "4@s",
  },
  noResults: {
    alignItems: "center",
    marginTop: "20@mvs",
  },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: "25@mvs",
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

// --- Komponenty potomne (bez zmian) ---
interface FriendListItemProps {
  item: Friendship; // item to teraz { uid: string, nickname: string }
  activeFriendId: string | null;
  theme: MD3Theme;
  onNavigateToProfile: (uid: string) => void;
  onSetActiveFriendId: (id: string | null) => void;
  onRemoveFriend: (friend: Friendship) => void;
}
const FriendListItem: React.FC<FriendListItemProps> = memo(
  ({
    item,
    activeFriendId,
    theme,
    onNavigateToProfile,
    onSetActiveFriendId,
    onRemoveFriend,
  }) => (
    <TouchableOpacity
      onPress={() => onNavigateToProfile(item.uid)} // ZMIANA: item.friendUid -> item.uid
      onLongPress={() => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        onSetActiveFriendId(item.uid); // ZMIANA: item.id -> item.uid
      }}
      style={[
        styles.friendItem,
        {
          backgroundColor:
            activeFriendId === item.uid // ZMIANA: item.id -> item.uid
              ? theme.colors.surfaceVariant
              : theme.colors.surface,
          borderBottomColor: theme.colors.outline,
        },
      ]}
    >
      <View style={styles.friendInfo}>
        <AntDesign
          name="smileo"
          size={moderateScale(17.8, 0.5)}
          color={theme.colors.primary}
          style={styles.friendIcon}
        />
        <Text
          style={{
            color: theme.colors.onBackground,
            fontSize: moderateScale(15.4, 0.4), // <--- ZMIANA
            marginLeft: moderateScale(1), // <--- ZMIANA
            fontFamily: "Figtree-Regular",
            marginTop: moderateScale(-2.6), // <--- ZMIANA
          }}
        >
          {item.nickname}
        </Text>
      </View>
      {activeFriendId === item.uid && ( // ZMIANA: item.id -> item.uid
        <TouchableOpacity
          onPress={() => onRemoveFriend(item)}
          style={styles.removeButton}
        >
          <Ionicons
            name="close-circle"
            size={moderateScale(22, 0.5)}
            color={theme.colors.primary}
          />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  )
);

interface SearchResultItemProps {
  item: User;
  theme: MD3Theme;
  isAlreadyFriend: boolean;
  hasSentRequestInitial: boolean;
  hasReceivedRequest: boolean;
  onNavigateToProfile: (uid: string) => void;
  onAddFriend: (uid: string, nickname: string) => void;
}
const SearchResultItem: React.FC<SearchResultItemProps> = memo(
  ({
    item,
    theme,
    isAlreadyFriend,
    hasSentRequestInitial,
    hasReceivedRequest,
    onNavigateToProfile,
    onAddFriend,
  }) => {
    const [requestSent, setRequestSent] = useState(hasSentRequestInitial);
    useEffect(() => {
      setRequestSent(hasSentRequestInitial);
    }, [hasSentRequestInitial]);

    const handlePressAdd = () => {
      onAddFriend(item.uid, item.nickname as string);
      setRequestSent(true);
    };

    // Funkcja pomocnicza do renderowania przycisku
    const renderButton = () => {
      // === PRZYPADEK 1: OTRZYMANO ZAPROSZENIE ===
      if (hasReceivedRequest) {
        return (
          <Pressable
            onPress={() => onNavigateToProfile(item.uid)}
            style={({ pressed }) => ({
              opacity: pressed ? 0.6 : 1,
            })}
          >
            {/* Zewnętrzny View - obramowanie */}
            <View
              style={[
                // POPRAWKA: Używamy tablicy stylów
                styles.addCircle,
                {
                  backgroundColor: theme.colors.primary,
                  justifyContent: "center",
                  alignItems: "center",
                },
              ]}
            >
              {/* Wewnętrzny View - tło przycisku */}
              <View
                style={{
                  // POPRAWKA: Używamy stałych do obliczeń
                  width: ADD_CIRCLE_DIAMETER - BORDER_THICKNESS,
                  height: ADD_CIRCLE_DIAMETER - BORDER_THICKNESS,
                  borderRadius: ADD_CIRCLE_BORDER_RADIUS, // Można by to też obliczyć, ale ta wartość jest OK
                  backgroundColor: theme.colors.background,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Ionicons
                  name="arrow-undo"
                  size={moderateScale(15, 0.5)}
                  color={theme.colors.primary}
                />
              </View>
            </View>
          </Pressable>
        );
      }
      // === POZOSTAŁE PRZYPADKI (stara, działająca logika) ===
      let buttonContent;
      let isDisabled = false;
      let specificButtonStyle;
      let buttonBackgroundColor;
      let onPressAction = handlePressAdd;

      if (isAlreadyFriend) {
        specificButtonStyle = styles.friendButton;
        buttonBackgroundColor = theme.dark
          ? "rgba(171, 109, 197, 0.4)"
          : "rgba(143, 73, 179, 0.37)";
        buttonContent = (
          <Text
            style={{
              color: "#fff",
              fontSize: moderateScale(14, 0.4),
              fontWeight: "500",
              fontFamily: "Figtree-Regular",
              transform: [{ translateY: moderateScale(-0.7, 0.5) }],
            }}
          >
            Friend
          </Text>
        );
        isDisabled = true;
        onPressAction = () => onNavigateToProfile(item.uid);
      } else if (requestSent) {
        specificButtonStyle = styles.sentButton;
        buttonBackgroundColor = theme.dark
          ? "rgba(128, 128, 128, 0.4)"
          : "rgba(204, 204, 204, 0.7)";
        buttonContent = <Text style={styles.sentButtonText}>Sent</Text>;
        isDisabled = true;
        onPressAction = () => onNavigateToProfile(item.uid);
      } else {
        specificButtonStyle = styles.addCircle;
        buttonBackgroundColor = theme.colors.primary;
        buttonContent = (
          <Ionicons name="add" size={moderateScale(17, 0.5)} color="#fff" />
        );
      }

      return (
        <TouchableOpacity
          onPress={onPressAction}
          style={[
            specificButtonStyle,
            { backgroundColor: buttonBackgroundColor },
          ]}
          disabled={isDisabled}
        >
          {buttonContent}
        </TouchableOpacity>
      );
    };

    return (
      <TouchableOpacity
        onPress={() => onNavigateToProfile(item.uid)}
        style={[styles.searchItem, { borderBottomColor: theme.colors.outline }]}
        activeOpacity={0.8} // Dajmy jakiś feedback dla całego wiersza
      >
        <Text
          style={{
            color: theme.colors.onBackground,
            fontSize: moderateScale(15.8, 0.4),
            fontFamily: "Figtree-Regular",
          }}
        >
          {item.nickname}
        </Text>
        {renderButton()}
      </TouchableOpacity>
    );
  }
);
// --- Główny komponent ---
export default function CommunityScreen() {
  const {
    friends,
    outgoingRequests,
    searchResults,
    isSearching,
    incomingRequests,
    // cleanup,
    searchUsers,
    sendFriendRequest,
    removeFriend,
  } = useCommunityStore();
  const [searchText, setSearchText] = useState("");
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [activeFriendId, setActiveFriendId] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [searchAttempted, setSearchAttempted] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();
  const theme = useTheme();
  const inputRef = useRef<TextInput>(null);
  const [removalModal, setRemovalModal] = useState<{
    visible: boolean;
    friend: Friendship | null;
  }>({
    visible: false,
    friend: null,
  });

  // ZMIANA: Dodaj ten hook do obsługi chowania klawiatury
  useEffect(() => {
    const keyboardDidHideListener = Keyboard.addListener(
      "keyboardDidHide",
      () => {
        // Gdy klawiatura się chowa (np. przez przycisk "wstecz"),
        // programowo usuwamy focus z inputu.
        inputRef.current?.blur();
      }
    );

    // Funkcja czyszcząca, która usuwa listener, gdy komponent jest odmontowywany
    return () => {
      keyboardDidHideListener.remove();
    };
  }, []); // Pusta tablica zależności sprawia, że listener jest dodawany tylko raz

  const filteredFriends = useMemo(() => {
    if (!searchText) {
      return friends; // Jeśli nie ma tekstu, zwróć całą listę
    }
    return friends.filter((friend: Friendship) =>
      friend && friend.nickname && typeof friend.nickname === "string"
        ? friend.nickname.toLowerCase().includes(searchText.toLowerCase())
        : false
    );
  }, [friends, searchText]);

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    // Jeśli tekst jest za krótki, nie robimy nic i resetujemy flagę
    if (searchText.trim().length < 3) {
      setSearchAttempted(false);
      // Opcjonalnie: czyść wyniki, jeśli chcesz, aby zniknęły od razu
      if (isSearchMode) searchUsers("");
      return;
    }

    searchTimeoutRef.current = setTimeout(() => {
      if (isSearchMode) {
        searchUsers(searchText).then(() => {
          // ZMIANA 2: Ustawiamy flagę, że wyszukiwanie się odbyło
          setSearchAttempted(true);
        });
      }
    }, DEBOUNCE_DELAY);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchText, isSearchMode, searchUsers]);

  // W welcome/index.tsx - zmodyfikuj navigateToProfile
  const navigateToProfile = useCallback(
    async (uid: string) => {
      // Prefetch danych użytkownika przed nawigacją
      const userRef = doc(db, "users", uid);
      getDoc(userRef); // Rozpocznij pobieranie, ale nie czekaj

      router.push(`/profile/${uid}`);
    },
    [router]
  );
  const toggleMode = useCallback(() => {
    setIsSearchMode((prev) => !prev);
    setSearchText("");
    searchUsers("");
    setActiveFriendId(null);
    setSearchAttempted(false);
  }, [searchUsers]);

  const isAlreadyFriend = useCallback(
    (uid: string) => friends.some((friend) => friend.uid === uid), // ZMIANA: friend.friendUid -> friend.uid
    [friends]
  );

  const hasSentRequest = useCallback(
    (uid: string) => outgoingRequests.some((req) => req.receiverUid === uid),
    [outgoingRequests]
  );
  const hasReceivedRequest = useCallback(
    (uid: string) => incomingRequests.some((req) => req.senderUid === uid),
    [incomingRequests]
  );
  const handleOpenRemoveModal = useCallback((friendToRemov: Friendship) => {
    setRemovalModal({ visible: true, friend: friendToRemov });
  }, []);

  // ZMIANA: Handler zamykający modal
  const handleCloseRemoveModal = () => {
    setRemovalModal({ visible: false, friend: null });
  };

  // ZMIANA: Handler potwierdzający usunięcie, który wywołuje akcję ze store
  const handleConfirmRemove = () => {
    if (removalModal.friend) {
      removeFriend(removalModal.friend.uid);
    }
    handleCloseRemoveModal(); // Zamknij modal po akcji
  };

  return (
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
                    size={moderateScale(17.8, 0.5)}
                    color={theme.colors.onSurfaceVariant}
                    style={styles.searchIcon}
                  />
                  <TextInput
                    ref={inputRef}
                    placeholder={
                      isSearchMode
                        ? "Enter user's nickname..."
                        : "Search friends..."
                    }
                    value={searchText}
                    onChangeText={setSearchText}
                    style={[styles.input, { color: theme.colors.onBackground }]}
                    placeholderTextColor={theme.colors.onSurfaceVariant}
                    autoCapitalize="none"
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                  />

                  {searchText.length > 0 && (
                    <TouchableOpacity
                      onPress={() => setSearchText("")}
                      style={styles.clearIcon}
                    >
                      <MaterialIcons
                        name="close"
                        size={moderateScale(18, 0.5)}
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
                      size={moderateScale(19, 0.5)}
                      color={
                        isSearchMode ? theme.colors.onSurfaceVariant : "#fff"
                      }
                      style={{ marginLeft: moderateScale(3) }}
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
                      size={moderateScale(19, 0.5)}
                      color={
                        !isSearchMode ? theme.colors.onSurfaceVariant : "#fff"
                      }
                      style={{ marginRight: moderateScale(3) }}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={{ flex: 1 }}>
                {/* Friends List - hidden when isSearchMode is true */}
                <View
                  style={!isSearchMode ? styles.visibleList : styles.hiddenList}
                >
                  {friends.length === 0 && !searchText ? (
                    <View style={styles.empty}>
                      <Text
                        style={{
                          color: theme.colors.onBackground,
                          fontFamily: "Figtree-Regular",
                        }}
                      >
                        You have no friends yet.
                      </Text>
                    </View>
                  ) : (
                    <FlatList
                      data={filteredFriends}
                      keyExtractor={(item) => item.uid}
                      renderItem={({ item }) => (
                        <FriendListItem
                          item={item}
                          activeFriendId={activeFriendId}
                          theme={theme}
                          onNavigateToProfile={navigateToProfile}
                          onSetActiveFriendId={setActiveFriendId}
                          onRemoveFriend={handleOpenRemoveModal}
                        />
                      )}
                      extraData={friends}
                    />
                  )}
                </View>

                {/* Search Results List - hidden when isSearchMode is false */}
                <View
                  style={isSearchMode ? styles.visibleList : styles.hiddenList}
                >
                  {isSearching ? (
                    <View style={styles.loading}>
                      <ActivityIndicator
                        size="large"
                        color={theme.colors.primary}
                      />
                    </View>
                  ) : searchResults.length > 0 ? (
                    <FlatList
                      data={searchResults}
                      keyExtractor={(item) => item.uid}
                      renderItem={({ item }) => (
                        <SearchResultItem
                          item={item}
                          theme={theme}
                          isAlreadyFriend={isAlreadyFriend(item.uid)}
                          hasSentRequestInitial={hasSentRequest(item.uid)}
                          hasReceivedRequest={hasReceivedRequest(item.uid)}
                          onNavigateToProfile={navigateToProfile}
                          onAddFriend={sendFriendRequest}
                        />
                      )}
                      extraData={{
                        friends,
                        outgoingRequests,
                        incomingRequests,
                      }}
                      initialNumToRender={11}
                      maxToRenderPerBatch={11}
                      windowSize={11}
                      removeClippedSubviews={true}
                      getItemLayout={(data, index) => ({
                        length: 60,
                        offset: 60 * index,
                        index,
                      })}
                    />
                  ) : searchAttempted && searchText.trim().length >= 3 ? (
                    <View style={styles.noResults}>
                      <Text
                        style={{
                          color: theme.colors.onBackground,
                          fontFamily: "Figtree-Regular",
                        }}
                      >
                        No users found with this nickname.
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.empty}>
                      <Text
                        style={{
                          color: theme.colors.onBackground,
                          fontFamily: "Figtree-Regular",
                          fontSize: moderateScale(14, 0.4),
                        }}
                      >
                        Enter at least 3 characters to search for users.
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </TouchableWithoutFeedback>
      <ConfirmationModal
        visible={removalModal.visible}
        title="Remove Friend"
        message={`Are you sure you want to remove ${
          removalModal.friend?.nickname ?? "this user"
        } from your friends?`}
        onCancel={handleCloseRemoveModal}
        onConfirm={handleConfirmRemove}
        confirmText="Remove"
        isDestructive={true} // `true` sprawi, że przycisk będzie "primary" (czerwony)
      />
    </View>
  );
}
