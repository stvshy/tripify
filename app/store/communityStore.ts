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
  sendFriendRequest: (receiverUid: string, receiverNickname: string) => void;
  removeFriend: (friendUid: string) => void;
  acceptFriendRequest: (request: IncomingRequest) => void;
  rejectFriendRequest: (requestId: string) => void;
  cancelOutgoingRequest: (receiverUid: string) => void;
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
      // set(initialState); // Resetujemy do stanu początkowego
    },

    listenForCommunityData: () => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        console.log("[DEBUG] No user found. Cleaning up.");
        get().cleanup();
        set({ isLoading: false });
        return;
      }

      console.log(
        `[DEBUG] Starting listener setup for user: ${currentUser.uid}`
      );
      get().unsubscribeListeners();
      const userId = currentUser.uid;
      set({ isLoading: true });

      let userDocLoaded = false;
      let incomingRequestsLoaded = false;

      const checkLoadingComplete = () => {
        console.log(
          `[DEBUG] Checking loading status: userDocLoaded=${userDocLoaded}, incomingRequestsLoaded=${incomingRequestsLoaded}`
        );
        if (userDocLoaded && incomingRequestsLoaded) {
          console.log(
            "[DEBUG] Both listeners loaded. Setting isLoading to false."
          );
          set({ isLoading: false });
        }
      };

      const unsubscribers: (() => void)[] = [];

      // --- Listener 1: Dokument użytkownika ---
      const userDocRef = doc(db, "users", userId);
      console.log(
        `[DEBUG] Attaching listener to user document: users/${userId}`
      );
      const unsubUserDoc = onSnapshot(
        userDocRef,
        (snapshot) => {
          console.log("[DEBUG] SUCCESS: User document snapshot received.");
          const userData = snapshot.exists() ? snapshot.data() : {};
          const friendsList: Friendship[] = userData.friends || [];
          const outgoingList: OutgoingRequest[] =
            userData.friendRequests?.outgoing || [];

          set({
            friends: friendsList,
            outgoingRequests: outgoingList,
          });

          userDocLoaded = true;
          checkLoadingComplete();
        },
        (error) => {
          console.error("[DEBUG] ERROR in userDoc listener:", error);
          userDocLoaded = true; // Traktujemy błąd jako "zakończenie" ładowania
          checkLoadingComplete();
        }
      );
      unsubscribers.push(unsubUserDoc);

      // --- Listener 2: Podkolekcja z zaproszeniami ---
      const incomingCollectionRef = collection(
        db,
        "users",
        userId,
        "incomingFriendRequests"
      );
      console.log(
        `[DEBUG] Attaching listener to subcollection: users/${userId}/incomingFriendRequests`
      );
      const unsubIncoming = onSnapshot(
        incomingCollectionRef,
        (snapshot) => {
          console.log(
            `[DEBUG] SUCCESS: Incoming requests snapshot received. Found ${snapshot.docs.length} requests.`
          );
          const incomingList: IncomingRequest[] = snapshot.docs.map(
            (d) =>
              ({
                id: d.id,
                ...d.data(),
              }) as IncomingRequest
          );

          set({ incomingRequests: incomingList });

          incomingRequestsLoaded = true;
          checkLoadingComplete();
        },
        (error) => {
          console.error("[DEBUG] ERROR in incomingRequests listener:", error);
          incomingRequestsLoaded = true; // Traktujemy błąd jako "zakończenie" ładowania
          checkLoadingComplete();
        }
      );
      unsubscribers.push(unsubIncoming);

      set({
        unsubscribeListeners: () => {
          console.log("[DEBUG] Cleaning up listeners.");
          unsubscribers.forEach((unsub) => unsub());
        },
      });
    },
    // ====================================================================
    // KROK 3: Akcje dostosowane do nowej, zdenormalizowanej struktury
    // ====================================================================
    acceptFriendRequest: (request: IncomingRequest) => {
      // UWAGA: Brak `async`! Funkcja jest teraz synchroniczna.
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const { id: requestId, senderUid, senderNickname } = request;

      // KROK 1: Zapisz obecny stan, aby móc go przywrócić w razie błędu.
      const { friends, incomingRequests } = get();
      const originalState = { friends, incomingRequests };

      // KROK 2: Przygotuj "optymistyczny" stan.
      const newFriend: Friendship = {
        uid: senderUid,
        nickname: senderNickname,
      };
      const optimisticFriends = [...friends, newFriend];
      const optimisticRequests = incomingRequests.filter(
        (req) => req.id !== requestId
      );

      // KROK 3: NATYCHMIAST zaktualizuj UI i ZAKOŃCZ DZIAŁANIE FUNKCJI.
      set({
        friends: optimisticFriends,
        incomingRequests: optimisticRequests,
        isLoading: false,
      });

      // KROK 4: Zdefiniuj i uruchom operację w bazie danych w tle (fire-and-forget).
      const performDatabaseUpdate = async () => {
        try {
          const currentUserDoc = await getDoc(
            doc(db, "users", currentUser.uid)
          );
          const currentUserNickname =
            currentUserDoc.data()?.nickname || "Unknown";

          const batch = writeBatch(db);

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

          const incomingRequestRef = doc(
            db,
            "users",
            currentUser.uid,
            "incomingFriendRequests",
            requestId
          );
          batch.delete(incomingRequestRef);

          const senderDoc = await getDoc(senderUserRef);
          if (senderDoc.exists()) {
            const senderData = senderDoc.data();
            const outgoingRequests = senderData.friendRequests?.outgoing || [];
            const updatedOutgoingRequests = outgoingRequests.filter(
              (req: { receiverUid: string }) =>
                req.receiverUid !== currentUser.uid
            );
            batch.update(senderUserRef, {
              "friendRequests.outgoing": updatedOutgoingRequests,
            });
          }

          await batch.commit();
          // Jeśli się uda, nic więcej nie robimy.
        } catch (error) {
          // KROK 5: W razie błędu, cofnij zmianę w UI.
          console.error("Optimistic update failed, rolling back UI:", error);
          Alert.alert(
            "Error",
            "Could not accept the friend request. Please try again."
          );
          set(originalState);
        }
      };

      // Uruchamiamy operację, ale na nią nie czekamy!
      performDatabaseUpdate();
    },

    rejectFriendRequest: (requestId: string) => {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      // KROK 1: Zapisz stan
      const originalIncomingRequests = get().incomingRequests;

      // KROK 2: Stwórz stan optymistyczny
      const optimisticIncomingRequests = originalIncomingRequests.filter(
        (req) => req.id !== requestId
      );

      // KROK 3: Aktualizuj UI
      set({ incomingRequests: optimisticIncomingRequests });

      // KROK 4: Operacja w tle
      const performDatabaseUpdate = async () => {
        try {
          const requestRef = doc(
            db,
            "users",
            currentUser.uid,
            "incomingFriendRequests",
            requestId
          );
          await deleteDoc(requestRef);
        } catch (error) {
          // KROK 5: Rollback
          console.error(
            "Optimistic rejectFriendRequest failed, rolling back UI:",
            error
          );
          Alert.alert(
            "Error",
            "Could not reject the request. Please try again."
          );
          set({ incomingRequests: originalIncomingRequests });
        }
      };

      performDatabaseUpdate();
    },

    removeFriend: (friendUid: string) => {
      const currentUser = auth.currentUser;
      if (!currentUser) return;
      const currentUid = currentUser.uid;
      const { friends: originalFriends } = get();
      const optimisticFriends = originalFriends.filter(
        (friend) => friend.uid !== friendUid
      );
      set({ friends: optimisticFriends });

      const performDatabaseUpdate = async () => {
        try {
          await runTransaction(db, async (transaction) => {
            const currentUserRef = doc(db, "users", currentUid);
            const friendUserRef = doc(db, "users", friendUid);
            const [currentUserDoc, friendUserDoc] = await Promise.all([
              transaction.get(currentUserRef),
              transaction.get(friendUserRef),
            ]);
            if (!currentUserDoc.exists() || !friendUserDoc.exists())
              throw "User document not found.";
            const updatedCurrentUserFriends = (
              currentUserDoc.data().friends || []
            ).filter((f: Friendship) => f.uid !== friendUid);
            transaction.update(currentUserRef, {
              friends: updatedCurrentUserFriends,
            });
            const updatedFriendUserFriends = (
              friendUserDoc.data().friends || []
            ).filter((f: Friendship) => f.uid !== currentUid);
            transaction.update(friendUserRef, {
              friends: updatedFriendUserFriends,
            });
          });
        } catch (error) {
          console.error(
            "Optimistic removeFriend failed, rolling back UI:",
            error
          );
          Alert.alert("Error", "Could not remove friend.");
          set({ friends: originalFriends });
        }
      };
      performDatabaseUpdate();
    },

    // app/store/communityStore.ts

    sendFriendRequest: (receiverUid: string, receiverNickname: string) => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        Alert.alert("Error", "Not logged in.");
        return;
      }

      // Sprawdzamy warunki wstępne
      const { friends, outgoingRequests, incomingRequests } = get();
      if (
        receiverUid === currentUser.uid ||
        friends.some((f) => f.uid === receiverUid) ||
        outgoingRequests.some((r) => r.receiverUid === receiverUid) ||
        incomingRequests.some((r) => r.senderUid === receiverUid)
      ) {
        // Cicha porażka lub alert, jeśli któryś warunek jest spełniony
        console.log("Friend request condition not met, aborting.");
        return;
      }

      // KROK 1: Zapisz obecny stan dla ewentualnego przywrócenia
      const originalOutgoingRequests = get().outgoingRequests;

      // KROK 2: Przygotuj optymistyczny stan
      const newOutgoingRequest: OutgoingRequest = {
        receiverUid,
        receiverNickname,
      };
      const optimisticOutgoingRequests = [
        ...originalOutgoingRequests,
        newOutgoingRequest,
      ];

      // KROK 3: NATYCHMIAST zaktualizuj UI
      set({ outgoingRequests: optimisticOutgoingRequests });

      // KROK 4: Wykonaj operację w bazie danych w tle (fire-and-forget)
      const performDatabaseUpdate = async () => {
        try {
          const currentUserDoc = await getDoc(
            doc(db, "users", currentUser.uid)
          );
          const currentUserNickname = currentUserDoc.data()?.nickname;
          if (!currentUserNickname)
            throw new Error("Current user nickname not found.");

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
          batch.update(currentUserRef, {
            "friendRequests.outgoing": arrayUnion(newOutgoingRequest),
          });

          await batch.commit();
          // Sukces! UI jest już poprawny.
        } catch (error) {
          // KROK 5: W razie błędu, cofnij zmianę w UI i poinformuj użytkownika
          console.error(
            "Optimistic sendFriendRequest failed, rolling back UI:",
            error
          );
          Alert.alert(
            "Error",
            "Could not send friend request. Please try again."
          );
          set({ outgoingRequests: originalOutgoingRequests });
        }
      };

      performDatabaseUpdate(); // Uruchamiamy, ale nie czekamy na wynik
    },

    cancelOutgoingRequest: (receiverUid: string) => {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      // KROK 1: Zapisz obecny stan dla ewentualnego przywrócenia
      const originalOutgoingRequests = get().outgoingRequests;

      // KROK 2: Przygotuj optymistyczny stan (usuń zaproszenie z listy)
      const optimisticOutgoingRequests = originalOutgoingRequests.filter(
        (req) => req.receiverUid !== receiverUid
      );

      // KROK 3: NATYCHMIAST zaktualizuj UI
      set({ outgoingRequests: optimisticOutgoingRequests });

      // KROK 4: Wykonaj operację w bazie danych w tle
      const performDatabaseUpdate = async () => {
        try {
          const batch = writeBatch(db);

          // 1. Usuń zaproszenie z podkolekcji `incomingFriendRequests` odbiorcy
          const incomingRequestsRef = collection(
            db,
            "users",
            receiverUid,
            "incomingFriendRequests"
          );
          const q = query(
            incomingRequestsRef,
            where("senderUid", "==", currentUser.uid),
            limit(1)
          );
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            batch.delete(querySnapshot.docs[0].ref);
          }

          // 2. Zaktualizuj tablicę `outgoing` u nadawcy
          const currentUserRef = doc(db, "users", currentUser.uid);
          batch.update(currentUserRef, {
            "friendRequests.outgoing": optimisticOutgoingRequests,
          });

          await batch.commit();
        } catch (error) {
          // KROK 5: W razie błędu, cofnij zmianę w UI
          console.error(
            "Optimistic cancelOutgoingRequest failed, rolling back UI:",
            error
          );
          Alert.alert("Error", "Failed to cancel request. Please try again.");
          set({ outgoingRequests: originalOutgoingRequests });
        }
      };

      performDatabaseUpdate();
    },
    // searchUsers pozostaje bez zmian (to jest operacja odczytu, więc musi być async)
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
        const foundUsers = querySnapshot.docs
          .map((doc) => ({
            uid: doc.id,
            nickname: doc.data().nickname as string,
          }))
          .filter((user) => user.uid !== currentUser.uid);
        set({ searchResults: foundUsers, isSearching: false });
      } catch (error) {
        set({ searchResults: [], isSearching: false });
      }
    },
  })
);
