// scripts/generateCountriesJson.ts

import fs from 'fs';
import path from 'path';
import { parseStringPromise, ParserOptions } from 'xml2js';
import { getCountryCodeByName } from '../utils/countryCodeMapper';

// Definicja interfejsów
interface Country {
  id: string;
  name: string;
  class: string | null;
  path: string;
}

interface CountriesData {
  countries: Country[];
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

// Ścieżki do plików
const svgFilePath = path.join(__dirname, '../assets/maps/world.svg'); // Ścieżka do oryginalnego SVG
const outputJsonPath = path.join(__dirname, '../assets/maps/countries.json'); // Ścieżka do output JSON

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

    const countries: Country[] = [];

    paths.forEach((p, index) => {
      const attributes = p.$;
      const classAttribute: string | undefined = attributes.class;
      const idAttribute: string | undefined = attributes.id;
      const d: string | undefined = attributes.d;

      if (!classAttribute && !idAttribute) {
        console.warn(`Ścieżka ${index} nie ma klasy ani id. Pomijam.`);
        return;
      }

      // Prefer 'class' nad 'id' dla nazwy kraju
      let countryName: string | undefined;

      if (classAttribute) {
        const classNames = classAttribute.split(' ');
        countryName = classNames[classNames.length - 1]; // Pobiera ostatnią klasę jako nazwę kraju
      } else if (idAttribute) {
        countryName = idAttribute;
      }

      if (!countryName || !d) {
        console.warn(`Ścieżka ${index} nie ma nazwy kraju lub atrybutu 'd'. Pomijam.`);
        return;
      }

      const countryCode = getCountryCodeByName(countryName);

      if (countryCode.startsWith('UNKNOWN-')) {
        console.warn(`Ścieżka ${index}: Nieznany kod kraju dla: ${countryName}`);
      }

      const country: Country = {
        id: countryCode,
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
