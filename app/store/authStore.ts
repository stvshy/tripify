// app/store/authStore.ts
import { create } from "zustand";
import { User as FirebaseUser } from "firebase/auth";

// Definicja typów dla danych użytkownika, które chcesz przechowywać
export interface UserProfileData {
  nickname: string | null;
  firstLoginComplete: boolean;
  emailVerified: boolean; // Dodajmy też to, bo jest ważne
  // Możesz tu dodać inne pola, które pobierasz z dokumentu użytkownika
  // np. avatarUrl, role, etc.
}

// Definicja typu dla całego stanu store'u
interface AuthState {
  firebaseUser: FirebaseUser | null; // Aktualny obiekt użytkownika z Firebase Auth
  userProfile: UserProfileData | null; // Dane profilu z Firestore
  isLoadingAuth: boolean; // Czy trwa proces inicjalizacji/ładowania danych auth
  errorAuth: string | null; // Ewentualny błąd podczas procesu auth

  // Akcje do modyfikacji stanu
  setFirebaseUser: (user: FirebaseUser | null) => void;
  setUserProfile: (profile: UserProfileData | null) => void;
  setIsLoadingAuth: (loading: boolean) => void;
  setErrorAuth: (error: string | null) => void;
  clearAuthData: () => void; // Do wylogowania
}

// Tworzenie store'u Zustand
export const useAuthStore = create<AuthState>((set) => ({
  firebaseUser: null,
  userProfile: null,
  isLoadingAuth: true, // Początkowo zakładamy, że ładujemy
  errorAuth: null,

  setFirebaseUser: (user) => set({ firebaseUser: user }),
  setUserProfile: (profile) => set({ userProfile: profile }),
  setIsLoadingAuth: (loading) => set({ isLoadingAuth: loading }),
  setErrorAuth: (error) => set({ errorAuth: error }),

  clearAuthData: () =>
    set({
      firebaseUser: null,
      userProfile: null,
      isLoadingAuth: false, // Po wylogowaniu nie ładujemy już danych tego usera
      errorAuth: null,
    }),
}));
