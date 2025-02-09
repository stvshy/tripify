import { useEffect, useState, useRef } from 'react';
import { InteractionManager } from 'react-native';

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
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let isSubscribed = true;
    abortControllerRef.current?.abort(); // Abort any existing request
    abortControllerRef.current = new AbortController();

    const task = InteractionManager.runAfterInteractions(() => {
      async function fetchMonthlyData() {
        try {
          const currentYear = new Date().getFullYear();
          const targetYear = currentYear - 1;
          const start_date = `${targetYear}-01-01`;
          const end_date = `${targetYear}-12-31`;
          const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m&start_date=${start_date}&end_date=${end_date}&timezone=auto`;
          
          const response = await fetch(url, {
            signal: abortControllerRef.current?.signal
          });
          
          if (!isSubscribed) return;
          
          const result = await response.json();
          if (result && result.hourly && result.hourly.time && result.hourly.temperature_2m) {
            const monthlyData: Record<string, { daySum: number; dayCount: number; nightSum: number; nightCount: number }> = {};
            
            // Process data only if component is still mounted
            if (isSubscribed) {
              result.hourly.time.forEach((timestamp: string, index: number) => {
                const temp = result.hourly.temperature_2m[index];
                const date = new Date(timestamp);
                const month = date.toLocaleString('en-US', { month: 'long' });
                const hour = date.getHours();
                
                if (!monthlyData[month]) {
                  monthlyData[month] = { daySum: 0, dayCount: 0, nightSum: 0, nightCount: 0 };
                }
                
                if (hour >= 8 && hour < 20) {
                  monthlyData[month].daySum += temp;
                  monthlyData[month].dayCount++;
                } else {
                  monthlyData[month].nightSum += temp;
                  monthlyData[month].nightCount++;
                }
              });

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
          }
        } catch (err) {
          if (err instanceof Error && err.name === 'AbortError') {
            return; // Ignore abort errors
          }
          console.error("Error fetching monthly temperatures:", err);
          if (isSubscribed) {
            setError(true);
          }
        } finally {
          if (isSubscribed) {
            setLoading(false);
          }
        }
      }
      
      fetchMonthlyData();
    });

    return () => {
      isSubscribed = false;
      task.cancel();
      abortControllerRef.current?.abort();
    };
  }, [latitude, longitude]);

  return { data, loading, error };
}