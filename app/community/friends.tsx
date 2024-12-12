// app/community/friends.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { auth, db } from '../config/firebaseConfig';
import { doc, getDoc, arrayRemove, updateDoc, writeBatch } from 'firebase/firestore';
import { useTheme } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';

export default function FriendsListScreen() {
  const [loading, setLoading] = useState(true);
  const [friends, setFriends] = useState<{ uid: string; nickname?: string }[]>([]);
  const theme = useTheme();

  const fetchFriends = async () => {
    setLoading(true);
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setLoading(false);
      return;
    }

    const userDocRef = doc(db, 'users', currentUser.uid);
    const userDoc = await getDoc(userDocRef);
    if (!userDoc.exists()) {
      setLoading(false);
      return;
    }

    const userData = userDoc.data();
    const friendUids = userData.friends || [];

    const fetchedFriends: { uid: string; nickname?: string }[] = [];

    for (const friendUid of friendUids) {
      const friendDocRef = doc(db, 'users', friendUid);
      const friendDoc = await getDoc(friendDocRef);
      if (friendDoc.exists()) {
        const friendData = friendDoc.data();
        fetchedFriends.push({ uid: friendUid, nickname: friendData.nickname });
      }
    }

    setFriends(fetchedFriends);
    setLoading(false);
  };

  // Użyj useFocusEffect, aby pobierać dane przy każdym wejściu na ekran
  useFocusEffect(
    React.useCallback(() => {
      fetchFriends();
    }, [])
  );

  const handleRemoveFriend = async (friendUid: string) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;
  
      const batch = writeBatch(db);
  
      // Usuń znajomego z listy bieżącego użytkownika
      const currentUserDocRef = doc(db, 'users', currentUser.uid);
      batch.update(currentUserDocRef, {
        friends: arrayRemove(friendUid)
      });
  
      // Usuń bieżącego użytkownika z listy znajomych nadawcy
      const friendDocRef = doc(db, 'users', friendUid);
      batch.update(friendDocRef, {
        friends: arrayRemove(currentUser.uid)
      });
  
      await batch.commit();
  
      // Aktualizacja lokalnego stanu
      setFriends((prevFriends) => prevFriends.filter(friend => friend.uid !== friendUid));
  
      Alert.alert('Sukces', 'Usunięto znajomego!');
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

  if (friends.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={{ color: theme.colors.onBackground }}>Nie masz jeszcze żadnych znajomych.</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={friends}
      keyExtractor={(item) => item.uid}
      renderItem={({ item }) => (
        <View style={[styles.friendItem, { borderBottomColor: theme.colors.outline }]}>
          <Text style={{ color: theme.colors.onBackground }}>{item.nickname}</Text>
          <TouchableOpacity onPress={() => handleRemoveFriend(item.uid)} style={[styles.removeButton, { backgroundColor: theme.colors.error }]}>
            <Text style={styles.removeButtonText}>Usuń</Text>
          </TouchableOpacity>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  friendItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1 },
  removeButton: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 4 },
  removeButtonText: { color: '#fff', fontWeight: 'bold' },
});
