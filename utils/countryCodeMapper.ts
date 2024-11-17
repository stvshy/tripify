// countryCodeMapper.ts

import countries from 'world-countries';

// Mapa do specjalnego mapowania nazw krajów na kody
const countryNameToCodeMap: { [key: string]: string } = {
  'russian federation': 'RU',
  'federated states of micronesia': 'FM',
  'são tomé and principe': 'ST',
  'canary islands (spain)': 'IC',
  'faeroe islands': 'FO',
  'united states virgin islands': 'VI',
  'netherlands antilles': 'AN',
  'saint pierre and miquelon': 'PM',
  'wallis and futuna': 'WF',
  'new caledonia': 'NC',
  'reunion': 'RE',
  'french guiana': 'GF',
  'martinique': 'MQ',
  'guadeloupe': 'GP',
};

// Funkcja do mapowania nazwy kraju na kod `cca2`
export const getCountryCodeByName = (name: string): string => {
  const normalizedName = name.toLowerCase().trim();

  // Sprawdź specjalne mapowanie
  if (countryNameToCodeMap[normalizedName]) {
    return countryNameToCodeMap[normalizedName];
  }

  // Przeszukaj standardowe dane z `world-countries`
  const country = countries.find(
    (country) => 
      country.name.common.toLowerCase() === normalizedName ||
      country.name.official.toLowerCase() === normalizedName
  );

  if (country) {
    return country.cca2;
  }

  // Jeżeli nie znaleziono, zwróć UNKNOWN
  console.warn(`Nie znaleziono kodu dla kraju: ${name}`);
  return `UNKNOWN-${name}`;
};

export default getCountryCodeByName;
