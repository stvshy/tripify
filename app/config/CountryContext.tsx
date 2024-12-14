// app/context/CountriesContext.tsx
import React, { createContext, useState, useEffect, useContext } from 'react';
import { auth, db } from '../config/firebaseConfig';
import { doc, onSnapshot } from 'firebase/firestore';
import { User } from 'firebase/auth';

// Define the shape of the context
interface CountriesContextProps {
  visitedCountriesCount: number;
}

// Create the context with a default value
const CountriesContext = createContext<CountriesContextProps>({
  visitedCountriesCount: 0,
});

// Provider component
interface CountriesProviderProps {
  children: React.ReactNode;
}

export const CountriesProvider: React.FC<CountriesProviderProps> = ({ children }) => {
  const [visitedCountriesCount, setVisitedCountriesCount] = useState<number>(0);

  useEffect(() => {
    const currentUser: User | null = auth.currentUser;

    if (currentUser) {
      const userDocRef = doc(db, 'users', currentUser.uid);

      // Set up real-time listener for the user's document
      const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
          const userData = docSnap.data();
          const countriesVisited: string[] = userData.countriesVisited || [];
          setVisitedCountriesCount(countriesVisited.length);
          console.log(`CountriesContext: Visited countries count updated: ${countriesVisited.length}`);
        } else {
          setVisitedCountriesCount(0);
          console.log('CountriesContext: User document does not exist.');
        }
      });

      // Clean up the listener on unmount
      return () => unsubscribe();
    }
  }, []);

  return (
    <CountriesContext.Provider value={{ visitedCountriesCount }}>
      {children}
    </CountriesContext.Provider>
  );
};

// Custom hook for consuming the context
export const useCountries = () => useContext(CountriesContext);
