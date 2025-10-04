// app/config/LocalCountContext.tsx
import React, { createContext, useState, useContext, useEffect } from "react";
import { auth } from "./firebaseConfig";

interface LocalCountContextType {
  localCount: number | null;
  setLocalCount: React.Dispatch<React.SetStateAction<number | null>>;
  selectionMode: "visited" | "wishlist";
  setSelectionMode: React.Dispatch<
    React.SetStateAction<"visited" | "wishlist">
  >;
}

const LocalCountContext = createContext<LocalCountContextType | null>(null);

export const useLocalCount = () => {
  const context = useContext(LocalCountContext);
  if (!context) {
    throw new Error("useLocalCount must be used within a LocalCountProvider");
  }
  return context;
};

export const LocalCountProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [localCount, setLocalCount] = useState<number | null>(null);
  const [selectionMode, setSelectionMode] = useState<"visited" | "wishlist">(
    "visited"
  );

  // CRITICAL FIX: Clear state when user changes
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user: { uid: any }) => {
      console.log(
        "LocalCountContext: Auth state changed, user:",
        user ? user.uid : "null"
      );
      if (!user) {
        console.log(
          "LocalCountContext: User logged out, clearing local count state"
        );
        setLocalCount(null);
        setSelectionMode("visited");
      }
    });

    return unsubscribe;
  }, []);

  const value = { localCount, setLocalCount, selectionMode, setSelectionMode };
  return (
    <LocalCountContext.Provider value={value}>
      {children}
    </LocalCountContext.Provider>
  );
};
