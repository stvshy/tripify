// app/config/CountryContext.tsx
import React, {
  createContext,
  useState,
  useEffect,
  ReactNode,
  useContext,
  Dispatch, // <<< ZMIANA: Importuj Dispatch i SetStateAction
  SetStateAction,
} from "react";
import { auth, db } from "./firebaseConfig";
import { doc, onSnapshot } from "firebase/firestore";

interface CountryContextProps {
  visitedCountries: string[];
  visitedCountriesCount: number;
  wishlistCountries: string[];
  wishlistCountriesCount: number;
  // <<< ZMIANA: Poprawiony typ funkcji. Teraz akceptuje zarówno nową wartość,
  // jak i funkcję aktualizującą (prevState => newState).
  setVisitedCountries: Dispatch<SetStateAction<string[]>>;
  setWishlistCountries: Dispatch<SetStateAction<string[]>>;
}

const CountryContext = createContext<CountryContextProps>({
  visitedCountries: [],
  visitedCountriesCount: 0,
  wishlistCountries: [],
  wishlistCountriesCount: 0,
  setVisitedCountries: () => {}, // Domyślna funkcja pozostaje bez zmian
  setWishlistCountries: () => {},
});

interface CountryProviderProps {
  children: ReactNode;
}

export const CountriesProvider: React.FC<CountryProviderProps> = ({
  children,
}) => {
  const [visitedCountries, setVisitedCountries] = useState<string[]>([]);
  const [wishlistCountries, setWishlistCountries] = useState<string[]>([]);

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      const userDocRef = doc(db, "users", user.uid);
      const unsubscribe = onSnapshot(userDocRef, (docSnapshot) => {
        if (docSnapshot.exists()) {
          const data = docSnapshot.data();
          const countriesFromDb: string[] = data.countriesVisited || [];
          const wishlistFromDb: string[] = data.countriesWishlist || [];

          setVisitedCountries((current) => {
            if (JSON.stringify(current) !== JSON.stringify(countriesFromDb)) {
              return countriesFromDb;
            }
            return current;
          });

          setWishlistCountries((current) => {
            if (JSON.stringify(current) !== JSON.stringify(wishlistFromDb)) {
              return wishlistFromDb;
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
        wishlistCountries,
        wishlistCountriesCount: wishlistCountries.length,
        setVisitedCountries, // Przekazujemy oryginalną funkcję z useState
        setWishlistCountries,
      }}
    >
      {children}
    </CountryContext.Provider>
  );
};

export const useCountries = () => useContext(CountryContext);
