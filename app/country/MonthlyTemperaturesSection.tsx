// app/country/MonthlyTemperaturesSection.tsx
import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useMonthlyTemperatures, MonthlyTemperatures } from './useMonthlyTemperatures';

interface Props {
  latitude: number;
  longitude: number;
}

const MonthlyTemperaturesSection: React.FC<Props> = ({ latitude, longitude }) => {
  const { data, loading, error } = useMonthlyTemperatures(latitude, longitude);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="small" color="#000" />
      </View>
    );
  }

  if (error || !data) {
    return <Text style={styles.errorText}>Error fetching monthly temperatures.</Text>;
  }

  return (
    <View style={styles.roundedContainer}>
      {Object.entries(data).map(([month, temps]: [string, MonthlyTemperatures]) => (
        <View key={month} style={styles.monthlyRow}>
          <Text style={styles.monthText}>{month}</Text>
          <Text style={styles.tempText}>🌞 {temps.day}°C</Text>
          <Text style={styles.tempText}>🌙 {temps.night}°C</Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  roundedContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    marginBottom: 10,
  },
  monthlyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  monthText: { fontSize: 15, fontWeight: '500', color: '#333', flex: 1 },
  tempText: { fontSize: 16, color: '#555', flex: 1, textAlign: 'right' },
  centered: { justifyContent: 'center', alignItems: 'center', padding: 10 },
  errorText: { color: 'red', fontSize: 16 },
});

export default MonthlyTemperaturesSection;
