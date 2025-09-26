import { create } from "zustand";
import { User as FirebaseUser } from "firebase/auth";
import { db } from "../config/firebaseConfig";
import { collection, query, where, onSnapshot } from "firebase/firestore";

export interface UserProfileData {
  nickname: string | null;
  firstLoginComplete: boolean;
  emailVerified: boolean;
}
interface AuthState {
  firebaseUser: FirebaseUser | null;
  userProfile: UserProfileData | null;
  isLoadingAuth: boolean;
  errorAuth: string | null;
  friendRequestsCount: number;
  unsubscribeRequests?: () => void;
}
interface AuthActions {
  setFirebaseUser: (user: FirebaseUser | null) => void;
  setUserProfile: (profile: UserProfileData | null) => void;
  setIsLoadingAuth: (loading: boolean) => void;
  setErrorAuth: (error: string | null) => void;
  clearAuthData: () => void;
  listenToFriendRequests: (uid: string) => void;
}

const initialState: AuthState = {
  firebaseUser: null,
  userProfile: null,
  isLoadingAuth: true,
  errorAuth: null,
  friendRequestsCount: 0,
  unsubscribeRequests: undefined,
};

export const useAuthStore = create<AuthState & AuthActions>()((set, get) => ({
  ...initialState,
  setFirebaseUser: (user) => set({ firebaseUser: user }),
  setUserProfile: (profile) => set({ userProfile: profile }),
  setIsLoadingAuth: (loading) => set({ isLoadingAuth: loading }),
  setErrorAuth: (error) => set({ errorAuth: error }),
  clearAuthData: () => {
    get().unsubscribeRequests?.();
    set(initialState);
  },
  listenToFriendRequests: (uid: string) => {
    get().unsubscribeRequests?.();
    try {
      const requestsRef = collection(
        db,
        "users",
        uid,
        "incomingFriendRequests"
      );
      const unsubscribe = onSnapshot(
        requestsRef,
        (snapshot) => {
          set({ friendRequestsCount: snapshot.size });
        },
        (error) => {
          // Silently handle permission errors - user might not have access yet
          if (error.code === "permission-denied") {
            console.log("Friend requests collection not accessible yet");
            set({ friendRequestsCount: 0 });
          } else {
            console.error("Error listening to friend requests count:", error);
            set({ friendRequestsCount: 0 });
          }
        }
      );
      set({ unsubscribeRequests: unsubscribe });
    } catch (error) {
      console.log("Friend requests listener setup failed:", error);
      set({ friendRequestsCount: 0 });
    }
  },
}));
