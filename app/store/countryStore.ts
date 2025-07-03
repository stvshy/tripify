import { create } from "zustand";
import { storage } from "../config/storage";
import { Country } from "../../types/sharedTypes"; // Upewnij się, że ścieżka jest poprawna

// Importujemy JSON tylko w tym jednym miejscu, na wypadek gdyby cache był pusty
import countriesData from "../../assets/maps/countries_with_continents.json";

const COUNTRIES_CACHE_KEY = "countriesMapCache";

interface CountryState {
  countriesMap: Map<string, Country> | null;
  isLoading: boolean;
  initializeCountries: () => Promise<void>; // Funkcja inicjalizująca
  getCountryById: (id: string) => Country | undefined;
}

// Funkcja pomocnicza do budowania mapy z pliku JSON
const buildMapFromJSON = (): Map<string, Country> => {
  const map = new Map<string, Country>();
  countriesData.countries.forEach((country) => {
    map.set(country.id, {
      id: country.id,
      name: country.name || "Unknown",
      cca2: country.id,
      flag: `https://flagcdn.com/w40/${country.id.toLowerCase()}.png`,
      class: country.class || null,
      path: country.path || "Unknown",
      continent: country.continent || "Other",
    });
  });
  return map;
};

export const useCountryStore = create<CountryState>((set, get) => ({
  countriesMap: null,
  isLoading: true,

  initializeCountries: async () => {
    // Sprawdź, czy dane już nie są w stanie (np. po HMR)
    if (get().countriesMap) {
      set({ isLoading: false });
      return;
    }

    try {
      // 1. Spróbuj załadować dane z cache MMKV
      const cachedData = storage.getString(COUNTRIES_CACHE_KEY);

      if (cachedData) {
        // Jeśli są w cache, pars-ujemy je i tworzymy Mapę
        const parsedArray: [string, Country][] = JSON.parse(cachedData);
        const map = new Map<string, Country>(parsedArray);
        set({ countriesMap: map, isLoading: false });
        console.log("Countries loaded from MMKV cache.");
      } else {
        // 2. Jeśli nie ma w cache (pierwsze uruchomienie)
        console.log("Building countries map from JSON for the first time...");
        const map = buildMapFromJSON();
        set({ countriesMap: map, isLoading: false });

        // 3. Zapisz dane do cache w tle dla następnych uruchomień
        // UWAGA: Mapy nie da się serializować bezpośrednio. Konwertujemy ją na tablicę.
        const arrayToCache = Array.from(map.entries());
        storage.set(COUNTRIES_CACHE_KEY, JSON.stringify(arrayToCache));
        console.log("Countries map saved to MMKV cache.");
      }
    } catch (error) {
      console.error("Failed to initialize countries data:", error);
      // W razie błędu, spróbuj załadować z JSON jako fallback
      const map = buildMapFromJSON();
      set({ countriesMap: map, isLoading: false });
    }
  },

  // Funkcja pomocnicza do łatwego dostępu do kraju
  getCountryById: (id: string) => {
    return get().countriesMap?.get(id);
  },
}));
