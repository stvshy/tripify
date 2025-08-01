// app/config/LocalCountContext.tsx
import React, { createContext, useState, useContext } from "react";

interface LocalCountContextType {
  localCount: number | null;
  setLocalCount: React.Dispatch<React.SetStateAction<number | null>>;
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
  const value = { localCount, setLocalCount };
  return (
    <LocalCountContext.Provider value={value}>
      {children}
    </LocalCountContext.Provider>
  );
};
