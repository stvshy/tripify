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
    let currentUnsubscribeSnapshot: (() => void) | null = null;

    const unsubscribe = auth.onAuthStateChanged((user) => {
      console.log(
        "CountryContext: Auth state changed, user:",
        user ? user.uid : "null"
      );

      // Clean up previous snapshot listener if exists
      if (currentUnsubscribeSnapshot) {
        console.log("CountryContext: Cleaning up previous snapshot listener");
        currentUnsubscribeSnapshot();
        currentUnsubscribeSnapshot = null;
      }

      if (user) {
        console.log(
          "CountryContext: User logged in, setting up listener for:",
          user.uid
        );
        const userDocRef = doc(db, "users", user.uid);
        currentUnsubscribeSnapshot = onSnapshot(
          userDocRef,
          (docSnapshot) => {
            console.log(
              "CountryContext: Snapshot received for user:",
              user.uid
            );
            if (docSnapshot.exists()) {
              const data = docSnapshot.data();
              const countriesFromDb: string[] = data.countriesVisited || [];
              const wishlistFromDb: string[] = data.countriesWishlist || [];

              console.log(
                "CountryContext: Setting countries - visited:",
                countriesFromDb.length,
                "wishlist:",
                wishlistFromDb.length
              );

              setVisitedCountries((current) => {
                if (
                  JSON.stringify(current) !== JSON.stringify(countriesFromDb)
                ) {
                  console.log(
                    "CountryContext: Updating visited countries from",
                    current.length,
                    "to",
                    countriesFromDb.length
                  );
                  return countriesFromDb;
                }
                return current;
              });

              setWishlistCountries((current) => {
                if (
                  JSON.stringify(current) !== JSON.stringify(wishlistFromDb)
                ) {
                  console.log(
                    "CountryContext: Updating wishlist countries from",
                    current.length,
                    "to",
                    wishlistFromDb.length
                  );
                  return wishlistFromDb;
                }
                return current;
              });
            } else {
              console.log("CountryContext: User document does not exist");
              setVisitedCountries([]);
              setWishlistCountries([]);
            }
          },
          (error) => {
            console.error("CountryContext: Error in snapshot listener:", error);
            // Clear state on error (e.g., permission denied)
            setVisitedCountries([]);
            setWishlistCountries([]);
          }
        );
      } else {
        // CRITICAL FIX: Clear state when no user is logged in
        console.log(
          "CountryContext: No user logged in, clearing country state"
        );
        setVisitedCountries([]);
        setWishlistCountries([]);
      }
    });

    return () => {
      console.log(
        "CountryContext: Cleaning up auth listener and snapshot listener"
      );
      unsubscribe();
      if (currentUnsubscribeSnapshot) {
        currentUnsubscribeSnapshot();
      }
    };
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
