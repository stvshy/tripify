// app/country/MonthlyTemperaturesSection.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useMonthlyTemperatures, MonthlyTemperatures } from './useMonthlyTemperatures';

interface Props {
  latitude: number;
  longitude: number;
}

const MonthlyTemperaturesSection: React.FC<Props> = ({ latitude, longitude }) => {
  const { data, loading, error } = useMonthlyTemperatures(latitude, longitude);

  if (loading) {
    // Skeleton placeholder zamiast spinnera
    return (
      <View style={styles.skeletonContainer}>
        <View style={styles.skeletonLine} />
        <View style={styles.skeletonLine} />
        <View style={styles.skeletonLine} />
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
  errorText: { color: 'red', fontSize: 16 },
  skeletonContainer: { padding: 12 },
  skeletonLine: {
    height: 20,
    backgroundColor: '#eee',
    marginBottom: 8,
    borderRadius: 10,
  },
});

export default MonthlyTemperaturesSection;
