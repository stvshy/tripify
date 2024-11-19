import React, { useContext, forwardRef, useImperativeHandle, useRef } from 'react';
import { StyleSheet, View, Dimensions, StyleProp, ViewStyle, TouchableOpacity, Text } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { ThemeContext } from '../app/config/ThemeContext';
import { captureRef } from 'react-native-view-shot';
import countriesData from '../assets/maps/countries.json';
import { Country, CountriesData } from '../.expo/types/country';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import ResetButton from './ResetIcon';
import * as Sharing from 'expo-sharing';

import Animated, {
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withDecay,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';

const windowWidth = Dimensions.get('window').width;
const windowHeight = Dimensions.get('window').height;
const { width, height } = Dimensions.get('window');
const BUTTON_SIZE = Math.min(width, height) * 0.08; // 8% mniejszego z wymiarów
const ICON_SIZE = BUTTON_SIZE * 0.5; // Ikona zajmuje 50% wielkości przycisku

interface InteractiveMapProps {
  selectedCountries: string[];
  onCountryPress: (countryCode: string) => void;
  style?: StyleProp<ViewStyle>;
}

export interface InteractiveMapRef {
  capture: () => Promise<string | null>;
}

const initialTranslateX = 0;
const initialTranslateY = 0;

const InteractiveMap = forwardRef<InteractiveMapRef, InteractiveMapProps>(
  ({ selectedCountries, onCountryPress, style }, ref) => {
    const { isDarkTheme } = useContext(ThemeContext);
    const themeColor = isDarkTheme ? '#ffffff' : '#000000';
    const mapViewRef = useRef<View>(null);
    const baseMapRef = useRef<View>(null); 

    useImperativeHandle(ref, () => ({
      capture: async () => {
        if (mapViewRef.current) {
          const uri = await captureRef(mapViewRef, { format: 'png', quality: 0.8 });
          return uri;
        }
        return null;
      },
    }));

    const data: CountriesData = countriesData;

    const getCountryFill = (countryCode: string) => {
      const isVisited = selectedCountries.includes(countryCode);
      return isVisited ? '#00d7fc' : '#b2b7bf';
    };

    const scale = useSharedValue(1);
    const translateX = useSharedValue(initialTranslateX);
    const translateY = useSharedValue(initialTranslateY);
    const focalX = useSharedValue(0);
    const focalY = useSharedValue(0);

    const clamp = (value: number, min: number, max: number): number => {
      'worklet';
      return Math.min(Math.max(value, min), max);
    };

    // Referencje do gestów
    const panRef = useRef(null);
    const pinchRef = useRef(null);
    const startScale = useSharedValue(1);
    const startX = useSharedValue(0);
    const startY = useSharedValue(0);
    
    // Definicja gestu pinch z limitem palców
    const pinchGesture = Gesture.Pinch()
      .onStart((event) => {
        startScale.value = scale.value;
        startX.value = translateX.value;
        startY.value = translateY.value;
        focalX.value = event.focalX;
        focalY.value = event.focalY;
      })
      .onUpdate((event) => {
        const newScale = startScale.value * event.scale;
        scale.value = Math.max(1, Math.min(6, newScale));
    
        const scaleFactor = scale.value / startScale.value;
        const zoomTranslateX = focalX.value - windowWidth / 2;
        const zoomTranslateY = focalY.value - windowHeight / 2;
    
        translateX.value = startX.value - zoomTranslateX * (scaleFactor - 1);
        translateY.value = startY.value - zoomTranslateY * (scaleFactor - 1);
    
        const maxTranslateY = (windowHeight * (scale.value - 1)) / 4;
        translateY.value = clamp(translateY.value, -maxTranslateY, maxTranslateY);
      })
      .onEnd(() => {
        if (scale.value < 1) {
          scale.value = withTiming(1);
        } else if (scale.value > 6) {
          scale.value = withTiming(6);
        }
      });

    // Definicja gestu pan z limitem palców
    const panGesture = Gesture.Pan()
      .minPointers(1) // Minimum jeden palec
      .maxPointers(1) // Maksymalnie jeden palec
      .onStart(() => {
        startX.value = translateX.value;
        startY.value = translateY.value;
      })
      .onUpdate((event) => {
        const maxTranslateX = (windowWidth * (scale.value - 1)) / 2;
        const maxTranslateY = (windowHeight * (scale.value - 1)) / 4;
        const minTranslateX = -maxTranslateX;
        const minTranslateY = -maxTranslateY;
    
        translateX.value = clamp(startX.value + event.translationX, minTranslateX, maxTranslateX);
        translateY.value = clamp(startY.value + event.translationY, minTranslateY, maxTranslateY);
      })
      .onEnd((event) => {
        const maxTranslateX = (windowWidth * (scale.value - 1)) / 2;
        const maxTranslateY = (windowHeight * (scale.value - 1)) / 4;
    
        translateX.value = withDecay({
          velocity: event.velocityX,
          clamp: [-maxTranslateX, maxTranslateX],
        });
        translateY.value = withDecay({
          velocity: event.velocityY,
          clamp: [-maxTranslateY, maxTranslateY],
        });
      });

    // Styl animowany
    const animatedStyle = useAnimatedStyle(() => ({
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
      ],
    }));

    // Funkcja resetująca mapę
    const resetMap = () => {
      scale.value = withTiming(1, { duration: 300 });
      translateX.value = withTiming(0, { duration: 300 });
      translateY.value = withTiming(0, { duration: 300 });
    };    
     // Funkcja udostępniania mapy
     const shareMap = async () => {
      try {
        // Sprawdzenie, czy udostępnianie jest dostępne
        const isAvailable = await Sharing.isAvailableAsync();
        if (!isAvailable) {
          alert('Udostępnianie nie jest dostępne na tym urządzeniu');
          return;
        }

        // Przechwycenie ukrytej bazowej mapy
        const uri = await captureRef(baseMapRef, { format: 'png', quality: 1 });

        if (uri) {
          await Sharing.shareAsync(uri);
        }
      } catch (error) {
        console.error('Błąd podczas udostępniania mapy:', error);
      }
    };
      return (
      <GestureHandlerRootView style={[styles.container, style]}>
        {/* Interaktywna mapa */}
        <GestureDetector gesture={Gesture.Simultaneous(pinchGesture, panGesture)}>
          <Animated.View style={styles.container}>
            <Animated.View style={animatedStyle}>
              <View ref={mapViewRef} style={styles.mapContainer}>
                <Svg width="100%" height="100%" viewBox="232 0 1700 857" preserveAspectRatio="xMidYMid meet">
                  {data.countries.map((country: Country, index: number) => {
                    const countryCode = country.id;
                    if (!countryCode || countryCode.startsWith('UNKNOWN-')) return null;
                    return (
                      <Path
                        key={`${countryCode}-${index}`}
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
            </Animated.View>
          </Animated.View>
        </GestureDetector>

        {/* Ukryta bazowa mapa */}
        <View ref={baseMapRef} style={styles.baseMapContainer}>
          <Svg width="100%" height="100%" viewBox="232 0 1700 857" preserveAspectRatio="xMidYMid meet">
            {data.countries.map((country: Country, index: number) => {
              const countryCode = country.id;
              if (!countryCode || countryCode.startsWith('UNKNOWN-')) return null;
              return (
                <Path
                  key={`${countryCode}-${index}`}
                  d={country.path}
                  fill={getCountryFill(countryCode)}
                  stroke="#FFFFFF"
                  strokeWidth={1}
                  // Nie dodajemy onPress, aby interakcje były tylko w interaktywnej mapie
                />
              );
            })}
          </Svg>
        </View>

        <ResetButton resetMap={resetMap} />

        {/* Przycisk Udostępniania */}
        <TouchableOpacity style={styles.shareButton} onPress={shareMap} activeOpacity={0.7}>
          <Feather name="share-2" size={ICON_SIZE} color="#fff" />
        </TouchableOpacity>
      </GestureHandlerRootView>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  baseMapContainer: {
    position: 'absolute',
    top: -1000, // Przesunięcie poza ekran
    left: -1000,
    width: 2000, // Wystarczająco duża, aby obejmować mapę
    height: 2000,
    opacity: 0, // Ukrycie mapy
  },
  mapContainer: {
    width: '100%',
    height: '100%',
  },
  shareButton: {
    position: 'absolute',
    bottom: 20,
    right: BUTTON_SIZE + 30, // Odstęp od przycisku resetu
    backgroundColor: '#7511b5', // Kolor tła przycisku udostępniania
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  resetButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#7511b5', // Fioletowe tło
    width: 50,
    height: 50,
    borderRadius: 25, // Okrągły przycisk
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5, // Cień na Androidzie
    shadowColor: '#000', // Cień na iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  resetIcon: {
    transform: [{ rotate: '-45deg' }], // Obrót o -45 stopni
  },
});

export default InteractiveMap;