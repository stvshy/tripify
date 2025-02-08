import { useEffect, useState } from 'react';
import { InteractionManager } from 'react-native';

interface WeatherData {
  temperature: number;
  time: string;
  timezone: string;
}

// Globalny cache danych pogodowych – aby nie wykonywać obliczeń przy każdej wizycie
const weatherCache: Record<string, WeatherData> = {};

export function useWeatherData(
  latitude: number,
  longitude: number
): { data: WeatherData | null; loading: boolean; error: boolean } {
  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (latitude == null || longitude == null) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const cacheKey = `${latitude}_${longitude}`;

    if (weatherCache[cacheKey]) {
      setData(weatherCache[cacheKey]);
      setLoading(false);
      return;
    }

    // Używamy InteractionManager, aby opóźnić ciężkie operacje do momentu zakończenia interakcji
    const task = InteractionManager.runAfterInteractions(() => {
      async function fetchWeather() {
        try {
          const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m&current_weather=true&timezone=auto`;
          const response = await fetch(url, { signal: controller.signal });
          const result = await response.json();
          if (result && result.current_weather) {
            const formattedLocalTime = new Date().toLocaleTimeString("en-US", {
              timeZone: result.timezone,
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false,
            });
            const weather: WeatherData = {
              temperature: result.current_weather.temperature,
              time: formattedLocalTime,
              timezone: result.timezone,
            };
            setData(weather);
            weatherCache[cacheKey] = weather;
          }
        } catch (err: any) {
          if (err.name !== 'AbortError') {
            console.error("Error fetching weather data:", err);
            setError(true);
          }
        } finally {
          setLoading(false);
        }
      }
      fetchWeather();
    });

    return () => {
      controller.abort();
      if (task && typeof task.cancel === 'function') {
        task.cancel();
      }
    };
  }, [latitude, longitude]);

  return { data, loading, error };
}
