import React, { useContext, forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { StyleSheet, View, Dimensions, StyleProp, ViewStyle, TouchableOpacity, Text, ActivityIndicator, Alert } from 'react-native';
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
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';

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
    const { isDarkTheme, toggleTheme } = useContext(ThemeContext);
    const theme = useTheme(); // Używanie hooka useTheme
    const themeColor = isDarkTheme ? theme.colors.surfaceVariant : theme.colors.primary;
    const mapViewRef = useRef<View>(null);
    const baseMapRef = useRef<View>(null); 
    const [isSharing, setIsSharing] = useState(false); // Stan ładowania udostępniania
    const scaleValue = useSharedValue(1);

    const animatedToggleStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scaleValue.value }],
    }));

    const handleToggleTheme = () => {
      // Rozpoczęcie animacji skalowania
      scaleValue.value = withTiming(1.2, { duration: 100 }, () => {
        scaleValue.value = withTiming(1, { duration: 100 });
      });
      toggleTheme();
    };
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
        setIsSharing(true); // Rozpoczęcie ładowania
        const isAvailable = await Sharing.isAvailableAsync();
        if (!isAvailable) {
          Alert.alert('Błąd', 'Udostępnianie nie jest dostępne na tym urządzeniu');
          setIsSharing(false);
          return;
        }

        // Przechwycenie ukrytej bazowej mapy
        const uri = await captureRef(baseMapRef, { format: 'png', quality: 1 });

        if (uri) {
          await Sharing.shareAsync(uri);
        }
      } catch (error) {
        console.error('Błąd podczas udostępniania mapy:', error);
        Alert.alert('Błąd', 'Wystąpił problem podczas udostępniania mapy');
      } finally {
        setIsSharing(false); // Zakończenie ładowania
      }
    };
    const handlePathPress = (countryCode: string) => {
      onCountryPress(countryCode);
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
                        stroke={theme.colors.outline}
                        strokeWidth={1}
                        onPress={() => handlePathPress(countryCode)} // Używanie handlePathPress
                      />
                    );
                  })}
                </Svg>
              </View>
            </Animated.View>
          </Animated.View>
        </GestureDetector>

        {/* Ukryta bazowa mapa */}
        <View ref={baseMapRef} style={[styles.baseMapContainer, { pointerEvents: 'none' }]}>
          <Svg width="100%" height="100%" viewBox="232 0 1700 857" preserveAspectRatio="xMidYMid meet">
            {data.countries.map((country: Country, index: number) => {
              const countryCode = country.id;
              if (!countryCode || countryCode.startsWith('UNKNOWN-')) return null;
              return (
                <Path
                  key={`${countryCode}-${index}`}
                  d={country.path}
                  fill={getCountryFill(countryCode)}
                  stroke={theme.colors.outline}
                  strokeWidth={1}
                />
              );
            })}
          </Svg>
        </View>
        {/* Kontener dla przycisków */}
        <View style={styles.buttonContainer}>
          {/* Przycisk Reset */}
          <TouchableOpacity
            style={[styles.resetButton, { backgroundColor: theme.colors.primary }]}
            onPress={resetMap}
            activeOpacity={0.7}>
            <Feather name="code" size={ICON_SIZE} style={styles.resetIcon} color={theme.colors.onPrimary} />
          </TouchableOpacity>

          {/* Przycisk Udostępniania */}
          <TouchableOpacity
            style={[styles.shareButton, { backgroundColor: theme.colors.primary }]}
            onPress={shareMap}
            activeOpacity={0.7}
            disabled={isSharing}>
            {isSharing ? (
              <ActivityIndicator size="small" color={theme.colors.onPrimary} />
            ) : (
              <Feather name="share-2" size={ICON_SIZE} color={theme.colors.onPrimary} />
            )}
          </TouchableOpacity>

          {/* Przycisk Przełączania Motywu */}
          <Animated.View style={[styles.toggleButtonContainer, animatedToggleStyle]}>
            <TouchableOpacity
              onPress={handleToggleTheme}
              style={[
                styles.toggleButton,
                { backgroundColor: theme.colors.primary },
              ]}
              activeOpacity={0.7}>
              <MaterialIcons
                name={isDarkTheme ? 'dark-mode' : 'light-mode'}
                size={ICON_SIZE}
                color={theme.colors.onPrimary}
              />
            </TouchableOpacity>
          </Animated.View>
        </View>
      </GestureHandlerRootView>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapContainer: {
    width: '100%',
    height: '100%',
  },
  baseMapContainer: {
    position: 'absolute',
    top: -1000, // Przesunięcie poza ekran
    left: -1000,
    width: 2000, // Wystarczająco duża, aby obejmować mapę
    height: 2000,
    opacity: 0, // Ukrycie mapy
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  resetButton: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10, // Odstęp między przyciskami
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  shareButton: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10, // Odstęp między przyciskami
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  toggleButtonContainer: {
    // Możesz dodać dodatkowe style, jeśli potrzebujesz
  },
  toggleButton: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10, // Odstęp między przyciskami
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  resetIcon: {
    transform: [{ rotate: '-45deg' }],
    fontSize: ICON_SIZE,
  },
});

export default InteractiveMap;