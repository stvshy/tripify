// utils/countryCodeMapper.ts

import worldCountries from 'world-countries';
import { Country } from 'world-countries';

const countryNameToCodeMap: { [key: string]: string } = {
  'russian federation': 'RU',
  'federated states of micronesia': 'FM',
  'são tomé and principe': 'ST',
  'canary islands (spain)': 'ES', // Przypisujemy do Hiszpanii
  'faroe islands': 'FO',
  'faeroe islands': 'FO',
  'united states virgin islands': 'VI',
  'saint pierre and miquelon': 'PM',
  'wallis and futuna': 'WF',
  'new caledonia': 'NC',
  'reunion': 'RE',
  'french guiana': 'GF',
  'martinique': 'MQ',
  'guadeloupe': 'GP',
  'cabo verde': 'CV',
  'cape verde': 'CV',
  'chile': 'CL',
  'france': 'FR',
  'angola': 'AO',
  'argentina': 'AR',
  'azerbaijan': 'AZ',
  'belarus': 'BY',
  'belize': 'BZ',
  'burkina faso': 'BF',
  'bangladesh': 'BD',
  'brazil': 'BR',
  'bosnia and herzegovina': 'BA',
  'belgium': 'BE',
  'burundi': 'BI',
  'united kingdom': 'GB',
  'new zealand': 'NZ',
  'south korea': 'KR',
  'north korea': 'KP',
  'samoa': 'WS',
  'saint helena': 'SH',
  'sint maarten': 'SX',
  'saint martin': 'SX',
  'saint barthélemy': 'BL',
  'saint lucia': 'LC',
  'saint vincent and the grenadines': 'VC',
  'sint eustatius': 'BQ',
  'saba': 'BQ',
  'bonaire': 'BQ',
  'micronesia': 'FM',
  'guinea bissau': 'GW',
  'gibraltar': 'GI',
  'gambia': 'GM',
  'guyana': 'GY',
  'georgia': 'GE',
  'ghana': 'GH',
  'greece': 'GR',
  'st. eustatius': 'BQ',
  'bqbo': 'BQ',
  'bqse': 'BQ',
  'bqsa': 'BQ',
};

// Funkcja do mapowania nazwy kraju lub kodu `cca2` na kod `cca2`
const getCountryCodeByName = (identifier: string): string => {
  const normalizedIdentifier = identifier.toLowerCase().trim();

  // 1. Sprawdź, czy to jest valid cca2 code
  const countryByCode = worldCountries.find(
    (country: Country) => country.cca2.toLowerCase() === normalizedIdentifier
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
    (country: Country) =>
      country.name.common.toLowerCase() === normalizedIdentifier ||
      country.name.official.toLowerCase() === normalizedIdentifier
  );

  if (countryByName) {
    console.log(`Znaleziono kraj poprzez nazwę: ${identifier} -> ${countryByName.name.common}`);
    return countryByName.cca2;
  }

  // 4. Jeżeli nie znaleziono, zwróć UNKNOWN
  console.warn(`Nie znaleziono kodu dla kraju: ${identifier}`);
  return `UNKNOWN-${identifier}`;
};

export default getCountryCodeByName;
