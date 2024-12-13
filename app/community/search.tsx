// app/community/search.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { View, TextInput, FlatList, TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import { db, auth } from '../config/firebaseConfig';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  serverTimestamp,
  limit,
  getDoc as getSingleDoc,
  onSnapshot,
  writeBatch
} from 'firebase/firestore';
import { useTheme } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';

interface User {
  uid: string;
  nickname?: string;
}

interface FriendRequest {
  id: string;
  senderUid: string;
  receiverUid: string;
  status: 'pending' | 'accepted' | 'rejected' | 'canceled';
  createdAt: any; // Firestore Timestamp
}

export default function SearchFriendsScreen() {
  const [searchText, setSearchText] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [friends, setFriends] = useState<string[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);
  const theme = useTheme();

  const fetchFriendsAndOutgoingRequests = useCallback(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setFriends([]);
      setOutgoingRequests([]);
      return;
    }

    const userId = currentUser.uid;

    console.log(`Setting up listeners for user: ${userId}`);

    // Listener dla listy znajomych
    const userDocRef = doc(db, 'users', userId);
    const unsubscribeFriends = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const userData = docSnap.data();
        setFriends(userData.friends || []);
        console.log('Updated friends list:', userData.friends);
      }
    });

    // Listener dla outgoingFriendRequests (senderUid == userId, status == pending)
    const outgoingQuerySnap = query(
      collection(db, 'friendRequests'),
      where('senderUid', '==', userId),
      where('status', '==', 'pending')
    );
    const unsubscribeOutgoing = onSnapshot(outgoingQuerySnap, (snapshot) => {
      const outgoing: FriendRequest[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        outgoing.push({
          id: docSnap.id,
          senderUid: data.senderUid,
          receiverUid: data.receiverUid,
          status: data.status,
          createdAt: data.createdAt,
        });
      });
      setOutgoingRequests(outgoing);
      console.log('Updated outgoing friend requests:', outgoing);
    });

    return () => {
      console.log('Unsubscribing from listeners.');
      unsubscribeFriends();
      unsubscribeOutgoing();
    };
  }, []);

  // Użyj useFocusEffect, aby nasłuchiwać tylko, gdy ekran jest aktywny
  useFocusEffect(
    React.useCallback(() => {
      const unsubscribe = fetchFriendsAndOutgoingRequests();
      return () => unsubscribe && unsubscribe();
    }, [fetchFriendsAndOutgoingRequests])
  );

  const handleSearch = async (text: string) => {
    setSearchText(text);
    if (text.length < 3) {
      setResults([]);
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
      setResults(foundUsers);
      console.log(`Found ${foundUsers.length} users matching "${text}".`);
    } catch (error) {
      console.error('Error searching users:', error);
      Alert.alert('Błąd', 'Nie udało się wyszukać użytkowników.');
    }
  };

  const isAlreadyFriend = (uid: string): boolean => {
    return friends.includes(uid);
  };

  const hasPendingRequest = (uid: string): boolean => {
    return outgoingRequests.some(
      (req) => req.receiverUid === uid && req.status === 'pending'
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
  
  

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <TextInput
        placeholder="Wpisz nick znajomego..."
        value={searchText}
        onChangeText={handleSearch}
        style={[styles.input, { borderColor: theme.colors.outline, color: theme.colors.onBackground }]}
        placeholderTextColor={theme.colors.onSurfaceVariant}
      />
      <FlatList
        data={results}
        keyExtractor={(item) => item.uid}
        renderItem={({ item }) => (
          <View style={[styles.resultItem, { borderBottomColor: theme.colors.outline }]}>
            <Text style={{ color: theme.colors.onBackground }}>{item.nickname}</Text>
            <TouchableOpacity
              onPress={() => handleAddFriend(item.uid)}
              style={[
                styles.addButton,
                {
                  backgroundColor:
                    isAlreadyFriend(item.uid) || hasPendingRequest(item.uid)
                      ? '#ccc'
                      : theme.colors.primary,
                },
              ]}
              disabled={isAlreadyFriend(item.uid) || hasPendingRequest(item.uid)}
            >
              <Text style={styles.addButtonText}>
                {isAlreadyFriend(item.uid)
                  ? 'Znajomy'
                  : hasPendingRequest(item.uid)
                  ? 'Wysłane'
                  : 'Dodaj'}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  input: { borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 10 },
  resultItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1 },
  addButton: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 4 },
  addButtonText: { color: '#fff', fontWeight: 'bold' },
  noResults: { alignItems: 'center', marginTop: 20 },
});
