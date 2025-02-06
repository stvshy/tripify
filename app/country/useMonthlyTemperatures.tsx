import { useEffect, useState } from 'react';

export interface MonthlyTemperatures {
  day: number;
  night: number;
}

interface MonthlyTemperaturesHook {
  data: Record<string, MonthlyTemperatures> | null;
  loading: boolean;
  error: boolean;
}

export function useMonthlyTemperatures(latitude: number, longitude: number): MonthlyTemperaturesHook {
  const [data, setData] = useState<Record<string, MonthlyTemperatures> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function fetchMonthlyData() {
      try {
        // Używamy poprzedniego roku, aby mieć pełne dane dla wszystkich miesięcy
        const currentYear = new Date().getFullYear();
        const targetYear = currentYear - 1; 
        const start_date = `${targetYear}-01-01`;
        const end_date = `${targetYear}-12-31`;

        // Używamy archiwalnego API Open-Meteo
        const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m&start_date=${start_date}&end_date=${end_date}&timezone=auto`;
        const response = await fetch(url);
        const result = await response.json();

        if (result && result.hourly && result.hourly.time && result.hourly.temperature_2m) {
          // Obiekt pomocniczy do sumowania temperatur i zliczania godzin
          const monthlyData: Record<
            string,
            { daySum: number; dayCount: number; nightSum: number; nightCount: number }
          > = {};

          result.hourly.time.forEach((timestamp: string, index: number) => {
            const temp = result.hourly.temperature_2m[index];
            const date = new Date(timestamp);
            // Używamy locale "en-US" aby nazwy miesięcy były po angielsku
            const month = date.toLocaleString('en-US', { month: 'long' });
            const hour = date.getHours();

            if (!monthlyData[month]) {
              monthlyData[month] = { daySum: 0, dayCount: 0, nightSum: 0, nightCount: 0 };
            }

            // Definiujemy "dzień" jako godziny od 6 do 17 (6:00 włącznie, 18:00 wyłącznie)
            if (hour >= 8 && hour < 20) {
              monthlyData[month].daySum += temp;
              monthlyData[month].dayCount++;
            } else {
              monthlyData[month].nightSum += temp;
              monthlyData[month].nightCount++;
            }
          });

          // Obliczamy średnią dla każdego miesiąca
          const averagedData: Record<string, MonthlyTemperatures> = {};
          Object.keys(monthlyData).forEach((month) => {
            const { daySum, dayCount, nightSum, nightCount } = monthlyData[month];
            averagedData[month] = {
              day: dayCount > 0 ? parseFloat((daySum / dayCount).toFixed(1)) : 0,
              night: nightCount > 0 ? parseFloat((nightSum / nightCount).toFixed(1)) : 0,
            };
          });

          setData(averagedData);
        }
      } catch (err) {
        console.error("Error fetching monthly temperatures:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    fetchMonthlyData();
  }, [latitude, longitude]);

  return { data, loading, error };
}
