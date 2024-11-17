// components/InteractiveMap.tsx
import React, { useContext, forwardRef, useImperativeHandle, useRef } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { ThemeContext } from '../app/config/ThemeContext';
import { captureRef } from 'react-native-view-shot';
import countriesData from '../assets/maps/countries.json'; // Import pliku JSON z krajami
import { Country, CountriesData } from '../.expo/types/country'; // Import zdefiniowanych typów

interface InteractiveMapProps {
  selectedCountries: string[];
  onCountryPress: (countryCode: string) => void;
}

export interface InteractiveMapRef {
  capture: () => Promise<string | null>;
}

const { width, height } = Dimensions.get('window');

const InteractiveMap = forwardRef<InteractiveMapRef, InteractiveMapProps>(
  ({ selectedCountries, onCountryPress }, ref) => {
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
      return isVisited ? '#0000FF' : themeColor;
    };

    return (
      <View ref={mapViewRef} style={styles.container}>
        <Svg
          width={width}
          height={height}
          viewBox="0 0 2000 1001" // Dostosuj do rozmiarów Twojej mapy SVG
        >
          {data.countries.map((country: Country, index: number) => {
            // Ustal unikalny klucz
            const key = country.id || `country-${index}-${country.class}`;

            // Ustal kod kraju; jeśli `id` jest null, możesz użyć innego unikalnego identyfikatora
            const countryCode = country.id || `class-${country.class}-${index}`;

            return (
              <Path
                key={key}
                d={country.path}
                fill={country.id ? getCountryFill(country.id) : themeColor}
                stroke="#FFFFFF"
                strokeWidth={1}
                onPress={() => {
                  if (country.id) {
                    onCountryPress(country.id);
                  }
                }}
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
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default InteractiveMap;
