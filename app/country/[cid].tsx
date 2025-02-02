// app/country/[cid].tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

const CountryProfile = () => {
  const { cid } = useLocalSearchParams();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Country Profile: {cid}</Text>
      {/* Dodaj więcej informacji o kraju tutaj */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold'
  }
});

export default CountryProfile;
