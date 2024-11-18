// components/InteractiveMap.tsx

import React, { useContext, forwardRef, useImperativeHandle, useRef } from 'react';
import { StyleSheet, View, Dimensions, StyleProp, ViewStyle, TouchableOpacity, Text } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { ThemeContext } from '../app/config/ThemeContext';
import { captureRef } from 'react-native-view-shot';
import countriesData from '../assets/maps/countries.json';
import { Country, CountriesData } from '../.expo/types/country';

import {
  PanGestureHandler,
  PinchGestureHandler,
  GestureHandlerRootView,
  PanGestureHandlerGestureEvent,
  PinchGestureHandlerGestureEvent,
} from 'react-native-gesture-handler';
import Animated, {
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withDecay,
} from 'react-native-reanimated';

interface InteractiveMapProps {
  selectedCountries: string[];
  onCountryPress: (countryCode: string) => void;
  style?: StyleProp<ViewStyle>;
}

export interface InteractiveMapRef {
  capture: () => Promise<string | null>;
}

const windowWidth = Dimensions.get('window').width;
const windowHeight = Dimensions.get('window').height;

// Stałe wartości przesunięcia są teraz ustawione na 0
const initialTranslateX = 0;
const initialTranslateY = 0;

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

    const data: CountriesData = countriesData;

    const getCountryFill = (countryCode: string) => {
      const isVisited = selectedCountries.includes(countryCode);
      console.log(`Kraj: ${countryCode}, odwiedzony: ${isVisited}`);
      return isVisited ? '#00d7fc' : '#b2b7bf';
    };

    // Inicjalizacja wartości przesunięcia i skali
    const scale = useSharedValue(1);
    const translateX = useSharedValue(initialTranslateX);
    const translateY = useSharedValue(initialTranslateY);

    // Funkcja clamp
    const clamp = (value: number, min: number, max: number): number => {
      'worklet';
      return Math.min(Math.max(value, min), max);
    };

    // Handler dla gestu pinch
    const pinchHandler = useAnimatedGestureHandler<PinchGestureHandlerGestureEvent, { startScale: number }>({
      onStart: (_, ctx) => {
        ctx.startScale = scale.value;
      },
      onActive: (event, ctx) => {
        scale.value = ctx.startScale * event.scale;
        // Zapobieganie oddalaniu poniżej skali 1
        if (scale.value < 1) {
          scale.value = 1;
        }
      },
      onEnd: () => {
        // Ogranicz skalę między 1 a 4
        if (scale.value < 1) {
          scale.value = withTiming(1);
        } else if (scale.value > 4) {
          scale.value = withTiming(4);
        }
      },
    });

    // Handler dla gestu pan
    const panHandler = useAnimatedGestureHandler<PanGestureHandlerGestureEvent, { startX: number; startY: number }>({
      onStart: (_, ctx) => {
        ctx.startX = translateX.value;
        ctx.startY = translateY.value;
      },
      onActive: (event, ctx) => {
        let newTranslateX = ctx.startX + event.translationX;
        let newTranslateY = ctx.startY + event.translationY;

        // Oblicz granice przesuwania na podstawie skali i rozmiaru ekranu
        const maxTranslateX = (windowWidth * (scale.value - 1)) / 2;
        const minTranslateX = -maxTranslateX;
        const maxTranslateY = (windowHeight * (scale.value - 1)) / 2;
        const minTranslateY = -maxTranslateY;

        // Ograniczenie przesuwania w pionie (góra/dół)
        newTranslateY = clamp(newTranslateY, minTranslateY, maxTranslateY);

        // Ograniczenie przesuwania w poziomie (lewo/prawo)
        newTranslateX = clamp(newTranslateX, minTranslateX, maxTranslateX);

        translateX.value = newTranslateX;
        translateY.value = newTranslateY;
      },
      onEnd: (event) => {
        const maxTranslateX = (windowWidth * (scale.value - 1)) / 2;
        const maxTranslateY = (windowHeight * (scale.value - 1)) / 2;

        translateX.value = withDecay({
          velocity: event.velocityX,
          clamp: [-maxTranslateX, maxTranslateX],
        });
        translateY.value = withDecay({
          velocity: event.velocityY,
          clamp: [-maxTranslateY, maxTranslateY],
        });
      },
    });

    // Styl animowany dla transformacji
    const animatedStyle = useAnimatedStyle(() => ({
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
      ],
    }));

    // Funkcja resetująca mapę do początkowego stanu
    const resetMap = () => {
      scale.value = withTiming(1);
      translateX.value = withTiming(initialTranslateX);
      translateY.value = withTiming(initialTranslateY);
      console.log(`Map Reset - Scale: 1, TranslateX: ${initialTranslateX}, TranslateY: ${initialTranslateY}`);
    };

    // Referencje dla gestów
    const panRef = useRef();
    const pinchRef = useRef();

    return (
      <GestureHandlerRootView style={[styles.container, style]}>
        <PanGestureHandler
          onGestureEvent={panHandler}
          ref={panRef}
          simultaneousHandlers={pinchRef}
        >
          <Animated.View style={styles.container}>
            <PinchGestureHandler
              onGestureEvent={pinchHandler}
              ref={pinchRef}
              simultaneousHandlers={panRef}
            >
              <Animated.View style={styles.container}>
                <Animated.View style={animatedStyle}>
                  <View ref={mapViewRef} style={styles.mapContainer}>
                    <Svg
                      width="100%"
                      height="100%"
                      viewBox="232 0 1700 857" // Upewnij się, że viewBox centralizuje mapę
                      preserveAspectRatio="xMidYMid meet" // Utrzymuje proporcje i centrowanie
                    >
                      {data.countries.map((country: Country, index: number) => {
                        const countryCode = country.id;
                        if (!countryCode || countryCode.startsWith('UNKNOWN-')) {
                          return null;
                        }
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
            </PinchGestureHandler>
          </Animated.View>
        </PanGestureHandler>
        <TouchableOpacity style={styles.resetButton} onPress={resetMap}>
          <Text style={styles.resetButtonText}>Reset</Text>
        </TouchableOpacity>
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
  resetButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#7511b5',
    padding: 10,
    borderRadius: 5,
  },
  resetButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default InteractiveMap;
