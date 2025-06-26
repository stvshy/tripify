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

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const DEBOUNCE_DELAY = 300;
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
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    left: 2.7,
  },
  friendButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    left: 8,
  },
  sentButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
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

// --- Komponenty potomne (bez zmian) ---
interface FriendListItemProps {
  item: Friendship; // item to teraz { uid: string, nickname: string }
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
      {activeFriendId === item.uid && ( // ZMIANA: item.id -> item.uid
        <TouchableOpacity
          onPress={() => onRemoveFriend(item.uid)} // ZMIANA: item.id -> item.uid
          style={styles.removeButton}
        >
          <Ionicons name="close-circle" size={24} color="red" />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  )
);

interface SearchResultItemProps {
  item: User;
  theme: MD3Theme;
  isAlreadyFriend: boolean;
  hasSentRequest: boolean;
  onNavigateToProfile: (uid: string) => void;
  onAddFriend: (uid: string, nickname: string) => void;
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
    let buttonContent,
      isDisabled = false,
      specificButtonStyle,
      buttonBackgroundColor = theme.colors.primary;
    if (isAlreadyFriend) {
      specificButtonStyle = styles.friendButton;
      buttonBackgroundColor = theme.dark
        ? "rgba(171, 109, 197, 0.4)"
        : "rgba(143, 73, 179, 0.37)";
      buttonContent = (
        <Text style={{ color: "#fff", fontSize: 14, fontWeight: "500" }}>
          Friend
        </Text>
      );
      isDisabled = true;
    } else if (hasSentRequest) {
      specificButtonStyle = styles.sentButton;
      buttonBackgroundColor = theme.dark
        ? "rgba(128, 128, 128, 0.4)"
        : "rgba(204, 204, 204, 0.7)";
      buttonContent = <Text style={styles.sentButtonText}>Sent</Text>;
      isDisabled = true;
    } else {
      specificButtonStyle = styles.addCircle;
      buttonContent = <Ionicons name="add" size={17} color="#fff" />;
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
          onPress={() => onAddFriend(item.uid, item.nickname)}
          style={[
            specificButtonStyle,
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

// --- Główny komponent ---
export default function CommunityScreen() {
  const {
    friends,
    outgoingRequests,
    searchResults,
    isSearching,
    // listenForCommunityData,
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

  useFocusEffect(
    useCallback(() => {
      const { listenForCommunityData, cleanup } = useCommunityStore.getState();
      listenForCommunityData();
      return () => cleanup();
    }, [])
  );

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

  const navigateToProfile = useCallback(
    (uid: string) => router.push(`/profile/${uid}`),
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

  // if (isLoading) {
  //   return (
  //     <View
  //       style={[styles.loading, { backgroundColor: theme.colors.background }]}
  //     >
  //       <ActivityIndicator size="large" color={theme.colors.primary} />
  //     </View>
  //   );
  // }

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

              <View style={{ flex: 1 }}>
                {/* Friends List - hidden when isSearchMode is true */}
                <View
                  style={!isSearchMode ? styles.visibleList : styles.hiddenList}
                >
                  {friends.length === 0 && !searchText ? (
                    <View style={styles.empty}>
                      <Text style={{ color: theme.colors.onBackground }}>
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
                          onRemoveFriend={removeFriend}
                        />
                      )}
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
                          hasSentRequest={hasSentRequest(item.uid)}
                          onNavigateToProfile={navigateToProfile}
                          onAddFriend={sendFriendRequest}
                        />
                      )}
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
                      <Text style={{ color: theme.colors.onBackground }}>
                        No users found with that nickname.
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.empty}>
                      <Text style={{ color: theme.colors.onBackground }}>
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
    </View>
  );
}
