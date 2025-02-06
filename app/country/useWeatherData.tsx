// useWeatherData.ts
import { useEffect, useState } from 'react';

interface WeatherData {
  temperature: number;
  time: string; // sformatowany lokalny czas (np. "23:12:34")
  timezone: string;
}

export function useWeatherData(latitude: number, longitude: number): {
  data: WeatherData | null;
  loading: boolean;
  error: boolean;
} {
  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function fetchWeather() {
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m&current_weather=true&timezone=auto`;
        const response = await fetch(url);
        const result = await response.json();
        if (result && result.current_weather) {
          // Formatowanie czasu z użyciem strefy czasowej podanej przez API
          const formattedLocalTime = new Date().toLocaleTimeString("en-US", {
            timeZone: result.timezone,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
          });
          setData({
            temperature: result.current_weather.temperature,
            time: formattedLocalTime,
            timezone: result.timezone,
          });
        }
      } catch (err) {
        console.error("Error fetching weather data:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    fetchWeather();
  }, [latitude, longitude]);

  return { data, loading, error };
}
