// app/config/CountryContext.tsx

import React, {
  createContext,
  useState,
  useEffect,
  ReactNode,
  useContext,
  useMemo,
} from "react";
import { auth, db } from "./firebaseConfig";
import { doc, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth"; // <-- IMPORTUJ onAuthStateChanged i User
import filteredCountriesData from "../../components/filteredCountries.json";

// Reszta twojego kodu (typy, mapa) jest idealna i pozostaje bez zmian
export type Country = {
  id: string;
  name: string;
  officialName: string;
  cca2: string;
  cca3: string;
  region: string;
  subregion: string;
  class: string | null;
  path: string;
};

const countriesMap = new Map<string, Country>();
filteredCountriesData.countries.forEach((country) => {
  countriesMap.set(country.cca2, country);
});

interface CountryContextProps {
  visitedCountries: string[];
  visitedCountriesCount: number;
  setVisitedCountries: (countries: string[]) => void;
  countriesMap: Map<string, Country>;
  isLoading: boolean;
}

const CountryContext = createContext<CountryContextProps>({
  visitedCountries: [],
  visitedCountriesCount: 0,
  setVisitedCountries: () => {},
  countriesMap: new Map(),
  isLoading: true,
});

interface CountryProviderProps {
  children: ReactNode;
}

// === POCZĄTEK ZMIAN ===
export const CountriesProvider: React.FC<CountryProviderProps> = ({
  children,
}) => {
  const [visitedCountries, setVisitedCountries] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Ustawiamy listener, który będzie reagował na logowanie i wylogowywanie
    const unsubscribeAuth = onAuthStateChanged(auth, (user: User | null) => {
      if (user) {
        // Użytkownik jest zalogowany, podpinamy listener do jego dokumentu
        console.log("Auth state changed: User is logged in. Fetching data...");
        setIsLoading(true);
        const userDocRef = doc(db, "users", user.uid);

        const unsubscribeDb = onSnapshot(
          userDocRef,
          (docSnapshot) => {
            if (docSnapshot.exists()) {
              const data = docSnapshot.data();
              setVisitedCountries(data.countriesVisited || []);
            } else {
              // Dokument użytkownika jeszcze nie istnieje
              setVisitedCountries([]);
            }
            setIsLoading(false); // Kończymy ładowanie
          },
          (error) => {
            console.error("Error in onSnapshot:", error);
            setIsLoading(false);
          }
        );

        // Zwracamy funkcję odpinającą listener bazy danych,
        // zostanie ona wywołana, gdy użytkownik się wyloguje.
        return () => {
          console.log("Detaching DB listener for logged out user.");
          unsubscribeDb();
        };
      } else {
        // Użytkownik jest wylogowany, resetujemy stan
        console.log("Auth state changed: User is logged out.");
        setVisitedCountries([]);
        setIsLoading(false);
      }
    });

    // Funkcja czyszcząca główny useEffect - odpinamy listener autoryzacji
    return () => {
      console.log("Detaching auth state listener.");
      unsubscribeAuth();
    };
  }, []); // Pusta tablica jest tutaj POPRAWNA - chcemy podpiąć listener tylko raz.

  const value = useMemo(
    () => ({
      visitedCountries,
      visitedCountriesCount: visitedCountries.length,
      setVisitedCountries,
      countriesMap,
      isLoading,
    }),
    [visitedCountries, isLoading]
  );

  return (
    <CountryContext.Provider value={value}>{children}</CountryContext.Provider>
  );
};
// === KONIEC ZMIAN ===

export const useCountries = () => useContext(CountryContext);
