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
import { AntDesign, Ionicons } from '@expo/vector-icons';
import { LayoutAnimation, UIManager } from 'react-native';

// Włączenie LayoutAnimation dla Androida
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
  const [isSearchMode, setIsSearchMode] = useState(false); // Tryb: false - Znajomi, true - Wyszukiwanie
  const [activeFriendId, setActiveFriendId] = useState<string | null>(null); // Aktywny znajomy do usunięcia
  const router = useRouter();
  const theme = useTheme();

  const fetchFriendships = useCallback(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setLoading(false);
      return;
    }

    const userId = currentUser.uid;

    // Listener dla kolekcji friendships gdzie użytkownik jest jednym z dwóch
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
        // Usuń stare znajomości dotyczące tego użytkownika, aby uniknąć duplikatów
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
        // Usuń stare znajomości dotyczące tego użytkownika, aby uniknąć duplikatów
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
      Alert.alert('Błąd', 'Nie udało się wyszukać użytkowników.');
    }
  };

  const handleRemoveFriend = async (friendshipId: string) => {
    Alert.alert(
      'Potwierdzenie',
      'Czy na pewno chcesz usunąć tego znajomego?',
      [
        {
          text: 'Anuluj',
          style: 'cancel',
        },
        {
          text: 'Usuń',
          style: 'destructive',
          onPress: async () => {
            try {
              // Animacja usuwania
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              await deleteDoc(doc(db, 'friendships', friendshipId));
              Alert.alert('Sukces', 'Usunięto znajomego!');
              console.log(`Removed friendship document: ${friendshipId}`);
              setActiveFriendId(null);
            } catch (error) {
              console.error('Error removing friend:', error);
              Alert.alert('Błąd', 'Nie udało się usunąć znajomego.');
            }
          },
        },
      ]
    );
  };

  const handleAddFriend = async (friendUid: string) => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      Alert.alert('Błąd', 'Użytkownik nie jest zalogowany.');
      return;
    }

    const senderUid = currentUser.uid;
    const receiverUid = friendUid;

    try {
      // Sprawdź, czy już są znajomymi
      const friendshipQuery = query(
        collection(db, 'friendships'),
        where('userAUid', '==', senderUid),
        where('userBUid', '==', receiverUid),
        where('status', '==', 'accepted')
      );
      const friendshipSnapshot = await getDocs(friendshipQuery);
      if (!friendshipSnapshot.empty) {
        Alert.alert('Info', 'Ta osoba jest już Twoim znajomym.');
        return;
      }

      // Sprawdź, czy już wysłano zaproszenie wychodzące
      const outgoingSnapshot = await getDocs(query(
        collection(db, 'friendRequests'),
        where('senderUid', '==', senderUid),
        where('receiverUid', '==', receiverUid),
        where('status', '==', 'pending')
      ));
      if (!outgoingSnapshot.empty) {
        Alert.alert('Info', 'Zaproszenie zostało już wysłane do tej osoby.');
        return;
      }

      // Sprawdź, czy odbiorca już wysłał zaproszenie do nadawcy (mutual request)
      const incomingSnapshot = await getDocs(query(
        collection(db, 'friendRequests'),
        where('senderUid', '==', receiverUid),
        where('receiverUid', '==', senderUid),
        where('status', '==', 'pending')
      ));
      if (!incomingSnapshot.empty) {
        Alert.alert('Info', 'Ta osoba już wysłała Ci zaproszenie.');
        return;
      }

      const batch = writeBatch(db);

      // Dodaj zaproszenie do friendRequests (status: pending)
      const friendRequestRef = doc(collection(db, 'friendRequests'));
      batch.set(friendRequestRef, {
        senderUid: senderUid,
        receiverUid: receiverUid,
        status: 'pending',
        createdAt: serverTimestamp(),
      });

      await batch.commit();

      Alert.alert('Sukces', 'Wysłano zaproszenie do znajomych!');
    } catch (error) {
      console.error('Error sending friend request:', error);
      Alert.alert('Błąd', 'Nie udało się wysłać zaproszenia.');
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
            {/* Pasek wyszukiwania i przełącznik trybów */}
            <View style={styles.searchAndToggleContainer}>
              {/* Pole wyszukiwania */}
              <View style={styles.searchContainer}>
                <AntDesign
                  name="search1"
                  size={17}
                  color={theme.colors.onSurfaceVariant}
                  style={[styles.searchIcon]}
                />
                <TextInput
                  placeholder={isSearchMode ? "Wpisz nick znajomego..." : "Szukaj znajomych..."}
                  value={searchText}
                  onChangeText={setSearchText}
                  style={[
                    styles.input,
                    {
                      borderColor: theme.colors.outline,
                      color: theme.colors.onBackground,
                      marginLeft: 5,
                    },
                  ]}
                  placeholderTextColor={theme.colors.onSurfaceVariant}
                  autoCapitalize="none"
                />
                {searchText.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setSearchText('')}
                    style={styles.clearIcon}
                  >
                    <Ionicons name="close-circle" size={18} color={theme.colors.onSurfaceVariant} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Przełącznik trybów */}
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

            {/* Tryb Znajomych */}
            {!isSearchMode && (
              <>
                {/* Lista znajomych filtrowana */}
                {friendships.length === 0 ? (
                  <View style={styles.empty}>
                    <Text style={{ color: theme.colors.onBackground }}>Nie masz jeszcze żadnych znajomych.</Text>
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
                          <AntDesign name="smileo" size={24} color={theme.colors.primary} style={styles.friendIcon} />
                          <Text style={{ color: theme.colors.onBackground }}>{item.nickname}</Text>
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

            {/* Tryb Wyszukiwania */}
            {isSearchMode && (
              <>
                {/* Lista wyników wyszukiwania */}
                {searchResults.length === 0 && searchText.length >= 3 ? (
                  <View style={styles.noResults}>
                    <Text style={{ color: theme.colors.onBackground }}>Nie znaleziono użytkowników.</Text>
                  </View>
                ) : (
                  <FlatList
                    data={searchResults}
                    keyExtractor={(item) => item.uid}
                    renderItem={({ item }) => (
                      <View style={[styles.searchItem, { borderBottomColor: theme.colors.outline }]}>
                        <Text style={{ color: theme.colors.onBackground }}>{item.nickname}</Text>
                        <TouchableOpacity
                          onPress={() => handleAddFriend(item.uid)}
                          style={[
                            styles.addButton,
                            {
                              backgroundColor:
                                isAlreadyFriend(item.uid) ? '#ccc' : theme.colors.primary,
                            },
                          ]}
                          disabled={isAlreadyFriend(item.uid)}
                        >
                          <Text style={styles.addButtonText}>
                            {isAlreadyFriend(item.uid) ? 'Znajomy' : 'Dodaj'}
                          </Text>
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
    padding: 12,
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
    flex: 2.5, // 80% szerokości
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 25,
    paddingLeft: 40, // Odstęp na ikonę lupki
    paddingRight: 40, // Odstęp na krzyżyk
    height: 48,
    borderColor: '#ccc',
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
    fontSize: 16,
    color: '#000',
  },
  modeToggleContainer: {
    flex: 1.2, // 20% szerokości
    flexDirection: 'row',
    marginLeft: 5,
  },
  modeButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12.8,
  },
  friendItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    borderRadius: 15,
    marginBottom: 7,
  },
  friendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  friendIcon: {
    marginRight: 10,
  },
  removeButton: {
    padding: 4,
  },
  addButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
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
    borderBottomColor: '#ccc',
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
});
