// app/store/authStore.ts
import { create } from "zustand";
import { User as FirebaseUser } from "firebase/auth";
import { db } from "../config/firebaseConfig";
import { collection, query, where, onSnapshot } from "firebase/firestore";

export interface UserProfileData {
  nickname: string | null;
  firstLoginComplete: boolean;
  emailVerified: boolean;
}

// POPRAWKA: Dodajemy nowe pola i akcje do interfejsów
interface AuthState {
  firebaseUser: FirebaseUser | null;
  userProfile: UserProfileData | null;
  isLoadingAuth: boolean;
  errorAuth: string | null;
  friendRequestsCount: number; // <-- NOWE POLE
  unsubscribeRequests?: () => void; // <-- NOWE POLE
}

interface AuthActions {
  setFirebaseUser: (user: FirebaseUser | null) => void;
  setUserProfile: (profile: UserProfileData | null) => void;
  setIsLoadingAuth: (loading: boolean) => void;
  setErrorAuth: (error: string | null) => void;
  clearAuthData: () => void;
  listenToFriendRequests: (uid: string) => void; // <-- NOWA AKCJA
}

export const useAuthStore = create<AuthState & AuthActions>((set, get) => ({
  // --- Istniejący stan ---
  firebaseUser: null,
  userProfile: null,
  isLoadingAuth: true,
  errorAuth: null,

  // --- NOWY STAN ---
  friendRequestsCount: 0,
  unsubscribeRequests: undefined,

  // --- Istniejące akcje ---
  setFirebaseUser: (user) => set({ firebaseUser: user }),
  setUserProfile: (profile) => set({ userProfile: profile }),
  setIsLoadingAuth: (loading) => set({ isLoadingAuth: loading }),
  setErrorAuth: (error) => set({ errorAuth: error }),

  clearAuthData: () => {
    get().unsubscribeRequests?.(); // Anuluj subskrypcję przy wylogowaniu
    set({
      firebaseUser: null,
      userProfile: null,
      isLoadingAuth: false,
      friendRequestsCount: 0, // Zresetuj licznik
      unsubscribeRequests: undefined,
    });
  },

  // --- NOWA AKCJA ---
  listenToFriendRequests: (uid: string) => {
    // Anuluj poprzednią subskrypcję, jeśli istnieje, by uniknąć wycieków
    get().unsubscribeRequests?.();

    const q = query(
      collection(db, "friendRequests"),
      where("receiverUid", "==", uid),
      where("status", "==", "pending")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        set({ friendRequestsCount: snapshot.size });
      },
      (error) => {
        console.error("Error listening to friend requests:", error);
        set({ friendRequestsCount: 0 });
      }
    );

    // Zapisz nową funkcję anulowania subskrypcji
    set({ unsubscribeRequests: unsubscribe });
  },
}));
