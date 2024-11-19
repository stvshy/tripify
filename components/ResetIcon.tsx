import React, { useContext } from 'react';
import { StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ThemeContext } from '../app/config/ThemeContext'; // Importowanie kontekstu

// Dynamiczne rozmiary przycisku i ikony
const { width, height } = Dimensions.get('window');
const BUTTON_SIZE = Math.min(width, height) * 0.12; // 12% mniejszego z wymiarów
const ICON_SIZE = BUTTON_SIZE * 0.48; // Ikona zajmuje 50% wielkości przycisku

const ResetButton = ({ resetMap }: { resetMap: () => void }) => {
  const { isDarkTheme } = useContext(ThemeContext);

  // Kolory dla jasnego i ciemnego motywu
  const buttonBackgroundColor = isDarkTheme ? '#2c2c2c' : '#9d23ea';

  return (
    <TouchableOpacity
      style={[styles.resetButton, { backgroundColor: buttonBackgroundColor }]} // Kolor dynamiczny
      onPress={resetMap}
      activeOpacity={0.7}
    >
      <Feather name="code" size={ICON_SIZE} style={styles.resetIcon} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  resetButton: {
    position: 'absolute',
    bottom: 20, // Odległość od dolnej krawędzi ekranu
    right: 20, // Odległość od prawej krawędzi ekranu
    width: BUTTON_SIZE, // Dynamiczna szerokość
    height: BUTTON_SIZE, // Dynamiczna wysokość
    borderRadius: BUTTON_SIZE / 2, // Idealny okrąg
    alignItems: 'center', // Wyśrodkowanie ikony w poziomie
    justifyContent: 'center', // Wyśrodkowanie ikony w pionie
    elevation: 5, // Cień na Androidzie
    shadowColor: '#000', // Cień na iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  resetIcon: {
    transform: [{ rotate: '-45deg' }], // Obrót ikony o -45 stopni
    color: '#fff', // Kolor ikony
  },
});

export default ResetButton;
