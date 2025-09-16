// components/countriesIndex.ts
// Jeśli masz JSON:
// import preprocessedCountries from "./preprocessedCountries.json";

// Jeśli masz .ts/.js z eksportem domyślnym:
import preprocessedCountries from "./preprocessedCountries.json";

export type CountryLite = {
  id: string;
  cca2: string;
  name: string;
};

export const getFlagUrl = (cca2: string, size: 40 | 20 = 40) =>
  `https://flagcdn.com/w${size}/${cca2.toLowerCase()}.png`;

const RAW = (preprocessedCountries as any[]).filter((x) => !x.isHeader);

export const COUNTRIES_ARRAY: CountryLite[] = RAW.map((c: any) => ({
  id: c.cca2 || c.id,
  cca2: c.cca2 || c.id,
  name: c.name || "Unknown",
}));

export const COUNTRY_BY_CCA2: Record<string, CountryLite> = (() => {
  const map: Record<string, CountryLite> = {};
  for (const c of COUNTRIES_ARRAY) map[c.cca2] = c;
  return map;
})();
