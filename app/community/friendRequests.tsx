// app/community/friendRequests.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { auth, db } from '../config/firebaseConfig';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, arrayUnion, writeBatch } from 'firebase/firestore';
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

  const fetchRequests = async () => {
    setLoading(true);
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setLoading(false);
      return;
    }

    try {
      // Pobierz listę znajomych
      const userDocRef = doc(db, 'users', currentUser.uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setFriends(userData.friends || []);
      } else {
        setFriends([]);
      }

      // Pobierz incoming zaproszenia
      const incomingRef = collection(db, 'users', currentUser.uid, 'friendRequests');
      const incomingQ = query(incomingRef, where('receiverUid', '==', currentUser.uid), where('status', '==', 'pending'));
      const incomingSnapshot = await getDocs(incomingQ);
      const incoming: FriendRequest[] = [];
      incomingSnapshot.forEach((docSnap) => {
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

      // Pobierz outgoing zaproszenia
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

      setLoading(false);
    } catch (error) {
      console.error('Error fetching friend requests:', error);
      Alert.alert('Błąd', 'Nie udało się pobrać zaproszeń.');
      setLoading(false);
    }
  };

  // Użyj useFocusEffect, aby pobierać dane przy każdym wejściu na ekran
  useFocusEffect(
    React.useCallback(() => {
      fetchRequests();
    }, [])
  );

  const handleAccept = async (requestId: string, senderUid: string) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      // Sprawdź, czy senderUid jest już w liście znajomych
      if (friends.includes(senderUid)) {
        Alert.alert('Info', 'Ta osoba jest już na Twojej liście znajomych.');
        return;
      }

      const batch = writeBatch(db);

      // Aktualizuj listę znajomych bieżącego użytkownika (B)
      const currentUserDocRef = doc(db, 'users', currentUser.uid);
      batch.update(currentUserDocRef, {
        friends: arrayUnion(senderUid),
      });

      // Aktualizuj status zaproszenia na 'accepted'
      const friendRequestRef = doc(db, 'users', currentUser.uid, 'friendRequests', requestId);
      batch.update(friendRequestRef, {
        status: 'accepted',
      });

      await batch.commit();

      // Aktualizuj lokalny stan
      setFriends((prev) => [...prev, senderUid]);
      setIncomingRequests((prev) => prev.filter((req) => req.id !== requestId));

      Alert.alert('Sukces', 'Dodano znajomego!');
    } catch (error) {
      console.error('Error accepting friend request:', error);
      Alert.alert('Błąd', 'Nie udało się zaakceptować zaproszenia.');
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      // Aktualizuj status zaproszenia na 'rejected'
      const friendRequestRef = doc(db, 'users', currentUser.uid, 'friendRequests', requestId);
      await updateDoc(friendRequestRef, {
        status: 'rejected',
      });

      setIncomingRequests((prev) => prev.filter((req) => req.id !== requestId));

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

      // Aktualizuj status zaproszenia na 'canceled'
      const friendRequestRef = doc(db, 'users', currentUser.uid, 'friendRequests', requestId);
      await updateDoc(friendRequestRef, {
        status: 'canceled',
      });

      setOutgoingRequests((prev) => prev.filter((req) => req.id !== requestId));

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
