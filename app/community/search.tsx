// app/community/search.tsx
import React, { useEffect, useState } from 'react';
import { View, TextInput, FlatList, TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import { db, auth } from '../config/firebaseConfig';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  serverTimestamp,
  limit,
  getDoc as getSingleDoc,
} from 'firebase/firestore';
import { useTheme } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { User as FirebaseUser } from 'firebase/auth';

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

  const fetchFriendsAndOutgoingRequests = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setFriends([]);
      setOutgoingRequests([]);
      return;
    }

    try {
      // Pobierz listę znajomych
      const userDocRef = doc(db, 'users', currentUser.uid);
      const userDoc = await getSingleDoc(userDocRef);
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setFriends(userData.friends || []);
      } else {
        setFriends([]);
      }

      // Pobierz wysłane zaproszenia
      const outgoingRef = collection(db, 'users', currentUser.uid, 'friendRequests');
      const outgoingQ = query(
        outgoingRef,
        where('senderUid', '==', currentUser.uid),
        where('status', '==', 'pending')
      );
      const outgoingSnapshot = await getDocs(outgoingQ);
      const outgoing: FriendRequest[] = [];
      outgoingSnapshot.forEach((docSnap) => {
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
    } catch (error) {
      console.error('Error fetching friends and outgoing requests:', error);
      Alert.alert('Błąd', 'Nie udało się pobrać danych znajomych.');
    }
  };

  // Użyj useFocusEffect, aby pobierać dane przy każdym wejściu na ekran
  useFocusEffect(
    React.useCallback(() => {
      fetchFriendsAndOutgoingRequests();
    }, [])
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

    try {
      // Sprawdź, czy znajomy jest już na liście znajomych
      if (isAlreadyFriend(friendUid)) {
        Alert.alert('Info', 'Ta osoba jest już na Twojej liście znajomych.');
        return;
      }

      // Sprawdź, czy istnieje już pending lub accepted zaproszenie
      const receiverFriendRequestsRef = collection(db, 'users', friendUid, 'friendRequests');
      const qPending = query(receiverFriendRequestsRef, where('senderUid', '==', currentUser.uid));
      const existingRequestsSnap = await getDocs(qPending);

      let alreadyRequested = false;
      existingRequestsSnap.forEach((docSnap) => {
        const reqData = docSnap.data();
        if (['pending', 'accepted'].includes(reqData.status)) {
          alreadyRequested = true;
        }
      });

      if (alreadyRequested) {
        Alert.alert('Info', 'Zaproszenie już zostało wysłane lub ta osoba jest już znajomym.');
        return;
      }

      // Sprawdź, czy istnieje odwrotne zaproszenie (od odbiorcy do nadawcy)
      const reverseFriendRequestsRef = collection(db, 'users', currentUser.uid, 'friendRequests');
      const reverseQ = query(
        reverseFriendRequestsRef,
        where('senderUid', '==', friendUid),
        where('receiverUid', '==', currentUser.uid)
      );
      const reverseRequestsSnap = await getDocs(reverseQ);

      let reverseRequested = false;
      reverseRequestsSnap.forEach((docSnap) => {
        const reqData = docSnap.data();
        if (['pending', 'accepted'].includes(reqData.status)) {
          reverseRequested = true;
        }
      });

      if (reverseRequested) {
        Alert.alert('Info', 'Ta osoba już wysłała Ci zaproszenie do znajomych.');
        return;
      }

      // Tworzymy zaproszenie tylko w podkolekcji odbiorcy
      const newRequestRef = doc(collection(db, 'users', friendUid, 'friendRequests'));
      await setDoc(newRequestRef, {
        senderUid: currentUser.uid,
        receiverUid: friendUid,
        status: 'pending',
        createdAt: serverTimestamp(),
      });

      // Dodaj zaproszenie do listy wysłanych zaproszeń
      setOutgoingRequests((prev) => [
        ...prev,
        {
          id: newRequestRef.id,
          senderUid: currentUser.uid,
          receiverUid: friendUid,
          status: 'pending',
          createdAt: serverTimestamp(),
        },
      ]);

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
