// scripts/generateCountriesJson.ts

import fs from 'fs';
import path from 'path';
import { parseStringPromise, ParserOptions } from 'xml2js';
import getCountryCodeByName from '../utils/countryCodeMapper';
import worldCountries from 'world-countries';

// Definicja interfejsów
interface CountryData {
  id: string;
  name: string;
  class: string | null;
  path: string;
}

interface CountriesData {
  countries: CountryData[];
}

// Funkcja rekurencyjna do ekstrakcji wszystkich <path> elementów
const extractPaths = (obj: any, paths: any[] = []): any[] => {
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const element = obj[key];
      if (key === 'path') {
        if (Array.isArray(element)) {
          paths.push(...element);
        }
      } else if (typeof element === 'object' && element !== null) {
        extractPaths(element, paths);
      }
    }
  }
  return paths;
};

// Funkcja do ekstrakcji kodu kraju z atrybutów
const extractCountryCode = (
  idAttribute: string | undefined,
  nameAttribute: string | undefined,
  classAttribute: string | undefined
): string | null => {
  // 1. Sprawdź idAttribute
  if (idAttribute) {
    const code = getCountryCodeByName(idAttribute);
    if (!code.startsWith('UNKNOWN-')) {
      return code;
    }
  }

  // 2. Sprawdź nameAttribute
  if (nameAttribute) {
    const code = getCountryCodeByName(nameAttribute);
    if (!code.startsWith('UNKNOWN-')) {
      return code;
    }
  }

  // 3. Sprawdź classAttribute jako cały ciąg
  if (classAttribute) {
    const code = getCountryCodeByName(classAttribute);
    if (!code.startsWith('UNKNOWN-')) {
      return code;
    }

    // 4. Jeśli classAttribute zawiera wiele klas, spróbuj mapować każdą oddzielnie
    const classNames = classAttribute.split(' ');
    for (const className of classNames) {
      const code = getCountryCodeByName(className);
      if (!code.startsWith('UNKNOWN-')) {
        return code;
      }
    }
  }

  return null;
};

// Ścieżki do plików
const svgFilePath = path.join(__dirname, '../assets/maps/world.svg');
const outputJsonPath = path.join(__dirname, '../assets/maps/countries.json');

// Główna funkcja generująca countries.json
const generateCountriesJson = async () => {
  try {
    // Sprawdź, czy plik SVG istnieje
    if (!fs.existsSync(svgFilePath)) {
      console.error(`Plik SVG nie został znaleziony w ścieżce: ${svgFilePath}`);
      return;
    }

    // Wczytaj plik SVG
    const svgData = fs.readFileSync(svgFilePath, 'utf-8');

    // Opcje parsera, aby uwzględniać wszystkie atrybuty
    const parserOptions: ParserOptions = {
      explicitArray: true, // Wszystkie elementy będą tablicami
      ignoreAttrs: false,  // Nie ignoruj atrybutów
    };

    // Parsuj SVG
    const result = await parseStringPromise(svgData, parserOptions);

    // Wyciągnij wszystkie <path> elementy
    const paths: any[] = extractPaths(result.svg);

    console.log(`Znaleziono ${paths.length} ścieżek w SVG.`);

    const countries: CountryData[] = [];

    paths.forEach((p, index) => {
      const attributes = p.$;
      const idAttribute: string | undefined = attributes.id;
      const nameAttribute: string | undefined = attributes.name;
      const classAttribute: string | undefined = attributes.class;
      const d: string | undefined = attributes.d;

      if (!d) {
        console.warn(`Ścieżka ${index} nie ma atrybutu 'd'. Pomijam.`);
        return;
      }

      const countryCode = extractCountryCode(idAttribute, nameAttribute, classAttribute);

      let countryName: string;

      if (countryCode && !countryCode.startsWith('UNKNOWN-')) {
        const country = worldCountries.find(
          (c) => c.cca2.toLowerCase() === countryCode.toLowerCase()
        );
        countryName = country ? country.name.common : 'Unknown';
      } else {
        // Jeżeli nie udało się znaleźć countryCode, spróbuj użyć nameAttribute lub classAttribute
        if (nameAttribute) {
          countryName = nameAttribute;
        } else if (classAttribute) {
          countryName = classAttribute;
        } else if (idAttribute) {
          countryName = idAttribute;
        } else {
          countryName = 'Unknown';
        }
      }

      const country: CountryData = {
        id: countryCode || `UNKNOWN-${countryName}`,
        name: countryName,
        class: classAttribute || null,
        path: d.trim(),
      };

      countries.push(country);
    });

    if (countries.length === 0) {
      console.warn('Nie znaleziono żadnych krajów w SVG.');
    }

    // Struktura danych do zapisania
    const data: CountriesData = { countries };

    // Zapisz do countries.json
    fs.writeFileSync(outputJsonPath, JSON.stringify(data, null, 2), 'utf-8');

    console.log(`Plik countries.json został wygenerowany pomyślnie. Znaleziono ${countries.length} wpisów.`);
  } catch (error) {
    console.error('Błąd podczas generowania countries.json:', error);
  }
};

// Uruchomienie skryptu
generateCountriesJson();
