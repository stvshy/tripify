// app/community/friendRequests.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { auth, db } from '../config/firebaseConfig';
import { doc, updateDoc, collection, query, where, onSnapshot, arrayUnion, writeBatch, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useTheme } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';

interface FriendRequest {
  id: string;
  senderUid: string;
  receiverUid: string;
  status: 'pending' | 'accepted' | 'rejected' | 'canceled';
  createdAt: any; // Firestore Timestamp
}

interface FriendRequestItemProps {
  request: FriendRequest;
  onAccept: (requestId: string, senderUid: string) => void;
  onReject: (requestId: string) => void;
}

interface OutgoingRequestItemProps {
  request: FriendRequest;
  onCancel: (requestId: string) => void;
}

export default function FriendRequestsScreen() {
  const [loading, setLoading] = useState(true);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<string[]>([]);
  const theme = useTheme();

  const fetchRequests = useCallback(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setLoading(false);
      return;
    }

    const userId = currentUser.uid;

    console.log(`Setting up listeners for friend requests of user: ${userId}`);

    // Listener dla incomingFriendRequests (receiverUid == userId, status == pending)
    const incomingQuerySnap = query(
      collection(db, 'friendRequests'),
      where('receiverUid', '==', userId),
      where('status', '==', 'pending')
    );
    const unsubscribeIncoming = onSnapshot(incomingQuerySnap, (snapshot) => {
      const incoming: FriendRequest[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        incoming.push({
          id: docSnap.id,
          senderUid: data.senderUid,
          receiverUid: data.receiverUid,
          status: data.status,
          createdAt: data.createdAt,
        });
      });
      setIncomingRequests(incoming);
      console.log('Incoming friend requests updated:', incoming);
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
      console.log('Outgoing friend requests updated:', outgoing);
    });

    // Listener dla listy znajomych
    const userDocRef = doc(db, 'users', userId);
    const unsubscribeFriends = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const userData = docSnap.data();
        setFriends(userData.friends || []);
        console.log('Updated friends list:', userData.friends);
      }
    });

    setLoading(false);

    return () => {
      console.log('Unsubscribing from friend requests listeners.');
      unsubscribeIncoming();
      unsubscribeOutgoing();
      unsubscribeFriends();
    };
  }, []);

  // Użyj useFocusEffect, aby nasłuchiwać tylko, gdy ekran jest aktywny
  useFocusEffect(
    React.useCallback(() => {
      const unsubscribe = fetchRequests();
      return () => unsubscribe && unsubscribe();
    }, [fetchRequests])
  );

  const handleAccept = async (requestId: string, senderUid: string) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const receiverUid = currentUser.uid;

      // Sprawdź, czy senderUid jest już w liście znajomych
      if (friends.includes(senderUid)) {
        Alert.alert('Info', 'Ta osoba jest już na Twojej liście znajomych.');
        console.log('Sender is already a friend.');
        return;
      }

      const batch = writeBatch(db);

      // Aktualizuj status zaproszenia w friendRequests na 'accepted'
      const friendRequestRef = doc(db, 'friendRequests', requestId);
      batch.update(friendRequestRef, {
        status: 'accepted',
      });
      console.log(`Updated friendRequest status to 'accepted' for request: ${friendRequestRef.path}`);

      // Tworzenie dokumentu w kolekcji friendships
      const friendshipRef = doc(collection(db, 'friendships'));
      batch.set(friendshipRef, {
        userAUid: senderUid,
        userBUid: receiverUid,
        createdAt: serverTimestamp(),
        status: 'accepted'
      });
      console.log(`Created friendship document: ${friendshipRef.path}`);

      await batch.commit();

      Alert.alert('Sukces', 'Dodano znajomego!');
      console.log(`Friend request accepted: ${requestId}`);
    } catch (error) {
      console.error('Error accepting friend request:', error);
      Alert.alert('Błąd', 'Nie udało się zaakceptować zaproszenia.');
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const receiverUid = currentUser.uid;

      // Aktualizuj status zaproszenia w friendRequests na 'rejected'
      const friendRequestRef = doc(db, 'friendRequests', requestId);
      await updateDoc(friendRequestRef, {
        status: 'rejected',
      });
      console.log(`Updated friendRequest status to 'rejected' for request: ${friendRequestRef.path}`);

      Alert.alert('Odrzucono', 'Odrzucono zaproszenie do znajomych.');
    } catch (error) {
      console.error('Error rejecting friend request:', error);
      Alert.alert('Błąd', 'Nie udało się odrzucić zaproszenia.');
    }
  };

  const handleCancelOutgoing = async (requestId: string) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const senderUid = currentUser.uid;

      // Aktualizuj status zaproszenia na 'canceled' w friendRequests
      const friendRequestRef = doc(db, 'friendRequests', requestId);
      await updateDoc(friendRequestRef, {
        status: 'canceled',
      });
      console.log(`Updated friendRequest status to 'canceled' for request: ${friendRequestRef.path}`);

      Alert.alert('Anulowano', 'Anulowano wysłane zaproszenie.');
    } catch (error) {
      console.error('Error canceling outgoing request:', error);
      Alert.alert('Błąd', 'Nie udało się anulować zaproszenia.');
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
      <Text style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>Otrzymane Zaproszenia</Text>
      {incomingRequests.length === 0 ? (
        <Text style={{ color: theme.colors.onBackground, marginBottom: 20 }}>Brak otrzymanych zaproszeń.</Text>
      ) : (
        <FlatList
          data={incomingRequests}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <FriendRequestItem
              request={item}
              onAccept={handleAccept}
              onReject={handleReject}
            />
          )}
        />
      )}

      <Text style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>Wysłane Zaproszenia</Text>
      {outgoingRequests.length === 0 ? (
        <Text style={{ color: theme.colors.onBackground }}>Brak wysłanych zaproszeń w trakcie oczekiwania.</Text>
      ) : (
        <FlatList
          data={outgoingRequests}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <OutgoingRequestItem
              request={item}
              onCancel={handleCancelOutgoing}
            />
          )}
        />
      )}
    </View>
  );
}

