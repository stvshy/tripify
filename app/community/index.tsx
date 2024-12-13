// app/community/index.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, TextInput, Alert } from 'react-native';
import { auth, db } from '../config/firebaseConfig';
import { doc, getDoc, collection, query, where, onSnapshot, deleteDoc } from 'firebase/firestore';
import { useRouter } from 'expo-router';
import { useTheme } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';


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
  const [filteredFriends, setFilteredFriends] = useState<Friendship[]>([]);
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
    if (searchText === '') {
      setFilteredFriends(friendships);
    } else {
      const filtered = friendships.filter((friend) =>
        friend.nickname.toLowerCase().includes(searchText.toLowerCase())
      );
      setFilteredFriends(filtered);
    }
  }, [searchText, friendships]);

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

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Pole wyszukiwania */}
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

      {/* Przycisk do dodawania nowych znajomych */}
      <TouchableOpacity
        onPress={() => router.push('/community/search')}
        style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
      >
        <Text style={styles.addButtonText}>Dodaj Znajomego</Text>
      </TouchableOpacity>

      {/* Lista znajomych */}
      {filteredFriends.length === 0 ? (
        <View style={styles.empty}>
          <Text style={{ color: theme.colors.onBackground }}>Brak znajomych do wyświetlenia.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredFriends}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={[styles.friendItem, { borderBottomColor: theme.colors.outline }]}>
              <Text style={{ color: theme.colors.onBackground }}>{item.nickname}</Text>
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
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  addButton: {
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  friendItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
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
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
