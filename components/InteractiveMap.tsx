// components/InteractiveMap.tsx

import React, { useContext, forwardRef, useImperativeHandle, useRef } from 'react';
import { StyleSheet, View, Dimensions, StyleProp, ViewStyle, TouchableOpacity, Text  } from 'react-native';
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
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withDecay,
} from 'react-native-reanimated';

interface InteractiveMapProps {
  selectedCountries: string[]; // Tablica kodów krajów (cca2)
  onCountryPress: (countryCode: string) => void;
  style?: StyleProp<ViewStyle>; // Akceptowanie stylu z zewnątrz
}

export interface InteractiveMapRef {
  capture: () => Promise<string | null>;
}

const windowWidth = Dimensions.get('window').width;
const windowHeight = Dimensions.get('window').height;

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

    // Shared values for scale and translation
    const scale = useSharedValue(1);
    const focalX = useSharedValue(0);
    const focalY = useSharedValue(0);
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);

    // Pinch gesture handler
    const pinchHandler = useAnimatedGestureHandler<PinchGestureHandlerGestureEvent, {}>({
      onStart: (_, ctx: any) => {
        ctx.startScale = scale.value;
      },
      onActive: (event, ctx: any) => {
        scale.value = ctx.startScale * event.scale;
      },
      onEnd: () => {
        // Możesz dodać logikę ograniczającą skalę
        if (scale.value < 1) {
          scale.value = withTiming(1);
        } else if (scale.value > 4) {
          scale.value = withTiming(4);
        }
      },
    });

    // Pan gesture handler
    const panHandler = useAnimatedGestureHandler<PanGestureHandlerGestureEvent, {}>({
      onStart: (_, ctx: any) => {
        ctx.startX = translateX.value;
        ctx.startY = translateY.value;
      },
      onActive: (event, ctx: any) => {
        translateX.value = ctx.startX + event.translationX;
        translateY.value = ctx.startY + event.translationY;
      },
      onEnd: (event) => {
        translateX.value = withDecay({ velocity: event.velocityX });
        translateY.value = withDecay({ velocity: event.velocityY });
      },
    });

    // Animated style for the SVG
    const animatedStyle = useAnimatedStyle(() => ({
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
      ],
    }));

   
    const resetMap = () => {
      scale.value = withTiming(1);
      translateX.value = withTiming(0);
      translateY.value = withTiming(0);
    };

    return (
      <GestureHandlerRootView style={[styles.container, style]}>
        <PanGestureHandler onGestureEvent={panHandler}>
          <Animated.View style={styles.container}>
            <PinchGestureHandler onGestureEvent={pinchHandler}>
              <Animated.View style={styles.container}>
                <Animated.View style={animatedStyle}>
                  <View ref={mapViewRef} style={styles.mapContainer}>
                    <Svg
                      width={windowWidth}
                      height={windowHeight}
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
  svg: {
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
