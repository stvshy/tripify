// scripts/generateWorldMapData.ts

import fs from "fs";
import path from "path";
import { parseStringPromise, ParserOptions } from "xml2js";
import getCountryCodeByName from "../utils/countryCodeMapper"; // Upewnij się, że ta ścieżka jest poprawna
import worldCountries from "world-countries";

// Definicja interfejsów dla wyjściowego JSON
interface SvgPathItem {
  id: string;
  name: string;
  d: string;
}

interface SvgData {
  viewBox: string;
  width: string | number;
  height: string | number;
  paths: SvgPathItem[];
}

// Funkcja rekurencyjna do ekstrakcji wszystkich <path> elementów
// Może być przydatna, jeśli ścieżki są zagnieżdżone, ale dla Twojego SVG prawdopodobnie nie jest konieczna
// jeśli wszystkie <path> są bezpośrednimi dziećmi <svg>
const extractPathsRecursive = (obj: any, pathsList: any[] = []): any[] => {
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const element = obj[key];
      if (key === "path") {
        if (Array.isArray(element)) {
          pathsList.push(...element);
        } else if (typeof element === "object" && element !== null) {
          pathsList.push(element);
        }
      } else if (typeof element === "object" && element !== null) {
        extractPathsRecursive(element, pathsList);
      }
    }
  }
  return pathsList;
};

// Funkcja do ekstrakcji kodu kraju z atrybutów (bez większych zmian)
const extractCountryCode = (
  idAttribute: string | undefined,
  nameAttribute: string | undefined,
  classAttribute: string | undefined
): string | null => {
  if (idAttribute) {
    const code = getCountryCodeByName(idAttribute);
    if (code && !code.startsWith("UNKNOWN-")) return code;
  }
  if (nameAttribute) {
    const code = getCountryCodeByName(nameAttribute);
    if (code && !code.startsWith("UNKNOWN-")) return code;
  }
  if (classAttribute) {
    // Najpierw spróbuj cały ciąg classAttribute
    const codeFromFullClass = getCountryCodeByName(classAttribute);
    if (codeFromFullClass && !codeFromFullClass.startsWith("UNKNOWN-"))
      return codeFromFullClass;

    // Potem spróbuj poszczególne klasy
    const classNames = classAttribute.split(" ");
    for (const className of classNames) {
      const codeFromName = getCountryCodeByName(className);
      if (codeFromName && !codeFromName.startsWith("UNKNOWN-"))
        return codeFromName;
    }
  }
  return null;
};

// Ścieżki do plików
const svgFilePath = path.join(__dirname, "../assets/maps/world.svg");
const outputJsonPath = path.join(__dirname, "../assets/maps/worldMapData.json"); // Zmieniona nazwa pliku wyjściowego

