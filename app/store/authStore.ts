// app/store/authStore.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware"; // <-- POPRAWKA: Dodano importy
import { User as FirebaseUser } from "firebase/auth";
import { storage } from "../config/storage";

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
  setFirebaseUser: (user: FirebaseUser | null) => void;
  setUserProfile: (profile: UserProfileData | null) => void;
  setIsLoadingAuth: (loading: boolean) => void;
  setErrorAuth: (error: string | null) => void;
  clearAuthData: () => void;
}

export const useAuthStore = create<AuthState>()(
  // <-- POPRAWKA: Dodano <AuthState>() dla lepszego typowania
  persist(
    (set) => ({
      firebaseUser: null,
      userProfile: null,
      isLoadingAuth: true,
      errorAuth: null,
      setFirebaseUser: (user) => set({ firebaseUser: user }),
      setUserProfile: (profile) => set({ userProfile: profile }),
      setIsLoadingAuth: (loading) => set({ isLoadingAuth: loading }),
      setErrorAuth: (error) => set({ errorAuth: error }),
      clearAuthData: () => set({ firebaseUser: null, userProfile: null }),
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => ({
        setItem: (name: string, value: string) => {
          return storage.set(name, value);
        },
        getItem: (name: string) => {
          const value = storage.getString(name);
          return value ?? null;
        },
        removeItem: (name: string) => {
          return storage.delete(name);
        },
      })),
      partialize: (state) => ({
        firebaseUser: state.firebaseUser,
        userProfile: state.userProfile,
      }),
    }
  )
);
