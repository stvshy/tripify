// app/community/friendRequests.tsx
import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import { auth, db } from '../config/firebaseConfig';
import {
  doc,
  updateDoc,
  collection,
  query,
  where,
  onSnapshot,
  writeBatch,
  getDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { useTheme } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { AntDesign } from '@expo/vector-icons';

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

  // Animation for outgoing requests panel
  const screenHeight = Dimensions.get('window').height;
  const panelHeight = screenHeight * 0.5; // Increased to 50% for better visibility
  const animatedValue = useRef(new Animated.Value(screenHeight)).current;

  const fetchRequests = useCallback(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setLoading(false);
      return;
    }

    const userId = currentUser.uid;

    console.log(`Setting up listeners for friend requests of user: ${userId}`);

    // Listener for incoming friend requests
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

    // Listener for outgoing friend requests
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

    // Listener for friends list
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

  // Use useFocusEffect to listen only when the screen is active
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

      // Check if senderUid is already a friend
      if (friends.includes(senderUid)) {
        Alert.alert('Info', 'This person is already in your friends list.');
        console.log('Sender is already a friend.');
        return;
      }

      const batch = writeBatch(db);

      // Update friend request status to 'accepted'
      const friendRequestRef = doc(db, 'friendRequests', requestId);
      batch.update(friendRequestRef, {
        status: 'accepted',
      });
      console.log(`Updated friendRequest status to 'accepted' for request: ${friendRequestRef.path}`);

      // Create a document in the friendships collection
      const friendshipRef = doc(collection(db, 'friendships'));
      batch.set(friendshipRef, {
        userAUid: senderUid,
        userBUid: receiverUid,
        createdAt: serverTimestamp(),
        status: 'accepted',
      });
      console.log(`Created friendship document: ${friendshipRef.path}`);

      await batch.commit();

      Alert.alert('Success', 'Friend added!');
      console.log(`Friend request accepted: ${requestId}`);
    } catch (error) {
      console.error('Error accepting friend request:', error);
      Alert.alert('Error', 'Failed to accept the friend request.');
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      // Update friend request status to 'rejected'
      const friendRequestRef = doc(db, 'friendRequests', requestId);
      await updateDoc(friendRequestRef, {
        status: 'rejected',
      });
      console.log(`Updated friendRequest status to 'rejected' for request: ${friendRequestRef.path}`);

      Alert.alert('Rejected', 'Friend request has been rejected.');
    } catch (error) {
      console.error('Error rejecting friend request:', error);
      Alert.alert('Error', 'Failed to reject the friend request.');
    }
  };

  const handleCancelOutgoing = async (requestId: string) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      // Update friend request status to 'canceled'
      const friendRequestRef = doc(db, 'friendRequests', requestId);
      await updateDoc(friendRequestRef, {
        status: 'canceled',
      });
      console.log(`Updated friendRequest status to 'canceled' for request: ${friendRequestRef.path}`);

      Alert.alert('Canceled', 'Outgoing friend request has been canceled.');
    } catch (error) {
      console.error('Error canceling outgoing request:', error);
      Alert.alert('Error', 'Failed to cancel the friend request.');
    }
  };

  // Swipe-up gesture handlers for outgoing requests panel
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        const { dy } = gestureState;
        return Math.abs(dy) > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy < 0) {
          // Swiping up
          animatedValue.setValue(screenHeight + gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy < -50) {
          // Swiped up enough to open the panel
          Animated.timing(animatedValue, {
            toValue: screenHeight - panelHeight,
            duration: 300,
            useNativeDriver: false,
          }).start();
        } else {
          // Not enough swipe, return to closed position
          Animated.timing(animatedValue, {
            toValue: screenHeight,
            duration: 300,
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  const closePanel = () => {
    Animated.timing(animatedValue, {
      toValue: screenHeight,
      duration: 300,
      useNativeDriver: false,
    }).start();
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
      <Text style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>Incoming Friend Requests</Text>
      {incomingRequests.length === 0 ? (
        <Text style={{ color: theme.colors.onBackground, marginBottom: 20 }}>No incoming friend requests.</Text>
      ) : (
        <FlatList
          data={incomingRequests}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <FriendRequestItem request={item} onAccept={handleAccept} onReject={handleReject} />
          )}
        />
      )}

      {/* Button to open outgoing requests panel */}
      <TouchableOpacity
        style={[styles.outgoingButton, { backgroundColor: theme.colors.primary }]}
        onPress={() => {
          Animated.timing(animatedValue, {
            toValue: screenHeight - panelHeight,
            duration: 300,
            useNativeDriver: false,
          }).start();
        }}
      >
        <AntDesign name="arrowup" size={20} color="#fff" />
        <Text style={styles.outgoingButtonText}>Show Sent Requests</Text>
      </TouchableOpacity>

      {/* Animated Panel for Outgoing Requests */}
      <Animated.View
        style={[
          styles.outgoingPanel,
          {
            top: animatedValue,
            backgroundColor: theme.colors.surface,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
          },
        ]}
        {...panResponder.panHandlers}
      >
        <View style={styles.panelHeader}>
          <View style={styles.panelHandleContainer}>
            <View style={styles.panelHandle} />
          </View>
          <TouchableOpacity onPress={closePanel} style={styles.closeButton}>
            <AntDesign name="closecircle" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        {outgoingRequests.length === 0 ? (
          <Text style={{ color: theme.colors.onSurfaceVariant, padding: 20 }}>No sent friend requests.</Text>
        ) : (
          <FlatList
            data={outgoingRequests}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <OutgoingRequestItem request={item} onCancel={handleCancelOutgoing} />
            )}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        )}
      </Animated.View>
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
      <Text style={{ color: theme.colors.onBackground }}>{nickname} wants to be your friend.</Text>
      <View style={styles.requestButtons}>
        <TouchableOpacity
          onPress={() => onAccept(id, senderUid)}
          style={[styles.iconButton, { backgroundColor: 'green' }]}
          accessibilityLabel="Accept Friend Request"
          accessibilityRole="button"
        >
          <AntDesign name="check" size={16} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onReject(id)}
          style={[styles.iconButton, { backgroundColor: 'red', marginLeft: 10 }]}
          accessibilityLabel="Reject Friend Request"
          accessibilityRole="button"
        >
          <AntDesign name="close" size={16} color="#fff" />
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
      <Text style={{ color: theme.colors.onBackground }}>Friend request sent to {nickname}.</Text>
      <TouchableOpacity
        onPress={() => onCancel(id)}
        style={[styles.iconButton, { backgroundColor: 'red' }]}
        accessibilityLabel="Cancel Sent Friend Request"
        accessibilityRole="button"
      >
        <AntDesign name="close" size={16} color="#fff" />
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
    paddingVertical: 15,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  requestButtons: {
    flexDirection: 'row',
  },
  iconButton: {
    width: 32, // Reduced size
    height: 32, // Reduced size
    borderRadius: 16, // Perfect circle
    alignItems: 'center',
    justifyContent: 'center',
  },
  outgoingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8, // Reduced padding
    paddingHorizontal: 16, // Adjusted padding
    borderRadius: 20, // Reduced border radius
    position: 'absolute',
    bottom: 20, // Adjusted position
    left: '35%', // Centered more
    right: '35%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3.84,
    elevation: 5,
  },
  outgoingButtonText: {
    color: '#fff',
    marginLeft: 6,
    fontWeight: 'bold',
    fontSize: 14, // Reduced font size
  },
  outgoingPanel: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: Dimensions.get('window').height * 0.5, // Increased to 50%
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.3,
    shadowRadius: 3.84,
    elevation: 5,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  panelHandleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  panelHandle: {
    width: 40,
    height: 5,
    backgroundColor: '#ccc',
    borderRadius: 2.5,
    marginBottom: 10,
  },
  closeButton: {
    // Adjust position if needed
  },
});