// Główna funkcja generująca JSON
const generateWorldMapData = async () => {
  try {
    if (!fs.existsSync(svgFilePath)) {
      console.error(`Plik SVG nie został znaleziony w ścieżce: ${svgFilePath}`);
      return;
    }

    const svgFileContent = fs.readFileSync(svgFilePath, "utf-8");

    // Użyj opcji, które ułatwią dostęp do danych
    const parserOptions: ParserOptions = {
      explicitArray: true, // Zawsze twórz tablice, nawet dla pojedynczych elementów
      explicitRoot: true, // Zachowaj główny element (svg)
      ignoreAttrs: false, // Nie ignoruj atrybutów
      attrkey: "$", // Klucz dla atrybutów
      charkey: "_", // Klucz dla wartości tekstowych (nieużywane tutaj)
      tagNameProcessors: [(name) => name.toLowerCase()], // Konwertuj nazwy tagów na małe litery
      attrNameProcessors: [(name) => name.toLowerCase()], // Konwertuj nazwy atrybutów na małe litery
    };

    const parsedResult = await parseStringPromise(
      svgFileContent,
      parserOptions
    );

    // Dostęp do głównego tagu <svg> i jego atrybutów
    if (!parsedResult.svg || !parsedResult.svg[0] || !parsedResult.svg[0].$) {
      console.error(
        "Nie można odczytać atrybutów głównego tagu <svg>. Sprawdź strukturę SVG i opcje parsera."
      );
      return;
    }
    const svgNode = parsedResult.svg[0];
    const svgAttributes = svgNode.$;

    // Użyj toLowerCase() dla nazw atrybutów dzięki attrNameProcessors
    const viewBox = svgAttributes.viewbox; // Powinno być 'viewbox' po przetworzeniu
    const width = svgAttributes.width;
    const height = svgAttributes.height;

    if (!viewBox || !width || !height) {
      console.error(
        "Brakujące atrybuty viewBox, width lub height w głównym tagu <svg>."
      );
      return;
    }

    // Wyciągnij wszystkie <path> elementy
    // Zakładając, że <path> są bezpośrednimi dziećmi <svg>
    const rawPathsArray: any[] = svgNode.path || []; // svgNode.path będzie tablicą dzięki explicitArray: true

    console.log(`Znaleziono ${rawPathsArray.length} ścieżek w SVG.`);

    const processedPaths: SvgPathItem[] = [];

    rawPathsArray.forEach((pathElement, index) => {
      const attributes = pathElement.$; // Atrybuty ścieżki
      if (!attributes) {
        console.warn(`Ścieżka ${index} nie ma atrybutów. Pomijam.`);
        return;
      }

      // Użyj toLowerCase() dla nazw atrybutów
      const idAttribute: string | undefined = attributes.id;
      const nameAttribute: string | undefined = attributes.name;
      const classAttribute: string | undefined = attributes.class;
      const dAttribute: string | undefined = attributes.d;

      if (!dAttribute) {
        console.warn(`Ścieżka ${index} nie ma atrybutu 'd'. Pomijam.`);
        return;
      }

      const countryCode = extractCountryCode(
        idAttribute,
        nameAttribute,
        classAttribute
      );
      let finalId = countryCode;
      let countryName: string;

      if (countryCode && !countryCode.startsWith("UNKNOWN-")) {
        const countryInfo = worldCountries.find(
          (c) => c.cca2.toLowerCase() === countryCode.toLowerCase()
        );
        countryName = countryInfo
          ? countryInfo.name.common
          : nameAttribute || classAttribute || idAttribute || `Path ${index}`;
      } else {
        countryName =
          nameAttribute || classAttribute || idAttribute || `Path ${index}`;
        finalId =
          idAttribute ||
          nameAttribute ||
          classAttribute ||
          `unknown-path-${index}`;
        console.warn(
          `Nie udało się zmapować kodu dla: id='${idAttribute}', name='${nameAttribute}', class='${classAttribute}'. Używam ID: '${finalId}'`
        );
      }

      if (!finalId) {
        // Dodatkowy fallback, jeśli wszystkie atrybuty były puste
        finalId = `generated-id-${index}`;
      }

      processedPaths.push({
        id: finalId,
        name: countryName,
        d: dAttribute.trim(),
      });
    });

    if (processedPaths.length === 0) {
      console.warn("Nie znaleziono żadnych poprawnych ścieżek krajów w SVG.");
    }

    const outputData: SvgData = {
      viewBox: viewBox, // viewBox jest już stringiem
      width: width, // width jest już stringiem lub number
      height: height, // height jest już stringiem lub number
      paths: processedPaths,
    };

    fs.writeFileSync(
      outputJsonPath,
      JSON.stringify(outputData, null, 2),
      "utf-8"
    );
    console.log(
      `Plik ${outputJsonPath} został wygenerowany pomyślnie. Zawiera ${processedPaths.length} ścieżek.`
    );
  } catch (error) {
    console.error(`Błąd podczas generowania ${outputJsonPath}:`, error);
  }
};

generateWorldMapData();
