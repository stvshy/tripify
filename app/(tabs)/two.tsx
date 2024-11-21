// app/(tabs)/two.tsx
import React from 'react';
import { StyleSheet } from 'react-native';
import ChooseCountriesScreen from '../chooseCountries'; // Ścieżka do ChooseCountriesScreen

type TabTwoScreenProps = {
  fromTab?: boolean;
};

export default function TabTwoScreen() {
  return <ChooseCountriesScreen fromTab={true} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
