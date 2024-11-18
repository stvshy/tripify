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

    const scale = useSharedValue(1);
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);

    // Dodanie typów do funkcji clamp
    const clamp = (value: number, min: number, max: number): number => {
      'worklet';
      return Math.min(Math.max(value, min), max);
    };

    const pinchHandler = useAnimatedGestureHandler<PinchGestureHandlerGestureEvent, { startScale: number }>({
      onStart: (_, ctx) => {
        ctx.startScale = scale.value;
      },
      onActive: (event, ctx) => {
        scale.value = ctx.startScale * event.scale;
      },
      onEnd: () => {
        if (scale.value < 1) {
          scale.value = withTiming(1);
        } else if (scale.value > 4) {
          scale.value = withTiming(4);
        }
      },
    });

    const panHandler = useAnimatedGestureHandler<PanGestureHandlerGestureEvent, { startX: number; startY: number }>({
      onStart: (_, ctx) => {
        ctx.startX = translateX.value;
        ctx.startY = translateY.value;
      },
      onActive: (event, ctx) => {
        const newTranslateX = ctx.startX + event.translationX;
        const newTranslateY = ctx.startY + event.translationY;

        const maxTranslateX = (windowWidth * (scale.value - 1)) / 2;
        const minTranslateX = -maxTranslateX;
        const maxTranslateY = (windowHeight * (scale.value - 1)) / 2;
        const minTranslateY = -maxTranslateY;

        translateX.value = clamp(newTranslateX, minTranslateX, maxTranslateX);
        translateY.value = clamp(newTranslateY, minTranslateY, maxTranslateY);
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
                      viewBox={`${232 - translateX.value / scale.value} ${0 - translateY.value / scale.value} ${1700 / scale.value} ${857 / scale.value}`}
                      preserveAspectRatio="xMidYMid meet"
                    >
                      {data.countries.map((country: Country, index: number) => {
                        const countryCode = country.id;
                        console.log(`Rendering country: ${country.name} with code: ${countryCode}`);

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
