const fs = require('fs');
const path = require('path');
const worldCountries = require('world-countries');

// Ścieżki do plików
const COUNTRIES_JSON_PATH = path.join(__dirname, '../assets/maps/countries.json'); // Zmień na właściwą ścieżkę
const OUTPUT_JSON_PATH = path.join(__dirname, '../components/filteredCountries.json'); // Ścieżka do wygenerowanego pliku

// Wczytaj countries.json
const countriesData = JSON.parse(fs.readFileSync(COUNTRIES_JSON_PATH, 'utf-8')).countries;

// Funkcja do łączenia danych i usuwania duplikatów
const getFilteredCountries = () => {
  const uniqueCountries = new Map();

  countriesData.forEach((country) => {
    // Sprawdź, czy kraj już istnieje w mapie
    if (!uniqueCountries.has(country.id)) {
      // Znajdź odpowiadający kraj w world-countries na podstawie kodu cca2
      const matchedWorldCountry = worldCountries.find(
        (wc) => wc.cca2 === country.id
      );

      if (!matchedWorldCountry) {
        console.warn(`Nie znaleziono dopasowania dla kraju z kodem ${country.id}`);
      }

      uniqueCountries.set(country.id, {
        id: country.id, // cca2
        name: matchedWorldCountry ? matchedWorldCountry.name.common : country.name,
        officialName: matchedWorldCountry ? matchedWorldCountry.name.official : country.name,
        cca2: country.id,
        cca3: matchedWorldCountry ? matchedWorldCountry.cca3 : country.id,
        region: matchedWorldCountry ? matchedWorldCountry.region : 'Unknown',
        subregion: matchedWorldCountry ? matchedWorldCountry.subregion : 'Unknown',
        class: country.class,
        path: country.path,
      });
    }
  });

  return Array.from(uniqueCountries.values()).filter(country => country.region !== 'Unknown'); // Opcjonalnie, filtruj kraje z nieznanym regionem
};

// Generowanie danych
const filteredCountries = getFilteredCountries();

// Zapisz do nowego pliku JSON
fs.writeFileSync(OUTPUT_JSON_PATH, JSON.stringify({ countries: filteredCountries }, null, 2), 'utf-8');

console.log(`Plik ${OUTPUT_JSON_PATH} został pomyślnie wygenerowany.`);
