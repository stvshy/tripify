import React, { useContext, forwardRef, useImperativeHandle, useRef } from 'react';
import { StyleSheet, Dimensions, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import WorldMap from '../assets/world.svg';
import { ThemeContext } from '../app/config/ThemeContext';
import { captureRef } from 'react-native-view-shot';

interface InteractiveMapProps {
  selectedCountries: string[];
  onCountryPress: (countryCode: string) => void;
}

export interface InteractiveMapRef {
  capture: () => Promise<string | null>;
}

const { width } = Dimensions.get('window');

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

    return (
      <View ref={mapViewRef} style={styles.container}>
        <WorldMap width={width * 0.9} height={(width * 0.9) * 0.5} />
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
});

export default InteractiveMap;
