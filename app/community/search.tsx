import React, { useState } from 'react';
import { View, TextInput, FlatList, TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import { db, auth } from '../config/firebaseConfig';
import { collection, query, where, getDocs, doc, setDoc, serverTimestamp, getDoc, limit, writeBatch } from 'firebase/firestore';
import { useTheme } from 'react-native-paper';

interface User {
  uid: string;
  nickname?: string;
}

export default function SearchFriendsScreen() {
  const [searchText, setSearchText] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const theme = useTheme();

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

  const handleAddFriend = async (friendUid: string) => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      Alert.alert('Błąd', 'Użytkownik nie jest zalogowany.');
      return;
    }
  
    try {
      // Referencje do dokumentów użytkownika i znajomego
      const currentUserDocRef = doc(db, 'users', currentUser.uid);
      const friendDocRef = doc(db, 'users', friendUid);
  
      // Sprawdź, czy znajomy jest już na liście znajomych
      const currentUserDoc = await getDoc(currentUserDocRef);
      if (!currentUserDoc.exists()) {
        Alert.alert('Błąd', 'Dokument użytkownika nie istnieje.');
        return;
      }
      const currentUserData = currentUserDoc.data();
      if (currentUserData.friends?.includes(friendUid)) {
        Alert.alert('Info', 'Ta osoba jest już na Twojej liście znajomych.');
        return;
      }
  
      // Stwórz batched write
      const batch = writeBatch(db);
  
      // Dodaj zaproszenie do podkolekcji znajomego
      const receiverFriendRequestsRef = collection(db, 'users', friendUid, 'friendRequests');
      const newRequestRef = doc(receiverFriendRequestsRef); // Auto-generowany ID
      batch.set(newRequestRef, {
        senderUid: currentUser.uid,
        receiverUid: friendUid,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
  
      // Dodaj lustrzane zaproszenie do własnej podkolekcji
      const senderFriendRequestsRef = collection(db, 'users', currentUser.uid, 'friendRequests');
      batch.set(doc(senderFriendRequestsRef, newRequestRef.id), {
        senderUid: currentUser.uid,
        receiverUid: friendUid,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
  
      // Wykonaj batched write
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
            <TouchableOpacity onPress={() => handleAddFriend(item.uid)} style={[styles.addButton, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.addButtonText}>Dodaj</Text>
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
