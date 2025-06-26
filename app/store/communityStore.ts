import { create } from "zustand";
import { db, auth } from "../config/firebaseConfig";
import {
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
  doc,
  limit,
  deleteDoc,
  writeBatch,
  serverTimestamp,
  updateDoc,
  arrayUnion,
  getDoc,
  runTransaction,
} from "firebase/firestore";
import { Alert } from "react-native";

// --- TYPY I INTERFEJSY --- (bez zmian)
export interface User {
  uid: string;
  nickname: string;
}
export interface Friendship {
  uid: string;
  nickname: string;
}
export interface IncomingRequest {
  id: string;
  senderUid: string;
  senderNickname: string;
}
export interface OutgoingRequest {
  receiverUid: string;
  receiverNickname: string;
}

interface CommunityState {
  friends: Friendship[];
  incomingRequests: IncomingRequest[];
  outgoingRequests: OutgoingRequest[];
  searchResults: User[];
  isSearching: boolean; // Stan ładowania dla wyszukiwania
  isLoading: boolean;
  unsubscribeListeners: () => void;
}

interface CommunityActions {
  listenForCommunityData: () => void;
  cleanup: () => void;
  searchUsers: (text: string) => Promise<void>;
  sendFriendRequest: (
    receiverUid: string,
    receiverNickname: string
  ) => Promise<void>;
  removeFriend: (friendUid: string) => Promise<void>;
  acceptFriendRequest: (request: IncomingRequest) => Promise<void>;
  rejectFriendRequest: (requestId: string) => Promise<void>;
  cancelOutgoingRequest: (receiverUid: string) => Promise<void>;
}

// --- STAN POCZĄTKOWY ---
const initialState: CommunityState = {
  friends: [],
  incomingRequests: [],
  outgoingRequests: [],
  searchResults: [],
  isSearching: false, // Poprawiona wartość początkowa
  isLoading: true,
  unsubscribeListeners: () => {},
};

