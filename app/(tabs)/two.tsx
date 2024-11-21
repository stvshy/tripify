// app/(tabs)/two.tsx
import React from 'react';
import { StyleSheet } from 'react-native';
import ChooseCountriesScreen from '../chooseCountries'; // Ścieżka do ChooseCountriesScreen

export default function TabTwoScreen() {
  return <ChooseCountriesScreen />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
