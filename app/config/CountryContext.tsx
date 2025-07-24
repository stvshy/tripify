// app/config/CountryContext.tsx
import React, {
  createContext,
  useState,
  useEffect,
  ReactNode,
  useContext,
  Dispatch, // ZMIANA: Importuj Dispatch i SetStateAction
  SetStateAction,
} from "react";
import { auth, db } from "./firebaseConfig";
import { doc, onSnapshot } from "firebase/firestore";

interface CountryContextProps {
  visitedCountries: string[];
  visitedCountriesCount: number;
  // ZMIANA: Poprawiony typ funkcji. Teraz akceptuje zarówno nową wartość,
  // jak i funkcję aktualizującą (prevState => newState).
  setVisitedCountries: Dispatch<SetStateAction<string[]>>;
}

const CountryContext = createContext<CountryContextProps>({
  visitedCountries: [],
  visitedCountriesCount: 0,
  setVisitedCountries: () => {}, // Domyślna funkcja pozostaje bez zmian
});

interface CountryProviderProps {
  children: ReactNode;
}

export const CountriesProvider: React.FC<CountryProviderProps> = ({
  children,
}) => {
  const [visitedCountries, setVisitedCountries] = useState<string[]>([]);

  useEffect(() => {
    // onSnapshot będzie aktualizował stan, gdy tylko dane w Firestore się zmienią,
    // więc nie potrzebujemy dodatkowego fetchowania w ChooseCountriesScreen.
    const user = auth.currentUser;
    if (user) {
      const userDocRef = doc(db, "users", user.uid);
      const unsubscribe = onSnapshot(userDocRef, (docSnapshot) => {
        if (docSnapshot.exists()) {
          const data = docSnapshot.data();
          const countriesFromDb = data.countriesVisited || [];
          // Porównujemy, żeby uniknąć niepotrzebnych re-renderów, jeśli tablica jest taka sama
          setVisitedCountries((current) => {
            if (JSON.stringify(current) !== JSON.stringify(countriesFromDb)) {
              return countriesFromDb;
            }
            return current;
          });
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
        setVisitedCountries, // Przekazujemy oryginalną funkcję z useState
      }}
    >
      {children}
    </CountryContext.Provider>
  );
};

export const useCountries = () => useContext(CountryContext);
