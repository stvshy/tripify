// utils/countryCodeMapper.js

const worldCountries = require('world-countries');

const countryNameToCodeMap = {
  // ... (mapa krajów)
};

const getCountryCodeByName = (identifier) => {
  const normalizedIdentifier = identifier.toLowerCase().trim();

  // 1. Sprawdź, czy to jest valid cca2 code
  const countryByCode = worldCountries.find(
    (country) => country.cca2.toLowerCase() === normalizedIdentifier
  );
  if (countryByCode) {
    console.log(`Znaleziono kraj poprzez kod: ${identifier} -> ${countryByCode.name.common}`);
    return countryByCode.cca2;
  }

  // 2. Sprawdź specjalne mapowanie
  if (countryNameToCodeMap[normalizedIdentifier]) {
    console.log(`Znaleziono kraj poprzez mapowanie specjalne: ${identifier} -> ${countryNameToCodeMap[normalizedIdentifier]}`);
    return countryNameToCodeMap[normalizedIdentifier];
  }

  // 3. Przeszukaj standardowe dane z `world-countries` po nazwie
  const countryByName = worldCountries.find(
    (country) =>
      country.name.common.toLowerCase() === normalizedIdentifier ||
      country.name.official.toLowerCase() === normalizedIdentifier
  );

  if (countryByName) {
    console.log(`Znaleziono kraj poprzez nazwę: ${identifier} -> ${countryByName.name.common}`);
    return countryByName.cca2;
  }

  console.warn(`Nie znaleziono kodu dla kraju: ${identifier}`);
  return `UNKNOWN-${identifier}`;
};

module.exports = getCountryCodeByName;