// --- TWORZENIE STORE'U ---
export const useCommunityStore = create<CommunityState & CommunityActions>()(
  (set, get) => ({
    ...initialState, // Rozpoczynamy od stanu początkowego

    // --- AKCJE ---

    cleanup: () => {
      console.log("CommunityStore: Running cleanup, unsubscribing listeners.");
      get().unsubscribeListeners();
      set(initialState); // Resetujemy do stanu początkowego
    },

    listenForCommunityData: () => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        set({ isLoading: false });
        get().cleanup();
        return;
      }

      get().unsubscribeListeners();
      const userId = currentUser.uid;
      const unsubscribers: (() => void)[] = [];
      set({ isLoading: true });

      const userDocRef = doc(db, "users", userId);

      const unsubUserDoc = onSnapshot(
        userDocRef,
        (snapshot) => {
          const userData = snapshot.exists() ? snapshot.data() : {};
          const friendsList: Friendship[] = userData.friends || [];
          const outgoingList: OutgoingRequest[] =
            userData.friendRequests?.outgoing || [];
          set({
            friends: friendsList,
            outgoingRequests: outgoingList,
            isLoading: false,
          });
        },
        (error) => {
          console.error("Error in userDoc listener:", error);
          set({ isLoading: false });
        }
      );
      unsubscribers.push(unsubUserDoc);

      const incomingCollectionRef = collection(
        db,
        "users",
        userId,
        "incomingFriendRequests"
      );
      // communityStore.ts -> listenForCommunityData

      const unsubIncoming = onSnapshot(
        incomingCollectionRef,
        (snapshot) => {
          // Usunęliśmy 'async'
          const incomingList: IncomingRequest[] = snapshot.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              senderUid: data.senderUid,
              senderNickname: data.senderNickname || "Unknown", // <--- Pobieramy bezpośrednio
            };
          });
          set({ incomingRequests: incomingList });
        },
        (error) => console.error("Error in incomingRequests listener:", error)
      );
      unsubscribers.push(unsubIncoming);

      set({
        unsubscribeListeners: () => unsubscribers.forEach((unsub) => unsub()),
      });
    },
    // ====================================================================
    // KROK 3: Akcje dostosowane do nowej, zdenormalizowanej struktury
    // ====================================================================
    acceptFriendRequest: async (request: IncomingRequest) => {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const { id: requestId, senderUid, senderNickname } = request;

      // Pobierz nick bieżącego użytkownika, by zapisać go u nowego znajomego
      const currentUserDoc = await getDoc(doc(db, "users", currentUser.uid));
      const currentUserNickname = currentUserDoc.data()?.nickname || "Unknown";

      const batch = writeBatch(db);

      // 1. Dodaj OBIEKTY {uid, nickname} do tablic `friends` obu użytkowników
      const currentUserRef = doc(db, "users", currentUser.uid);
      batch.update(currentUserRef, {
        friends: arrayUnion({ uid: senderUid, nickname: senderNickname }),
      });

      const senderUserRef = doc(db, "users", senderUid);
      batch.update(senderUserRef, {
        friends: arrayUnion({
          uid: currentUser.uid,
          nickname: currentUserNickname,
        }),
      });

      // 2. Usuń zaproszenie z podkolekcji `incomingFriendRequests`
      const incomingRequestRef = doc(
        db,
        "users",
        currentUser.uid,
        "incomingFriendRequests",
        requestId
      );
      batch.delete(incomingRequestRef);

      // 3. Usuń zaproszenie z tablicy `outgoing` u nadawcy
      const senderDoc = await getDoc(senderUserRef);
      if (senderDoc.exists()) {
        const senderData = senderDoc.data();
        const outgoingRequests = senderData.friendRequests?.outgoing || [];
        const updatedOutgoingRequests = outgoingRequests.filter(
          (req: any) => req.receiverUid !== currentUser.uid
        );
        batch.update(senderUserRef, {
          "friendRequests.outgoing": updatedOutgoingRequests,
        });
      }

      await batch.commit();
      Alert.alert("Success", "Friend added!");
    },

    rejectFriendRequest: async (requestId: string) => {
      const currentUser = auth.currentUser;
      if (!currentUser) return;
      const requestRef = doc(
        db,
        "users",
        currentUser.uid,
        "incomingFriendRequests",
        requestId
      );
      await deleteDoc(requestRef);
      Alert.alert("Rejected", "Friend request rejected.");
    },

    removeFriend: async (friendUid: string) => {
      const currentUser = auth.currentUser;
      if (!currentUser) return;
      const currentUid = currentUser.uid;

      try {
        // Używamy transakcji, aby bezpiecznie odczytać i zapisać dane
        await runTransaction(db, async (transaction) => {
          const currentUserRef = doc(db, "users", currentUid);
          const friendUserRef = doc(db, "users", friendUid);

          // Odczytujemy dokumenty WEWNĄTRZ transakcji
          const currentUserDoc = await transaction.get(currentUserRef);
          const friendUserDoc = await transaction.get(friendUserRef);

          if (!currentUserDoc.exists() || !friendUserDoc.exists()) {
            throw "Jeden z dokumentów użytkownika nie istnieje.";
          }

          // Modyfikujemy listę znajomych dla bieżącego użytkownika
          const currentUserFriends = currentUserDoc.data().friends || [];
          const updatedCurrentUserFriends = currentUserFriends.filter(
            (friend: Friendship) => friend.uid !== friendUid
          );
          transaction.update(currentUserRef, {
            friends: updatedCurrentUserFriends,
          });

          // Modyfikujemy listę znajomych dla drugiego użytkownika
          const friendUserFriends = friendUserDoc.data().friends || [];
          const updatedFriendUserFriends = friendUserFriends.filter(
            (friend: Friendship) => friend.uid !== currentUid
          );
          transaction.update(friendUserRef, {
            friends: updatedFriendUserFriends,
          });
        });

        Alert.alert("Success", "Friend removed.");
      } catch (error) {
        console.error("Error removing friend with transaction:", error);
        Alert.alert("Error", "Could not remove friend.");
      }
    },

    // app/store/communityStore.ts

    // app/store/communityStore.ts

    sendFriendRequest: async (
      receiverUid: string,
      receiverNickname: string
    ) => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        Alert.alert("Error", "Not logged in.");
        return;
      }

      // Bezpiecznik: nie wysyłaj zaproszenia do samego siebie
      if (receiverUid === currentUser.uid) {
        Alert.alert("Info", "You cannot send a friend request to yourself.");
        return;
      }

      // Bezpiecznik: sprawdź, czy już nie jesteście znajomymi lub czy zaproszenie nie wisi
      const { friends, outgoingRequests } = get();
      if (friends.some((friend) => friend.uid === receiverUid)) {
        Alert.alert("Info", "This person is already your friend.");
        return;
      }
      if (outgoingRequests.some((req) => req.receiverUid === receiverUid)) {
        Alert.alert("Info", "You have already sent a request to this person.");
        return;
      }

      try {
        const currentUserDoc = await getDoc(doc(db, "users", currentUser.uid));
        const currentUserNickname = currentUserDoc.data()?.nickname;

        if (!currentUserNickname) {
          Alert.alert("Error", "Your profile is incomplete.");
          return;
        }

        const batch = writeBatch(db);

        const incomingRequestRef = doc(
          collection(db, "users", receiverUid, "incomingFriendRequests")
        );
        batch.set(incomingRequestRef, {
          senderUid: currentUser.uid,
          senderNickname: currentUserNickname,
          createdAt: serverTimestamp(),
        });

        const currentUserRef = doc(db, "users", currentUser.uid);
        const newOutgoingRequest = { receiverUid, receiverNickname }; // Tworzymy obiekt nowego zaproszenia
        batch.update(currentUserRef, {
          "friendRequests.outgoing": arrayUnion(newOutgoingRequest),
        });

        await batch.commit(); // Wykonujemy operacje na bazie

        // ----  NOWA, KLUCZOWA CZĘŚĆ: OPTYMISTYCZNA AKTUALIZACJA STANU ----
        set((state) => ({
          outgoingRequests: [...state.outgoingRequests, newOutgoingRequest],
        }));
        // ------------------------------------------------------------------

        Alert.alert("Success", `Friend request sent to ${receiverNickname}.`);
      } catch (error) {
        console.error("Error sending friend request:", error);
        Alert.alert(
          "Error",
          "Could not send friend request. Please try again."
        );
      }
    },
    cancelOutgoingRequest: async (receiverUid: string) => {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const batch = writeBatch(db);
      try {
        // 1. Usuń zaproszenie z podkolekcji `incomingFriendRequests` odbiorcy
        const incomingRequestsRef = collection(
          db,
          "users",
          receiverUid,
          "incomingFriendRequests"
        );
        const q = query(
          incomingRequestsRef,
          where("senderUid", "==", currentUser.uid)
        );
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          batch.delete(querySnapshot.docs[0].ref);
        }

        // 2. Odczytaj, przefiltruj i nadpisz tablicę `outgoing` u nadawcy
        const currentUserRef = doc(db, "users", currentUser.uid);
        const userDoc = await getDoc(currentUserRef);
        if (userDoc.exists()) {
          const outgoingRequests: OutgoingRequest[] =
            userDoc.data().friendRequests?.outgoing || [];
          const updatedOutgoing = outgoingRequests.filter(
            (req) => req.receiverUid !== receiverUid
          );
          batch.update(currentUserRef, {
            "friendRequests.outgoing": updatedOutgoing,
          });
        }

        await batch.commit();
        Alert.alert("Canceled", "Friend request has been canceled.");
      } catch (error) {
        console.error("Error canceling outgoing request:", error);
        Alert.alert("Error", "Failed to cancel request.");
      }
    },

    searchUsers: async (text: string) => {
      const currentUser = auth.currentUser;
      const trimmedText = text.trim();

      if (!currentUser || trimmedText.length < 3) {
        set({ searchResults: [], isSearching: false });
        return;
      }

      set({ isSearching: true });

      try {
        const usersRef = collection(db, "users");
        const q = query(
          usersRef,
          where("nickname_tokens", "array-contains", trimmedText.toLowerCase()),
          limit(20)
        );
        const querySnapshot = await getDocs(q);
        const foundUsers: User[] = querySnapshot.docs
          .map((doc) => ({
            uid: doc.id,
            nickname: doc.data().nickname as string,
          }))
          .filter((user) => user.uid !== currentUser.uid);

        set({ searchResults: foundUsers, isSearching: false }); // POPRAWKA z isLoading na isSearching
      } catch (error) {
        console.error("Błąd podczas wyszukiwania użytkowników:", error);
        set({ searchResults: [], isSearching: false }); // POPRAWKA z isLoading na isSearching
      }
    },
  })
);
