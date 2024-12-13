// app/community/index.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, TextInput, Alert } from 'react-native';
import { auth, db } from '../config/firebaseConfig';
import { doc, getDoc, collection, query, where, onSnapshot, deleteDoc, getDocs, writeBatch, serverTimestamp, limit } from 'firebase/firestore';
import { useRouter } from 'expo-router';
import { useTheme } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { AntDesign } from '@expo/vector-icons';



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

// app/community/index.tsx
export default function CommunityScreen() {
  const [loading, setLoading] = useState(true);
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearchMode, setIsSearchMode] = useState(false); // Tryb: false - Znajomi, true - Wyszukiwanie
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
    try {
      const friendshipDocRef = doc(db, 'friendships', friendshipId);
      await deleteDoc(friendshipDocRef);
      Alert.alert('Sukces', 'Usunięto znajomego!');
      console.log(`Removed friendship document: ${friendshipId}`);
    } catch (error) {
      console.error('Error removing friend:', error);
      Alert.alert('Błąd', 'Nie udało się usunąć znajomego.');
    }
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
  };

  const isAlreadyFriend = (uid: string): boolean => {
    return friendships.some(
      (friend) => friend.userAUid === uid || friend.userBUid === uid
    );
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Przełącznik między trybami */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            {
              backgroundColor: isSearchMode ? theme.colors.surfaceVariant : theme.colors.primary,
              borderTopLeftRadius: 8,
              borderBottomLeftRadius: 8,
            },
          ]}
          onPress={() => {
            if (isSearchMode) toggleMode();
          }}
        >
          <AntDesign
            name="smileo"
            size={24}
            color={isSearchMode ? theme.colors.onSurfaceVariant : '#fff'}
          />
          <Text
            style={[
              styles.toggleText,
              {
                color: isSearchMode ? theme.colors.onSurfaceVariant : '#fff',
              },
            ]}
          >
            Znajomi
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.toggleButton,
            {
              backgroundColor: isSearchMode ? theme.colors.primary : theme.colors.surfaceVariant,
              borderTopRightRadius: 8,
              borderBottomRightRadius: 8,
            },
          ]}
          onPress={() => {
            if (!isSearchMode) toggleMode();
          }}
        >
          <AntDesign
            name="adduser"
            size={24}
            color={!isSearchMode ? theme.colors.onSurfaceVariant : '#fff'}
          />
          <Text
            style={[
              styles.toggleText,
              {
                color: !isSearchMode ? theme.colors.onSurfaceVariant : '#fff',
              },
            ]}
          >
            Dodaj
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tryb Znajomych */}
      {!isSearchMode && (
        <>
          {/* Pole wyszukiwania w trybie znajomych */}
          <TextInput
            placeholder="Szukaj znajomych..."
            value={searchText}
            onChangeText={setSearchText}
            style={[
              styles.input,
              {
                borderColor: theme.colors.outline,
                color: theme.colors.onBackground,
              },
            ]}
            placeholderTextColor={theme.colors.onSurfaceVariant}
          />

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
                <View style={[styles.friendItem, { borderBottomColor: theme.colors.outline }]}>
                  <View style={styles.friendInfo}>
                    <AntDesign name="smileo" size={24} color={theme.colors.primary} style={styles.friendIcon} />
                    <Text style={{ color: theme.colors.onBackground }}>{item.nickname}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleRemoveFriend(item.id)}
                    style={[styles.removeButton, { backgroundColor: theme.colors.error }]}
                  >
                    <Text style={styles.removeButtonText}>Usuń</Text>
                  </TouchableOpacity>
                </View>
              )}
            />
          )}
        </>
      )}

      {/* Tryb Wyszukiwania */}
      {isSearchMode && (
        <>
          {/* Pole wyszukiwania w trybie dodawania znajomych */}
          <TextInput
            placeholder="Wpisz nick znajomego..."
            value={searchText}
            onChangeText={setSearchText}
            style={[
              styles.input,
              {
                borderColor: theme.colors.outline,
                color: theme.colors.onBackground,
              },
            ]}
            placeholderTextColor={theme.colors.onSurfaceVariant}
          />

          {/* Lista wyników wyszukiwania */}
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
            ListEmptyComponent={
              searchText.length >= 3 ? (
                <View style={styles.noResults}>
                  <Text style={{ color: theme.colors.onBackground }}>Nie znaleziono użytkowników.</Text>
                </View>
              ) : null
            }
          />
        </>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  toggleContainer: {
    flexDirection: 'row',
    marginBottom: 10,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ccc',
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  toggleText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: 'bold',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  friendItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  friendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  friendIcon: {
    marginRight: 10,
  },
  removeButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  removeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  searchItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  addButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
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
