const fs = require('fs');
const { DOMParser } = require('xmldom');

// --- Funkcje do obliczania centroidu --- //

/**
 * Funkcja wyciągająca punkty z atrybutu "d" ścieżki SVG.
 * Uwaga: Ten parser działa poprawnie, jeśli ścieżka zawiera polecenia M i L (absolutne).
 * Jeśli występują komendy względne lub inne, należałoby rozbudować parser.
 */
function extractPoints(d) {
  const points = [];
  // Wyrażenie dopasowujące polecenia "M" lub "L" (duże litery – absolutne współrzędne)
  const re = /[ML]([^MLZ]+)/gi;
  let match;
  while ((match = re.exec(d)) !== null) {
    // Podział ciągu na liczby (spacje lub przecinki)
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
 * Funkcja obliczająca centroid wielokąta.
 * Wzór: https://en.wikipedia.org/wiki/Centroid#Of_a_polygon
 */
function computeCentroid(points) {
  let area = 0;
  let cx = 0;
  let cy = 0;
  const n = points.length;
  if (n < 3) {
    return points[0] || { x: 0, y: 0 };
  }
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
 * Funkcja zwracająca centroid kraju na podstawie atrybutu "d"
 */
function getCountryCentroid(d) {
  const points = extractPoints(d);
  const centroid = computeCentroid(points);
  return centroid;
}

// --- Parsowanie pliku SVG i zapis wyników --- //

// Ścieżka do pliku SVG – zmień według potrzeb
const svgFilePath = '../assets/maps/world.svg';
// Ścieżka do pliku wyjściowego
const outputFilePath = './centroids.txt';

// Wczytanie pliku SVG
fs.readFile(svgFilePath, 'utf8', (err, data) => {
  if (err) {
    console.error("Błąd podczas odczytu pliku SVG:", err);
    return;
  }

  // Parsowanie pliku SVG
  const doc = new DOMParser().parseFromString(data, 'image/svg+xml');
  // Pobranie wszystkich elementów <path>
  const paths = doc.getElementsByTagName('path');

  let outputLines = [];

  // Iteracja po ścieżkach
  for (let i = 0; i < paths.length; i++) {
    const pathEl = paths[i];
    const d = pathEl.getAttribute('d');
    if (!d) continue;

    // Spróbuj pobrać identyfikator kraju – np. z atrybutu "id" lub "name"
    const countryId = pathEl.getAttribute('id') || pathEl.getAttribute('name') || `path_${i}`;
    const centroid = getCountryCentroid(d);

    // Formatowanie wyniku – możesz zmienić format wg. swoich potrzeb
    const line = `${countryId}: x=${centroid.x.toFixed(2)}, y=${centroid.y.toFixed(2)}`;
    outputLines.push(line);
  }

  const outputText = outputLines.join('\n');
  
  // Zapis do pliku
  fs.writeFile(outputFilePath, outputText, 'utf8', (err) => {
    if (err) {
      console.error("Błąd podczas zapisu pliku:", err);
    } else {
      console.log("Centroidy zostały zapisane w:", outputFilePath);
    }
  });
});
