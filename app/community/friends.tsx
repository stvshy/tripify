// app/community/friends.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { auth, db } from '../config/firebaseConfig';
import { doc, getDoc, arrayRemove, updateDoc, onSnapshot, arrayUnion, writeBatch, query, where, getDocs, collection } from 'firebase/firestore';
import { useTheme } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';

export default function FriendsListScreen() {
  const [loading, setLoading] = useState(true);
  const [friends, setFriends] = useState<{ uid: string; nickname?: string }[]>([]);
  const theme = useTheme();

  const fetchFriends = useCallback(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setLoading(false);
      return;
    }

    const userId = currentUser.uid;

    // Listener dla listy znajomych
    const userDocRef = doc(db, 'users', userId);
    const unsubscribeFriends = onSnapshot(userDocRef, async (docSnap) => {
      if (docSnap.exists()) {
        const userData = docSnap.data();
        const friendUids: string[] = userData.friends || [];

        const friendsData: { uid: string; nickname?: string }[] = [];

        // Pobierz dane wszystkich znajomych równocześnie
        const promises = friendUids.map(async (uid) => {
          const friendDocRef = doc(db, 'users', uid);
          const friendDoc = await getDoc(friendDocRef);
          if (friendDoc.exists()) {
            const friendData = friendDoc.data();
            friendsData.push({ uid, nickname: friendData.nickname });
          }
        });

        await Promise.all(promises);

        setFriends(friendsData);
      } else {
        setFriends([]);
      }
      setLoading(false);
    });

    // Listener na zaakceptowane zaproszenia, aby dodać znajomego do własnej listy
    const acceptedFriendRequestsQuery = query(
      collection(db, 'friendRequests'),
      where('senderUid', '==', userId),
      where('status', '==', 'accepted')
    );

    const unsubscribeAccepted = onSnapshot(acceptedFriendRequestsQuery, (snapshot) => {
      snapshot.forEach(async (docSnap) => {
        const data = docSnap.data();
        const receiverUid = data.receiverUid;

        // Aktualizuj własną tablicę friends
        const userDocRef = doc(db, 'users', userId);
        await updateDoc(userDocRef, {
          friends: arrayUnion(receiverUid),
        });

        console.log(`Added ${receiverUid} to ${userId}'s friends list.`);
      });
    });

    setLoading(false);

    return () => {
      unsubscribeFriends();
      unsubscribeAccepted();
    };
  }, []);

  // Użyj useFocusEffect, aby nasłuchiwać tylko, gdy ekran jest aktywny
  useFocusEffect(
    React.useCallback(() => {
      const unsubscribe = fetchFriends();
      return () => unsubscribe && unsubscribe();
    }, [fetchFriends])
  );

  const handleRemoveFriend = async (friendUid: string) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const senderUid = currentUser.uid;
      const receiverUid = friendUid;

      const batch = writeBatch(db);

      // Usuń znajomego z listy bieżącego użytkownika
      const currentUserDocRef = doc(db, 'users', senderUid);
      batch.update(currentUserDocRef, {
        friends: arrayRemove(receiverUid)
      });

      // Usuń bieżącego użytkownika z listy znajomych odbiorcy
      const receiverDocRef = doc(db, 'users', receiverUid);
      batch.update(receiverDocRef, {
        friends: arrayRemove(senderUid)
      });

      await batch.commit();

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
