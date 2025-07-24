// app/config/CountryContext.tsx

import React, {
  createContext,
  useState,
  useEffect,
  ReactNode,
  useContext,
  useMemo, // NOWOŚĆ: Dodajemy useMemo dla optymalizacji
} from "react";
import { auth, db } from "./firebaseConfig";
import { doc, onSnapshot } from "firebase/firestore";
import filteredCountriesData from "../../components/filteredCountries.json";

// NOWOŚĆ: Definicja typu Country, aby kontekst był samodzielny
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

// NOWOŚĆ: Tworzymy mapę krajów RAZ, przy starcie aplikacji.
// To jest nasz "cache". Dostęp do kraju po kodzie jest teraz błyskawiczny (O(1)).
const countriesMap = new Map<string, Country>();
filteredCountriesData.countries.forEach((country) => {
  countriesMap.set(country.cca2, country);
});

// NOWOŚĆ: Aktualizujemy interfejs kontekstu
interface CountryContextProps {
  visitedCountries: string[];
  visitedCountriesCount: number;
  setVisitedCountries: (countries: string[]) => void;
  countriesMap: Map<string, Country>; // Udostępniamy naszą zoptymalizowaną mapę
  isLoading: boolean; // Dodajemy flagę ładowania
}

// Utworzenie kontekstu z zaktualizowanymi wartościami domyślnymi
const CountryContext = createContext<CountryContextProps>({
  visitedCountries: [],
  visitedCountriesCount: 0,
  setVisitedCountries: () => {},
  countriesMap: new Map(), // NOWOŚĆ
  isLoading: true, // NOWOŚĆ
});

// Definicja propsów dla providera (bez zmian)
interface CountryProviderProps {
  children: ReactNode;
}

// Provider kontekstu
export const CountriesProvider: React.FC<CountryProviderProps> = ({
  children,
}) => {
  const [visitedCountries, setVisitedCountries] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true); // NOWOŚĆ: Stan ładowania danych

  useEffect(() => {
    // Reset stanu na wypadek zmiany użytkownika
    setIsLoading(true);
    setVisitedCountries([]);

    const user = auth.currentUser;
    if (user) {
      const userDocRef = doc(db, "users", user.uid);
      const unsubscribe = onSnapshot(
        userDocRef,
        (docSnapshot) => {
          if (docSnapshot.exists()) {
            const data = docSnapshot.data();
            setVisitedCountries(data.countriesVisited || []);
          }
          // Niezależnie czy dokument istnieje, pierwsze pobranie danych się zakończyło
          setIsLoading(false); // NOWOŚĆ: Kończymy ładowanie
        },
        (error) => {
          console.error("Error in onSnapshot:", error);
          setIsLoading(false); // NOWOŚĆ: Kończymy ładowanie także w razie błędu
        }
      );

      return () => unsubscribe();
    } else {
      // Jeśli nie ma użytkownika, nie ma co ładować
      setIsLoading(false); // NOWOŚĆ
    }
  }, []); // useEffect uruchomi się raz, przy montowaniu

  // NOWOŚĆ: Używamy useMemo, aby uniknąć niepotrzebnych re-renderów komponentów potomnych,
  // jeśli zmieni się tylko funkcja `setVisitedCountries` (która się nie zmienia).
  const value = useMemo(
    () => ({
      visitedCountries,
      visitedCountriesCount: visitedCountries.length,
      setVisitedCountries,
      countriesMap, // Udostępniamy stałą, zoptymalizowaną mapę
      isLoading,
    }),
    [visitedCountries, isLoading] // Przelicz wartość tylko, gdy te dane się zmienią
  );

  return (
    <CountryContext.Provider value={value}>{children}</CountryContext.Provider>
  );
};

// Hook do korzystania z kontekstu (bez zmian)
export const useCountries = () => useContext(CountryContext);
