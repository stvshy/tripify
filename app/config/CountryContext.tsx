// app/config/CountryContext.tsx
import React, {
  createContext,
  useState,
  useEffect,
  ReactNode,
  useContext,
} from "react";
import { auth, db } from "./firebaseConfig";
import { doc, onSnapshot } from "firebase/firestore";

// Definicja interfejsu dla kontekstu
interface CountryContextProps {
  visitedCountries: string[];
  visitedCountriesCount: number;
  setVisitedCountries: (countries: string[]) => void;
}

// Utworzenie kontekstu z domyślnymi wartościami
const CountryContext = createContext<CountryContextProps>({
  visitedCountries: [],
  visitedCountriesCount: 0,
  setVisitedCountries: () => {},
});

// Definicja propsów dla providera
interface CountryProviderProps {
  children: ReactNode;
}

// Provider kontekstu zarządzający stanem odwiedzonych krajów
export const CountriesProvider: React.FC<CountryProviderProps> = ({
  children,
}) => {
  const [visitedCountries, setVisitedCountries] = useState<string[]>([]);

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      const userDocRef = doc(db, "users", user.uid);
      const unsubscribe = onSnapshot(userDocRef, (docSnapshot) => {
        if (docSnapshot.exists()) {
          const data = docSnapshot.data();
          setVisitedCountries(data.countriesVisited || []);
        }
      });

      return () => unsubscribe();
    }
  }, []);

  return (
    <CountryContext.Provider
      value={{
        visitedCountries,
        visitedCountriesCount: visitedCountries.length,
        setVisitedCountries,
      }}
    >
      {children}
    </CountryContext.Provider>
  );
};

// Hook do korzystania z kontekstu
export const useCountries = () => useContext(CountryContext);
