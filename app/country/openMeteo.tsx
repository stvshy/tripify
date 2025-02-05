// OpenMeteoWidgetManual.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';

interface OpenMeteoResponse {
  current_weather: {
    temperature: number;
    time: string; // API zwraca czas zaokrąglony do godziny, np. "2023-02-05T23:00"
  };
  timezone: string; // np. "Europe/Warsaw"
  // Jeśli API zwróci dodatkowo utc_offset_seconds, można je użyć – w tym przykładzie korzystamy z timeZone
}

interface OpenMeteoWidgetManualProps {
  latitude: number;
  longitude: number;
}

const OpenMeteoWidgetManual: React.FC<OpenMeteoWidgetManualProps> = ({ latitude, longitude }) => {
  const [data, setData] = useState<OpenMeteoResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        // Zapytanie pobiera current_weather i ustawia timezone=auto, dzięki czemu API zwróci odpowiednią strefę czasową
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m&current_weather=true&timezone=auto`;
        const response = await fetch(url);
        const result: OpenMeteoResponse = await response.json();
        setData(result);
      } catch (error) {
        console.error('Błąd pobierania danych pogodowych:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
  }, [latitude, longitude]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  if (!data || !data.current_weather) {
    return (
      <View style={styles.centered}>
        <Text>Błąd pobierania danych pogodowych.</Text>
      </View>
    );
  }

  // Używamy opcji timeZone z metody toLocaleTimeString, aby uzyskać dokładny czas w strefie lokalnej
  const formattedLocalTime = new Date().toLocaleTimeString("pl-PL", {
    timeZone: data.timezone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        Aktualna temperatura: {data.current_weather.temperature}°C
      </Text>
      <Text style={styles.text}>
        Czas w lokalizacji: {formattedLocalTime} ({data.timezone})
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 10 },
  container: { padding: 10, backgroundColor: '#eef', borderRadius: 10, marginVertical: 10 },
  text: { fontSize: 18, color: '#333' },
});

export default OpenMeteoWidgetManual;