const FriendRequestItem: React.FC<FriendRequestItemProps> = ({ request, onAccept, onReject }) => {
  const [nickname, setNickname] = useState('');
  const theme = useTheme();
  const { senderUid, id } = request;

  useEffect(() => {
    const fetchNickname = async () => {
      try {
        const senderDocRef = doc(db, 'users', senderUid);
        const senderDoc = await getDoc(senderDocRef);
        if (senderDoc.exists()) {
          const senderData = senderDoc.data();
          setNickname(senderData.nickname || 'Unknown');
          console.log(`Fetched nickname for sender ${senderUid}: ${senderData.nickname}`);
        }
      } catch (error) {
        console.error('Error fetching sender nickname:', error);
        setNickname('Unknown');
      }
    };
    fetchNickname();
  }, [senderUid]);

  return (
    <View style={[styles.requestItem, { borderBottomColor: theme.colors.outline }]}>
      <Text style={{ color: theme.colors.onBackground }}>{nickname} chce być Twoim znajomym.</Text>
      <View style={styles.requestButtons}>
        <TouchableOpacity onPress={() => onAccept(id, senderUid)} style={[styles.acceptButton, { backgroundColor: theme.colors.primary }]}>
          <Text style={styles.buttonText}>Akceptuj</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onReject(id)} style={[styles.rejectButton, { backgroundColor: theme.colors.error }]}>
          <Text style={styles.buttonText}>Odrzuć</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const OutgoingRequestItem: React.FC<OutgoingRequestItemProps> = ({ request, onCancel }) => {
  const [nickname, setNickname] = useState('');
  const theme = useTheme();
  const { receiverUid, id } = request;

  useEffect(() => {
    const fetchNickname = async () => {
      try {
        const receiverDocRef = doc(db, 'users', receiverUid);
        const receiverDoc = await getDoc(receiverDocRef);
        if (receiverDoc.exists()) {
          const receiverData = receiverDoc.data();
          setNickname(receiverData.nickname || 'Unknown');
          console.log(`Fetched nickname for receiver ${receiverUid}: ${receiverData.nickname}`);
        }
      } catch (error) {
        console.error('Error fetching receiver nickname:', error);
        setNickname('Unknown');
      }
    };
    fetchNickname();
  }, [receiverUid]);

  return (
    <View style={[styles.requestItem, { borderBottomColor: theme.colors.outline }]}>
      <Text style={{ color: theme.colors.onBackground }}>Zaproszenie wysłane do {nickname}.</Text>
      <TouchableOpacity onPress={() => onCancel(id)} style={[styles.cancelButton, { backgroundColor: theme.colors.error }]}>
        <Text style={styles.buttonText}>Anuluj</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 10,
  },
  requestItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  requestButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 5,
  },
  acceptButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    marginRight: 10,
  },
  rejectButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  cancelButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    marginTop: 5,
    alignSelf: 'flex-end'
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
