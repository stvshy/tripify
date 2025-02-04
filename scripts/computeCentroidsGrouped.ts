import fs from 'fs';
import { DOMParser } from 'xmldom';
// Importujemy funkcję getCountryCodeByName z Twojego modułu TypeScript
import getCountryCodeByName from './countryCodeMapper';

// --- Funkcje pomocnicze --- //

/**
 * Wyciąga punkty z atrybutu "d" ścieżki SVG.
 * Zakłada, że używane są absolutne komendy M i L (ignoruje Z).
 */
function extractPoints(d: string): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  const re = /[ML]([^MLZ]+)/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(d)) !== null) {
    const coords = match[1].trim().split(/[\s,]+/);
    for (let i = 0; i < coords.length; i += 2) {
      const x = parseFloat(coords[i]);
      const y = parseFloat(coords[i + 1]);
      if (!isNaN(x) && !isNaN(y)) {
        points.push({ x, y });
      }
    }
  }
  return points;
}

/**
 * Oblicza pole wielokąta na podstawie listy punktów.
 */
function computeArea(points: { x: number; y: number }[]): number {
  let area = 0;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i].x * points[j].y - points[j].x * points[i].y;
  }
  return Math.abs(area / 2);
}

/**
 * Oblicza centroid wielokąta wg wzoru:
 *   Cx = (1/(6A)) * sum((xi + xi+1)*cross)
 *   Cy = (1/(6A)) * sum((yi + yi+1)*cross)
 */
function computeCentroid(points: { x: number; y: number }[]): { x: number; y: number } {
  let area = 0;
  let cx = 0;
  let cy = 0;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const cross = points[i].x * points[j].y - points[j].x * points[i].y;
    area += cross;
    cx += (points[i].x + points[j].x) * cross;
    cy += (points[i].y + points[j].y) * cross;
  }
  area = area / 2;
  cx = cx / (6 * area);
  cy = cy / (6 * area);
  return { x: cx, y: cy };
}

/**
 * Dla danego atrybutu "d" zwraca obiekt: { centroid, area }.
 */
function getPathData(d: string): { centroid: { x: number; y: number }; area: number } | null {
  const points = extractPoints(d);
  if (points.length < 3) return null;
  const area = computeArea(points);
  const centroid = computeCentroid(points);
  return { centroid, area };
}

// --- Parsowanie SVG, grupowanie ścieżek i obliczanie centroidów --- //

// Ścieżka do pliku SVG (dostosuj według potrzeb)
const svgFilePath = '../assets/maps/world.svg';
// Ścieżka do pliku wyjściowego
const outputFilePath = './groupedCentroids.txt';

// Wczytaj plik SVG asynchronicznie
fs.readFile(svgFilePath, 'utf8', (err, data) => {
  if (err) {
    console.error("Błąd odczytu pliku SVG:", err);
    return;
  }

  const doc = new DOMParser().parseFromString(data, 'image/svg+xml');
  const paths = doc.getElementsByTagName('path');

  // Obiekt do grupowania: klucz to ujednolicony kod kraju (cca2)
  const countries: { [key: string]: { centroid: { x: number; y: number }; area: number }[] } = {};

  for (let i = 0; i < paths.length; i++) {
    const pathEl = paths[i];
    const d = pathEl.getAttribute('d');
    if (!d) continue;

    // Pobierz surowy identyfikator (id, name lub class)
    let rawIdentifier = pathEl.getAttribute('id') || pathEl.getAttribute('name') || pathEl.getAttribute('class');
    if (!rawIdentifier) {
      rawIdentifier = `path_${i}`;
    }
    // Przekształć surowy identyfikator na ujednolicony kod kraju przy użyciu Twojego mappera
    const countryCode = getCountryCodeByName(rawIdentifier);

    const pathData = getPathData(d);
    if (!pathData) continue;

    if (!countries[countryCode]) {
      countries[countryCode] = [];
    }
    countries[countryCode].push(pathData);
  }

  // Dla każdej grupy oblicz łączny centroid jako średnia ważona
  const outputLines: string[] = [];

  for (const countryCode in countries) {
    const group = countries[countryCode];
    let totalArea = 0;
    let weightedX = 0;
    let weightedY = 0;

    group.forEach(item => {
      totalArea += item.area;
      weightedX += item.centroid.x * item.area;
      weightedY += item.centroid.y * item.area;
    });

    if (totalArea === 0) continue;
    const overallCentroid = {
      x: weightedX / totalArea,
      y: weightedY / totalArea
    };

    outputLines.push(`${countryCode}: x=${overallCentroid.x.toFixed(2)}, y=${overallCentroid.y.toFixed(2)}`);
  }

  const outputText = outputLines.join('\n');
  fs.writeFile(outputFilePath, outputText, 'utf8', (err) => {
    if (err) {
      console.error("Błąd zapisu pliku:", err);
    } else {
      console.log("Wyniki zapisano w:", outputFilePath);
    }
  });
});
