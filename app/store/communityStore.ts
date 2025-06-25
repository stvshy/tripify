// app/store/communityStore.ts
import { create } from "zustand";
import { db, auth } from "../config/firebaseConfig";
import {
  collection,
  query,
  where,
  onSnapshot,
  getDoc,
  getDocs,
  doc,
  limit,
  deleteDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { Alert } from "react-native";

export interface User {
  uid: string;
  nickname?: string;
}
export interface Friendship {
  id: string;
  friendUid: string;
  nickname: string;
}

interface CommunityState {
  friends: Friendship[];
  sentRequestReceiverUids: string[];
  searchResults: User[];
  isLoading: boolean;
  unsubscribeListeners: () => void;
  listenForCommunityData: () => void;
  searchUsers: (text: string) => Promise<void>;
  sendFriendRequest: (receiverUid: string) => Promise<void>;
  removeFriend: (friendshipId: string) => Promise<void>;
}

export const useCommunityStore = create<CommunityState>((set, get) => ({
  friends: [],
  sentRequestReceiverUids: [],
  searchResults: [],
  isLoading: true,
  unsubscribeListeners: () => {},

  listenForCommunityData: () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      set({ isLoading: false, friends: [], sentRequestReceiverUids: [] });
      return;
    }
    get().unsubscribeListeners();
    const userId = currentUser.uid;
    const unsubscribers: (() => void)[] = [];

    let friendsA: Friendship[] = [];
    let friendsB: Friendship[] = [];

    const combineAndSetFriends = () => {
      const uniqueFriends = new Map<string, Friendship>();
      [...friendsA, ...friendsB].forEach((friend) =>
        uniqueFriends.set(friend.id, friend)
      );
      set({
        friends: Array.from(uniqueFriends.values()).sort((a, b) =>
          a.nickname.localeCompare(b.nickname)
        ),
      });
    };

    const processFriends = async (snapshot: any, isUserA: boolean) => {
      const friendships: Friendship[] = [];
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        const friendUid = isUserA ? data.userBUid : data.userAUid;
        const friendDoc = await getDoc(doc(db, "users", friendUid));
        if (friendDoc.exists())
          friendships.push({
            id: docSnap.id,
            friendUid,
            nickname: friendDoc.data().nickname || "Unknown",
          });
      }
      return friendships;
    };

    const qFriendsA = query(
      collection(db, "friendships"),
      where("userAUid", "==", userId),
      where("status", "==", "accepted")
    );
    const unsubA = onSnapshot(qFriendsA, async (snap) => {
      friendsA = await processFriends(snap, true);
      combineAndSetFriends();
    });
    unsubscribers.push(unsubA);

    const qFriendsB = query(
      collection(db, "friendships"),
      where("userBUid", "==", userId),
      where("status", "==", "accepted")
    );
    const unsubB = onSnapshot(qFriendsB, async (snap) => {
      friendsB = await processFriends(snap, false);
      combineAndSetFriends();
    });
    unsubscribers.push(unsubB);

    const qSent = query(
      collection(db, "friendRequests"),
      where("senderUid", "==", userId),
      where("status", "==", "pending")
    );
    const unsubSent = onSnapshot(qSent, (snapshot) => {
      set({
        sentRequestReceiverUids: snapshot.docs.map((d) => d.data().receiverUid),
      });
    });
    unsubscribers.push(unsubSent);

    getDocs(qFriendsA).finally(() => set({ isLoading: false }));
    set({
      unsubscribeListeners: () => unsubscribers.forEach((unsub) => unsub()),
    });
  },
  // Reszta akcji pozostaje bez zmian
  searchUsers: async (text: string) => {
    const currentUser = auth.currentUser;
    if (!currentUser || text.length < 3) {
      set({ searchResults: [] });
      return;
    }
    try {
      const q = query(
        collection(db, "users"),
        where("nickname", ">=", text.toLowerCase()),
        where("nickname", "<=", text.toLowerCase() + "\uf8ff"),
        limit(10)
      );
      const snapshot = await getDocs(q);
      const foundUsers = snapshot.docs
        .map((doc) => ({
          uid: doc.id,
          nickname: doc.data().nickname as string,
        }))
        .filter((user) => user.uid !== currentUser.uid);
      set({ searchResults: foundUsers });
    } catch (error) {
      console.error("Search error:", error);
    }
  },
  sendFriendRequest: async (receiverUid: string) => {
    // POPRAWKA: Pobieramy currentUser na początku akcji
    const currentUser = auth.currentUser;
    if (!currentUser) {
      Alert.alert("Error", "You must be logged in to send a friend request.");
      return;
    }

    const { friends, sentRequestReceiverUids } = get();
    if (friends.some((f) => f.friendUid === receiverUid)) {
      Alert.alert("Info", "This person is already your friend.");
      return;
    }
    if (sentRequestReceiverUids.includes(receiverUid)) {
      Alert.alert("Info", "A friend request has already been sent.");
      return;
    }

    try {
      const friendRequestRef = doc(collection(db, "friendRequests"));
      await setDoc(friendRequestRef, {
        senderUid: currentUser.uid, // Teraz currentUser jest zdefiniowane
        receiverUid,
        status: "pending",
        createdAt: serverTimestamp(),
      });
      Alert.alert("Success", "Friend request sent!");
    } catch (error) {
      console.error("Error sending friend request:", error);
      Alert.alert("Error", "Failed to send friend request.");
    }
  },

  removeFriend: async (friendshipId: string) => {
    Alert.alert(
      "Confirmation",
      "Are you sure you want to remove this friend?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "friendships", friendshipId));
              Alert.alert("Success", "Friend removed!");
            } catch (error) {
              console.error("Error removing friend:", error);
              Alert.alert("Error", "Failed to remove friend.");
            }
          },
        },
      ]
    );
  },
}));
