// scripts/assignCountryIds.js
const fs = require('fs');
const path = require('path');
const { getCountryCodeByName } = require('../utils/countryCodeMapper.ts');


console.log('Loaded countryCodeMapper.js');

// Ścieżka do pliku countries.json
const filePath = path.join(__dirname, '../assets/maps/countries.json');

// Wczytaj plik JSON
const rawData = fs.readFileSync(filePath, 'utf-8');
const data = JSON.parse(rawData);

// Set do przechowywania unikalnych identyfikatorów
const seenCountries = new Set();

// Przypisujemy `id` tam, gdzie jest `null` i ignorujemy duplikaty
data.countries = data.countries.reduce((accumulator, country) => {
  // Sprawdzamy, czy kraj ma już `id`
  if (country.id) {
    // Pomijamy duplikaty na podstawie `id` i `class`
    const uniqueKey = `${country.id}-${country.class}`;
    if (!seenCountries.has(uniqueKey)) {
      seenCountries.add(uniqueKey);
      accumulator.push(country);
    }
  } else if (country.class) {
    // Jeśli `id` jest `null`, przypisujemy je na podstawie `class`
    const code = getCountryCodeByName(country.class);
    if (code) {
      const newCountry = { ...country, id: code, name: country.class };
      const uniqueKey = `${code}-${country.class}`;
      if (!seenCountries.has(uniqueKey)) {
        seenCountries.add(uniqueKey);
        accumulator.push(newCountry);
      }
    } else {
      // Jeśli nie znaleziono kodu, przypisujemy `UNKNOWN`
      console.warn(`Nie znaleziono kodu dla kraju: ${country.class}`);
      const newCountry = { ...country, id: `UNKNOWN-${country.class}`, name: country.class };
      accumulator.push(newCountry);
    }
  }
  return accumulator;
}, []);

console.log('Processing completed.');

// Zapisz zaktualizowany plik JSON
fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
console.log('Przypisanie ID zakończone.');
