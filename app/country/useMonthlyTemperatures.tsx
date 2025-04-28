import { useEffect, useState, useRef } from "react";
import { InteractionManager } from "react-native";

export interface MonthlyTemperatures {
  day: number;
  night: number;
}

interface MonthlyTemperaturesHook {
  data: Record<string, MonthlyTemperatures> | null;
  loading: boolean;
  error: boolean;
}

export function useMonthlyTemperatures(
  latitude: number,
  longitude: number
): MonthlyTemperaturesHook {
  const [data, setData] = useState<Record<string, MonthlyTemperatures> | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let isSubscribed = true;
    // Anuluj ewentualne poprzednie żądanie
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    // Definicja funkcji pobierającej dane
    const fetchMonthlyData = async () => {
      try {
        const currentYear = new Date().getFullYear();
        const targetYear = currentYear - 1;
        const start_date = `${targetYear}-01-01`;
        const end_date = `${targetYear}-12-31`;
        const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m&start_date=${start_date}&end_date=${end_date}&timezone=auto`;

        const response = await fetch(url, {
          signal: abortControllerRef.current?.signal,
        });
        const result = await response.json();

        if (!isSubscribed) return;

        if (result?.hourly?.time && result?.hourly?.temperature_2m) {
          processMonthlyDataInChunks(result.hourly);
        } else {
          setError(true);
          setLoading(false);
        }
      } catch (err: any) {
        if (isSubscribed && err.name !== "AbortError") {
          setError(true);
          setLoading(false);
        }
      }
    };

    // Funkcja dzieląca ciężkie obliczenia na mniejsze porcje
    const processMonthlyDataInChunks = (hourly: any) => {
      const monthlyData: Record<
        string,
        {
          daySum: number;
          dayCount: number;
          nightSum: number;
          nightCount: number;
        }
      > = {};
      const CHUNK_SIZE = 1000;
      let index = 0;
      const totalLength = hourly.time.length;

      const processChunk = () => {
        for (let i = 0; i < CHUNK_SIZE && index < totalLength; i++, index++) {
          const timestamp = hourly.time[index];
          const temp = hourly.temperature_2m[index];
          const date = new Date(timestamp);
          const month = date.toLocaleString("en-US", { month: "long" });
          const hour = date.getHours();

          if (!monthlyData[month]) {
            monthlyData[month] = {
              daySum: 0,
              dayCount: 0,
              nightSum: 0,
              nightCount: 0,
            };
          }

          if (hour >= 8 && hour < 20) {
            monthlyData[month].daySum += temp;
            monthlyData[month].dayCount++;
          } else {
            monthlyData[month].nightSum += temp;
            monthlyData[month].nightCount++;
          }
        }

        if (index < totalLength) {
          requestAnimationFrame(processChunk);
        } else {
          const averagedData: Record<string, MonthlyTemperatures> = {};
          Object.keys(monthlyData).forEach((month) => {
            const { daySum, dayCount, nightSum, nightCount } =
              monthlyData[month];
            averagedData[month] = {
              day: dayCount ? parseFloat((daySum / dayCount).toFixed(1)) : 0,
              night: nightCount
                ? parseFloat((nightSum / nightCount).toFixed(1))
                : 0,
            };
          });
          if (isSubscribed) {
            setData(averagedData);
            setLoading(false);
          }
        }
      };

      requestAnimationFrame(processChunk);
    };

    // Uruchamiamy pobieranie danych po zakończeniu interakcji
    InteractionManager.runAfterInteractions(() => {
      fetchMonthlyData();
    });

    // Funkcja czyszcząca
    return () => {
      isSubscribed = false;
      abortControllerRef.current?.abort();
    };
  }, [latitude, longitude]);

  return { data, loading, error };
}
