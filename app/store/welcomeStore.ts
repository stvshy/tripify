import { create } from "zustand";

interface WelcomeState {
  errorMessage: string | null;
  verificationMessage: string | null;
  resendTimer: number;
  identifier: string;
  password: string;
  showPassword: boolean;
  isFocused: {
    identifier: boolean;
    password: boolean;
  };
  isLoading: boolean;
  emailError: string | null;
  shouldShowFadeIn: boolean; // Nowa flaga dla animacji fade
}

interface WelcomeActions {
  setErrorMessage: (message: string | null) => void;
  setVerificationMessage: (message: string | null) => void;
  setResendTimer: (timer: number) => void;
  setIdentifier: (identifier: string) => void;
  setPassword: (password: string) => void;
  setShowPassword: (show: boolean) => void;
  setIsFocused: (focused: { identifier: boolean; password: boolean }) => void;
  setIsLoading: (loading: boolean) => void;
  setEmailError: (error: string | null) => void;
  clearWelcomeState: () => void;
  resetForm: () => void;
  resetOnEntry: () => void;
  setShouldShowFadeIn: (show: boolean) => void;
}

const initialState: WelcomeState = {
  errorMessage: null,
  verificationMessage: null,
  resendTimer: 0,
  identifier: "",
  password: "",
  showPassword: false,
  isFocused: {
    identifier: false,
    password: false,
  },
  isLoading: false,
  emailError: null,
  shouldShowFadeIn: false, // Domyślnie false
};

export const useWelcomeStore = create<WelcomeState & WelcomeActions>()(
  (set, get) => ({
    ...initialState,
    setErrorMessage: (message) => set({ errorMessage: message }),
    setVerificationMessage: (message) => set({ verificationMessage: message }),
    setResendTimer: (timer) => set({ resendTimer: timer }),
    setIdentifier: (identifier) => set({ identifier }),
    setPassword: (password) => set({ password }),
    setShowPassword: (show) => set({ showPassword: show }),
    setIsFocused: (focused) => set({ isFocused: focused }),
    setIsLoading: (loading) => set({ isLoading: loading }),
    setEmailError: (error) => set({ emailError: error }),
    clearWelcomeState: () => set(initialState),
    resetForm: () =>
      set({
        identifier: "",
        password: "",
        showPassword: false,
        isFocused: { identifier: false, password: false },
        isLoading: false,
        emailError: null,
      }),
    resetOnEntry: () => set(initialState), // Reset wszystkiego przy wejściu na welcome
    setShouldShowFadeIn: (show) => set({ shouldShowFadeIn: show }),
  })
);
