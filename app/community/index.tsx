// app/community/index.tsx
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  ActivityIndicator, 
  TouchableOpacity, 
  TextInput, 
  Alert, 
  Animated, 
  TouchableWithoutFeedback, 
  SafeAreaView, 
  KeyboardAvoidingView, 
  Platform 
} from 'react-native';
import { auth, db } from '../config/firebaseConfig';
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
  limit
} from 'firebase/firestore';
import { useRouter } from 'expo-router';
import { useTheme } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { AntDesign, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LayoutAnimation, UIManager } from 'react-native';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface User {
  uid: string;
  nickname?: string;
}

interface Friendship {
  id: string;
  userAUid: string;
  userBUid: string;
  nickname: string;
}

export default function CommunityScreen() {
  const [loading, setLoading] = useState(true);
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearchMode, setIsSearchMode] = useState(false); // Mode: false - Friends, true - Search
  const [activeFriendId, setActiveFriendId] = useState<string | null>(null); // Active friend to remove
  const [isFocused, setIsFocused] = useState(false); // State to track focus
  const [sentRequests, setSentRequests] = useState<string[]>([]); // Nowy stan dla wysłanych zaproszeń
  const router = useRouter();
  const theme = useTheme();

  const fetchFriendships = useCallback(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setLoading(false);
      return;
    }

    const userId = currentUser.uid;

    // Listener for friendships where the user is one of the two
    const friendshipsQueryA = query(
      collection(db, 'friendships'),
      where('userAUid', '==', userId),
      where('status', '==', 'accepted')
    );

    const friendshipsQueryB = query(
      collection(db, 'friendships'),
      where('userBUid', '==', userId),
      where('status', '==', 'accepted')
    );

    const unsubscribeA = onSnapshot(friendshipsQueryA, async (snapshot) => {
      const fetchedFriendships: Friendship[] = [];
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        const friendUid = data.userBUid;
        const friendDoc = await getDoc(doc(db, 'users', friendUid));
        if (friendDoc.exists()) {
          const friendData = friendDoc.data();
          fetchedFriendships.push({
            id: docSnap.id,
            userAUid: data.userAUid,
            userBUid: data.userBUid,
            nickname: friendData.nickname || 'Unknown',
          });
        }
      }
      setFriendships((prev) => {
        // Remove old friendships to avoid duplicates
        const filtered = prev.filter(
          (f) => f.userAUid !== userId && f.userBUid !== userId
        );
        return [...filtered, ...fetchedFriendships];
      });
    });

    const unsubscribeB = onSnapshot(friendshipsQueryB, async (snapshot) => {
      const fetchedFriendships: Friendship[] = [];
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        const friendUid = data.userAUid;
        const friendDoc = await getDoc(doc(db, 'users', friendUid));
        if (friendDoc.exists()) {
          const friendData = friendDoc.data();
          fetchedFriendships.push({
            id: docSnap.id,
            userAUid: data.userAUid,
            userBUid: data.userBUid,
            nickname: friendData.nickname || 'Unknown',
          });
        }
      }
      setFriendships((prev) => {
        // Remove old friendships to avoid duplicates
        const filtered = prev.filter(
          (f) => f.userAUid !== userId && f.userBUid !== userId
        );
        return [...filtered, ...fetchedFriendships];
      });
    });

    setLoading(false);

    return () => {
      unsubscribeA();
      unsubscribeB();
    };
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      const unsubscribe = fetchFriendships();
      return () => unsubscribe && unsubscribe();
    }, [fetchFriendships])
  );

  useEffect(() => {
    if (isSearchMode) {
      handleSearch(searchText);
    } else {
      setSearchResults([]);
    }
  }, [searchText, isSearchMode]);

  const handleSearch = async (text: string) => {
    if (text.length < 3) {
      setSearchResults([]);
      return;
    }

    try {
      const usersRef = collection(db, 'users');
      const q = query(
        usersRef,
        where('nickname', '>=', text),
        where('nickname', '<=', text + '\uf8ff'),
        limit(10)
      );
      const snapshot = await getDocs(q);
      const foundUsers: User[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.nickname && docSnap.id !== auth.currentUser?.uid) {
          foundUsers.push({ uid: docSnap.id, nickname: data.nickname });
        }
      });
      setSearchResults(foundUsers);
      console.log(`Found ${foundUsers.length} users matching "${text}".`);
    } catch (error) {
      console.error('Error searching users:', error);
      Alert.alert('Error', 'Failed to search users.');
    }
  };

  const handleRemoveFriend = async (friendshipId: string) => {
    Alert.alert(
      'Confirmation',
      'Are you sure you want to remove this friend?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              // Animation for removal
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              await deleteDoc(doc(db, 'friendships', friendshipId));
              Alert.alert('Success', 'Friend removed!');
              console.log(`Removed friendship document: ${friendshipId}`);
              setActiveFriendId(null);
            } catch (error) {
              console.error('Error removing friend:', error);
              Alert.alert('Error', 'Failed to remove friend.');
            }
          },
        },
      ]
    );
  };

  const handleAddFriend = async (friendUid: string) => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      Alert.alert('Error', 'User is not logged in.');
      return;
    }

    const senderUid = currentUser.uid;
    const receiverUid = friendUid;

    try {
      // Check if already friends
      const friendshipQuery = query(
        collection(db, 'friendships'),
        where('userAUid', '==', senderUid),
        where('userBUid', '==', receiverUid),
        where('status', '==', 'accepted')
      );
      const friendshipSnapshot = await getDocs(friendshipQuery);
      if (!friendshipSnapshot.empty) {
        Alert.alert('Info', 'This person is already your friend.');
        return;
      }

      // Check if an outgoing request already exists
      const outgoingSnapshot = await getDocs(query(
        collection(db, 'friendRequests'),
        where('senderUid', '==', senderUid),
        where('receiverUid', '==', receiverUid),
        where('status', '==', 'pending')
      ));
      if (!outgoingSnapshot.empty) {
        Alert.alert('Info', 'A friend request has already been sent to this person.');
        return;
      }

      // Check if the receiver has already sent a friend request to the sender
      const incomingSnapshot = await getDocs(query(
        collection(db, 'friendRequests'),
        where('senderUid', '==', receiverUid),
        where('receiverUid', '==', senderUid),
        where('status', '==', 'pending')
      ));
      if (!incomingSnapshot.empty) {
        Alert.alert('Info', 'This person has already sent you a friend request.');
        return;
      }

      const batch = writeBatch(db);

      // Add a friend request (status: pending)
      const friendRequestRef = doc(collection(db, 'friendRequests'));
      batch.set(friendRequestRef, {
        senderUid: senderUid,
        receiverUid: receiverUid,
        status: 'pending',
        createdAt: serverTimestamp(),
      });

      await batch.commit();

      Alert.alert('Success', 'Friend request sent!');

      // Aktualizacja stanu wysłanych zaproszeń
      setSentRequests(prev => [...prev, friendUid]);
    } catch (error) {
      console.error('Error sending friend request:', error);
      Alert.alert('Error', 'Failed to send friend request.');
    }
  };

  const toggleMode = () => {
    setIsSearchMode((prev) => !prev);
    setSearchText('');
    setSearchResults([]);
    setActiveFriendId(null);
  };

  const isAlreadyFriend = (uid: string): boolean => {
    return friendships.some(
      (friend) => friend.userAUid === uid || friend.userBUid === uid
    );
  };

  const hasSentRequest = (uid: string): boolean => {
    return sentRequests.includes(uid);
  };

  // Pobranie wysłanych zaproszeń podczas montowania komponentu
  useEffect(() => {
    const fetchSentRequests = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) return;
      try {
        const q = query(
          collection(db, 'friendRequests'),
          where('senderUid', '==', currentUser.uid),
          where('status', '==', 'pending')
        );
        const snapshot = await getDocs(q);
        const sent = snapshot.docs.map(doc => doc.data().receiverUid);
        setSentRequests(sent);
      } catch (error) {
        console.error('Error fetching sent friend requests:', error);
      }
    };

    fetchSentRequests();
  }, []);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={() => setActiveFriendId(null)}>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardAvoidingView}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 20}
        >
          <View style={{ flex: 1 }}>
            {/* Search bar and mode toggle */}
            <View style={styles.searchAndToggleContainer}>
              {/* Search field */}
              <View style={[
                styles.searchContainer,
                { borderColor: isFocused ? theme.colors.primary : theme.colors.outline }
              ]}>
                <AntDesign
                  name="search1"
                  size={17}
                  color={theme.colors.onSurfaceVariant}
                  style={styles.searchIcon}
                />
                <TextInput
                  placeholder={isSearchMode ? "Enter friend's nickname..." : "Search friends..."}
                  value={searchText}
                  onChangeText={setSearchText}
                  keyboardType="default"
                  style={[
                    styles.input,
                    {
                      color: theme.colors.onBackground,
                      opacity: 0.97,
                      marginLeft: 4 
                    },
                  ]}
                  placeholderTextColor={theme.colors.onSurfaceVariant}
                  autoCapitalize="none"
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                />
                {searchText.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setSearchText('')}
                    style={styles.clearIcon}
                  >
                    <MaterialIcons name="close" size={18} color={theme.colors.onSurfaceVariant} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Mode toggle */}
              <View style={styles.modeToggleContainer}>
                <TouchableOpacity
                  style={[
                    styles.modeButton,
                    {
                      backgroundColor: isSearchMode ? theme.colors.surfaceVariant : theme.colors.primary,
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
                    color={isSearchMode ? theme.colors.onSurfaceVariant : '#fff'}
                    style={{ marginLeft: 3 }}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.modeButton,
                    {
                      backgroundColor: isSearchMode ? theme.colors.primary : theme.colors.surfaceVariant,
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
                    color={!isSearchMode ? theme.colors.onSurfaceVariant : '#fff'}
                    style={{ marginRight: 3 }}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Friends Mode */}
            {!isSearchMode && (
              <>
                {/* Filtered friends list */}
                {friendships.length === 0 ? (
                  <View style={styles.empty}>
                    <Text style={{ color: theme.colors.onBackground }}>You have no friends yet.</Text>
                  </View>
                ) : (
                  <FlatList
                    data={friendships.filter((friend) =>
                      friend.nickname.toLowerCase().includes(searchText.toLowerCase())
                    )}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        onLongPress={() => setActiveFriendId(item.id)}
                        style={[
                          styles.friendItem,
                          {
                            backgroundColor: activeFriendId === item.id 
                              ? theme.colors.surfaceVariant 
                              : theme.colors.surface,
                            borderBottomColor: theme.colors.outline,
                          },
                        ]}
                      >
                        <View style={styles.friendInfo}>
                          <AntDesign name="smileo" size={18.3} color={theme.colors.primary} style={styles.friendIcon} />
                          <Text style={{ color: theme.colors.onBackground, fontSize:15, marginLeft: 1.4 }}>{item.nickname}</Text>
                        </View>
                        {activeFriendId === item.id && (
                          <TouchableOpacity
                            onPress={() => handleRemoveFriend(item.id)}
                            style={styles.removeButton}
                          >
                            <Ionicons name="close-circle" size={24} color="red" />
                          </TouchableOpacity>
                        )}
                      </TouchableOpacity>
                    )}
                  />
                )}
              </>
            )}

            {/* Search Mode */}
            {isSearchMode && (
              <>
                {/* Search results list */}
                {searchResults.length === 0 && searchText.length >= 3 ? (
                  <View style={styles.noResults}>
                    <Text style={{ color: theme.colors.onBackground }}>No users found.</Text>
                  </View>
                ) : (
                  <FlatList
                    data={searchResults}
                    keyExtractor={(item) => item.uid}
                    renderItem={({ item }) => (
                      <View style={[styles.searchItem, { borderBottomColor: theme.colors.outline }]}>
                        <Text style={{ color: theme.colors.onBackground, fontSize: 15}}>{item.nickname}</Text>
                        <TouchableOpacity
                          onPress={() => handleAddFriend(item.uid)}
                          style={[
                            hasSentRequest(item.uid) ? styles.sentButton : styles.addCircle,
                            {
                              backgroundColor: hasSentRequest(item.uid)
                                ? '#ccc' // Szary przycisk dla „Sent”
                                : theme.colors.primary, // Fioletowe kółko dla „Add”
                            },
                          ]}
                          disabled={isAlreadyFriend(item.uid) || hasSentRequest(item.uid)}
                        >
                          {isAlreadyFriend(item.uid) ? (
                            <Text style={styles.addButtonText}>Friend</Text>
                          ) : hasSentRequest(item.uid) ? (
                            <Text style={styles.sentButtonText}>Sent</Text>
                          ) : (
                            <Ionicons name="add" size={17} color="#fff" />
                          )}
                        </TouchableOpacity>
                      </View>
                    )}
                  />
                )}
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  searchContainer: {
    flex: 2.5, // 80% width
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 25,
    paddingLeft: 40, // Padding for search icon
    paddingRight: 40, // Padding for clear icon
    height: 45,
  },
  searchIcon: {
    position: 'absolute',
    left: 16,
  },
  clearIcon: {
    position: 'absolute',
    right: 16,
  },
  input: {
    flex: 1,
    fontSize: 13,
  },
  modeToggleContainer: {
    flex: 1.1 , // 20% width
    flexDirection: 'row',
    marginLeft: 5,
  },
  modeButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  friendItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 11,
    borderBottomWidth: 1,
    borderRadius: 15,
    marginBottom: 7,
  },
  friendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4.8,
  },
  friendIcon: {
    marginRight: 10,
  },
  removeButton: {
    padding: 4,
  },
  addCircle: {
    width: 27, // Szerokość kółka
    height: 27, // Wysokość kółka
    borderRadius: 20, // Zaokrąglenie, aby utworzyć kółko
    alignItems: 'center', // Wyśrodkowanie ikony w poziomie
    justifyContent: 'center', // Wyśrodkowanie ikony w pionie
    elevation: 2, // Dodanie cienia (opcjonalnie)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    marginRight: 10, // Opcjonalny margines
  },
  
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  searchItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    marginLeft: 4,
  },
  noResults: {
    alignItems: 'center',
    marginTop: 20,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sentButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    left:2.7
  },
  sentButtonText: {
    color: '#fff', // Kolor tekstu dla „Sent”
    // fontWeight: 'bold',
    fontSize: 14, // Rozmiar tekstu
  },
});
