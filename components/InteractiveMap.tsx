// components/InteractiveMap.tsx

import React, { useContext, forwardRef, useImperativeHandle, useRef } from 'react';
import { StyleSheet, View, Dimensions, StyleProp, ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { ThemeContext } from '../app/config/ThemeContext';
import { captureRef } from 'react-native-view-shot';
import countriesData from '../assets/maps/countries.json';
import { Country, CountriesData } from '../.expo/types/country';

interface InteractiveMapProps {
  selectedCountries: string[]; // Tablica kodów krajów (cca2)
  onCountryPress: (countryCode: string) => void;
  style?: StyleProp<ViewStyle>; // Akceptowanie stylu z zewnątrz
}

export interface InteractiveMapRef {
  capture: () => Promise<string | null>;
}

const InteractiveMap = forwardRef<InteractiveMapRef, InteractiveMapProps>(
  ({ selectedCountries, onCountryPress, style }, ref) => {
    const { isDarkTheme } = useContext(ThemeContext);
    const themeColor = isDarkTheme ? '#ffffff' : '#000000';
    const mapViewRef = useRef<View>(null);

    useImperativeHandle(ref, () => ({
      capture: async () => {
        if (mapViewRef.current) {
          const uri = await captureRef(mapViewRef, { format: 'png', quality: 0.8 });
          return uri;
        }
        return null;
      },
    }));

    // Typizacja danych krajów
    const data: CountriesData = countriesData;

    // Funkcja do ustalania koloru kraju
    const getCountryFill = (countryCode: string) => {
      const isVisited = selectedCountries.includes(countryCode);
      console.log(`Kraj: ${countryCode}, odwiedzony: ${isVisited}`);
      return isVisited ? '#00d7fc' : '#b2b7bf'; // Możesz zmienić kolory na bardziej pasujące
    };

    return (
      <View ref={mapViewRef} style={[styles.container, style]}>
        <Svg
          style={styles.svg}
          viewBox="232 0 1700 857" // Upewnij się, że viewBox odpowiada oryginalnym wymiarom SVG
          preserveAspectRatio="xMidYMid meet" // Utrzymuje proporcje i centrowanie
        >
          {data.countries.map((country: Country, index: number) => {
            const countryCode = country.id;
            console.log(`Rendering country: ${country.name} with code: ${countryCode}`);

            if (!countryCode || countryCode.startsWith('UNKNOWN-')) {
              // Pomijamy kraje bez kodu lub z przypisanym UNKNOWN id
              return null;
            }

            return (
              <Path
                key={`${countryCode}-${index}`} // Używamy kodu i indeksu jako klucz
                d={country.path}
                fill={getCountryFill(countryCode)}
                stroke="#FFFFFF"
                strokeWidth={1}
                onPress={() => onCountryPress(countryCode)}
              />
            );
          })}
        </Svg>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // Możesz dodać padding lub margin, jeśli potrzebujesz
  },
  svg: {
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default InteractiveMap;
