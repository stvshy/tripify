import React, { useContext, forwardRef, useImperativeHandle, useRef } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import { ThemeContext } from '../app/config/ThemeContext';
import WorldMap from '../assets/world.svg'; // Import pliku SVG jako komponent
import { captureRef } from 'react-native-view-shot';

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

    // Funkcja do ustalania koloru kraju
    const getCountryFill = (countryCode: string) => {
      const isVisited = selectedCountries.includes(countryCode);
      console.log(`Kraj: ${countryCode}, odwiedzony: ${isVisited}`);
      return isVisited ? '#0000FF' : themeColor;
    };
    

    return (
      <View ref={mapViewRef} style={styles.container}>
        {/* Renderowanie SVG mapy */}
        <WorldMap
          width={width}
          height={height}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Przykład jak dodać obsługę kliknięcia na kraje */}
          <g>
            <path
              d="M20,20L40,40L60,20Z" // Przykładowy path
              fill={getCountryFill('US')}
              onTouchStart={() => onCountryPress('US')}
            />
            <path
              d="M60,60L80,80L100,60Z" // Przykładowy path
              fill={getCountryFill('FR')}
              onTouchStart={() => onCountryPress('FR')}
            />
          </g>
        </WorldMap>
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
