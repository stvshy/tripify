import React, { useContext, forwardRef, useImperativeHandle, useRef } from 'react';
import { StyleSheet, View, Dimensions, StyleProp, ViewStyle, TouchableOpacity, Text } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { ThemeContext } from '../app/config/ThemeContext';
import { captureRef } from 'react-native-view-shot';
import countriesData from '../assets/maps/countries.json';
import { interpolate, withSpring } from 'react-native-reanimated';
import { Country, CountriesData } from '../.expo/types/country';
import { Gesture, GestureDetector, GestureHandlerRootView, GestureUpdateEvent, GestureStateChangeEvent, PanGestureHandlerEventPayload, PinchGestureHandlerEventPayload } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withDecay,
} from 'react-native-reanimated';

const windowWidth = Dimensions.get('window').width;
const windowHeight = Dimensions.get('window').height;

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

    // Pinch gesture handler with improved state managem

    // Pan gesture handler
    const panRef = useRef(null);
    const pinchRef = useRef(null);
    const startScale = useSharedValue(1);
    const startX = useSharedValue(0);
    const startY = useSharedValue(0);
    
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
    
    const panStartX = useSharedValue(0);
    const panStartY = useSharedValue(0);
    
    const panGesture = Gesture.Pan()
      .onStart(() => {
        panStartX.value = translateX.value;
        panStartY.value = translateY.value;
      })
      .onUpdate((event) => {
        const maxTranslateX = (windowWidth * (scale.value - 1)) / 2;
        const maxTranslateY = (windowHeight * (scale.value - 1)) / 4;
        const minTranslateX = -maxTranslateX;
        const minTranslateY = -maxTranslateY;
    
        translateX.value = clamp(panStartX.value + event.translationX, minTranslateX, maxTranslateX);
        translateY.value = clamp(panStartY.value + event.translationY, minTranslateY, maxTranslateY);
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
    
    
    // Definicja stylu animowanego
    const animatedStyle = useAnimatedStyle(() => ({
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
      ],
    }));

    
    // Przywracamy przycisk resetu
    const resetMap = () => {
      scale.value = withTiming(1, { duration: 300 });
      translateX.value = withTiming(initialTranslateX, { duration: 300 });
      translateY.value = withTiming(initialTranslateY, { duration: 300 });
    };
    

    return (
<GestureHandlerRootView style={[styles.container, style]}>
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
