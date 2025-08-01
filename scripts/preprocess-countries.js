// scripts/preprocess-countries.js
const fs = require("fs");
const path = require("path");

// Ścieżki do plików wejściowego i wyjściowego
const inputPath = path.join(__dirname, "../components/filteredCountries.json");
const outputPath = path.join(
  __dirname,
  "../components/preprocessedCountries.json"
);

console.log("Reading source file:", inputPath);
const rawData = fs.readFileSync(inputPath);
const countriesData = JSON.parse(rawData);

// Ta sama funkcja, co w komponencie
const getContinent = (region, subregion) => {
  switch (region) {
    case "Africa":
      return "Africa";
    case "Americas":
      return subregion.includes("South") ? "South America" : "North America";
    case "Asia":
      return "Asia";
    case "Europe":
      return "Europe";
    case "Oceania":
      return "Oceania";
    case "Antarctic":
      return "Antarctica";
    default:
      return "Africa"; // Domyślna wartość na wszelki wypadek
  }
};

console.log("Processing countries...");

// 1. Grupujemy po kontynentach
const grouped = countriesData.countries.reduce((acc, country) => {
  // KLUCZOWA OPTYMALIZACJA: Usuwamy nieużywane, ale bardzo duże pole 'path'
  const { path, ...countryWithoutPath } = country;

  const continent = getContinent(country.region, country.subregion);
  if (!acc[continent]) acc[continent] = [];
  acc[continent].push(countryWithoutPath);
  return acc;
}, {});

// 2. Tworzymy sekcje, sortujemy kraje wewnątrz i sortujemy same sekcje
const sections = Object.keys(grouped)
  .map((continent) => ({
    title: continent,
    data: grouped[continent].sort((a, b) => a.name.localeCompare(b.name)),
  }))
  .sort((a, b) => a.title.localeCompare(b.title));

// 3. Spłaszczamy dane do formatu wymaganego przez FlashList
const flatList = [];
sections.forEach((section) => {
  flatList.push({ isHeader: true, title: section.title });
  flatList.push(...section.data);
});

console.log(
  `Processed ${countriesData.countries.length} countries into ${flatList.length} list items.`
);

// 4. Zapisujemy wynik do nowego pliku JSON
fs.writeFileSync(outputPath, JSON.stringify(flatList, null, 2));

console.log("Successfully created preprocessed file at:", outputPath);
