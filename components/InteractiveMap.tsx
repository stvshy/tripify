import React, { useContext, forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { StyleSheet, View, Dimensions, StyleProp, ViewStyle, TouchableOpacity, Text, ActivityIndicator, Alert, GestureResponderEvent } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { ThemeContext } from '../app/config/ThemeContext';
import { captureRef } from 'react-native-view-shot';
import countriesData from '../assets/maps/countries.json';
import { Country, CountriesData } from '../.expo/types/country';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import ResetButton from './ResetIcon';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
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
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
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
// Zmienne używane w pinch-to-zoom
const activeTouches = useSharedValue<{ id: number; x: number; y: number }[]>([]);
const initialDistance = useSharedValue<number | null>(null);
const initialFocalX = useSharedValue<number>(0);
const initialFocalY = useSharedValue<number>(0);
const baseScale = useSharedValue<number>(1);
const baseTranslateX = useSharedValue<number>(0);
const baseTranslateY = useSharedValue<number>(0);

// Funkcje pomocnicze
const calculateDistance = (p1: { x: number; y: number }, p2: { x: number; y: number }): number => {
  'worklet';
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.hypot(dx, dy);
};

const calculateMidpoint = (p1: { x: number; y: number }, p2: { x: number; y: number }): { x: number; y: number } => {
  'worklet';
  return {
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2,
  };
};

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
    const fullViewRef = useRef<View>(null); // Ref dla całego widoku

    // Referencje do gestów
    const panRef = useRef(null);
    const pinchRef = useRef(null);
    const startScale = useSharedValue(1);
    const startX = useSharedValue(0);
    const startY = useSharedValue(0);
    
    const pinchGesture = Gesture.Pan()
    .onTouchesDown((event) => {
      activeTouches.value = event.allTouches.map((touch) => ({
        id: touch.id,
        x: touch.x,
        y: touch.y,
      }));
  
      if (activeTouches.value.length >= 2) {
        const [touch1, touch2] = activeTouches.value;
        initialDistance.value = calculateDistance(touch1, touch2);
        const midpoint = calculateMidpoint(touch1, touch2);
        initialFocalX.value = midpoint.x;
        initialFocalY.value = midpoint.y;
        baseScale.value = scale.value;
        baseTranslateX.value = translateX.value;
        baseTranslateY.value = translateY.value;
      }
    })
    .onTouchesMove((event) => {
      activeTouches.value = event.allTouches.map((touch) => ({
        id: touch.id,
        x: touch.x,
        y: touch.y,
      }));
  
      if (activeTouches.value.length >= 2) {
        const [touch1, touch2] = activeTouches.value;
        const currentDistance = calculateDistance(touch1, touch2);
        const scaleFactor = currentDistance / (initialDistance.value || 1);
        const newScale = clamp(baseScale.value * scaleFactor, 1, 6);
        scale.value = newScale;
  
        const currentMidpoint = calculateMidpoint(touch1, touch2);
  
        translateX.value = clamp(
          baseTranslateX.value - (initialFocalX.value - windowWidth / 2) * (scaleFactor - 1),
          -windowWidth * (scale.value - 1) / 2,
          windowWidth * (scale.value - 1) / 2
        );
        translateY.value = clamp(
          baseTranslateY.value - (initialFocalY.value - windowHeight / 2) * (scaleFactor - 1),
          -windowHeight * (scale.value - 1) / 4,
          windowHeight * (scale.value - 1) / 4
        );
      }
    })
    .onTouchesUp((event) => {
      activeTouches.value = event.allTouches.map((touch) => ({
        id: touch.id,
        x: touch.x,
        y: touch.y,
      }));
  
      if (activeTouches.value.length >= 2) {
        const [touch1, touch2] = activeTouches.value;
        initialDistance.value = calculateDistance(touch1, touch2);
        const midpoint = calculateMidpoint(touch1, touch2);
        initialFocalX.value = midpoint.x;
        initialFocalY.value = midpoint.y;
        baseScale.value = scale.value;
        baseTranslateX.value = translateX.value;
        baseTranslateY.value = translateY.value;
      } else {
        initialDistance.value = null;
      }
    });
  
  const panGesture = Gesture.Pan()
    .maxPointers(1) // Ograniczamy do jednego palca
    .onStart(() => {
      startX.value = translateX.value;
      startY.value = translateY.value;
    })
    .onUpdate((event) => {
      const maxTranslateX = (windowWidth * (scale.value - 1)) / 2;
      const maxTranslateY = (windowHeight * (scale.value - 1)) / 4;
  
      translateX.value = clamp(startX.value + event.translationX, -maxTranslateX, maxTranslateX);
      translateY.value = clamp(startY.value + event.translationY, -maxTranslateY, maxTranslateY);
    });
  
    const tapGesture = Gesture.Tap()
    .onEnd((event) => {
      if (event.numberOfPointers === 1) {
        const { x, y } = event;
        // Wywołanie przekazanego przez props 'onCountryPress'
        onCountryPress('some_country_code'); // Przekaż odpowiedni kod kraju
      }
    });
  
  
    // const handlePathPress = (countryCode: string) => {
    //   if (scale.value === 1 && Math.abs(translateX.value) < 10 && Math.abs(translateY.value) < 10) {
    //     onCountryPress(countryCode);
    //   }
    // };
    
  
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
    // Funkcja do przechwytywania całego widoku
    const shareMap = async () => {
      try {
        setIsSharing(true);
    
        const isAvailable = await Sharing.isAvailableAsync();
        if (!isAvailable) {
          Alert.alert('Błąd', 'Udostępnianie nie jest dostępne na tym urządzeniu');
          setIsSharing(false);
          return;
        }
    
        const uri = await captureRef(baseMapRef, {
          format: 'png',
          quality: 1,
          result: 'tmpfile',
          width: screenWidth * 8,
          height: (screenWidth * 8 / 9) * 16,
        });
    
        if (uri) {
          await Sharing.shareAsync(uri).catch((error) => {
            // Ignorujemy błąd związany z zamknięciem okna udostępniania
            console.log('Udostępnianie anulowane przez użytkownika:', error);
          });
        } else {
          throw new Error('Nie udało się przechwycić widoku. URI jest null.');
        }
      } catch (error) {
        console.error('Błąd podczas udostępniania mapy:', error);
        if (!String(error).includes('The 2nd argument cannot be cast')) {
          Alert.alert('Błąd', 'Wystąpił problem podczas udostępniania mapy');
        }
      } finally {
        setIsSharing(false);
      }
    };
    
    
    const convertToSvgCoordinates = (x: number, y: number): { x: number; y: number } => {
      'worklet';
      const scaledX = (x - translateX.value) / scale.value;
      const scaledY = (y - translateY.value) / scale.value;
      return { x: scaledX, y: scaledY };
    };
    
    const handlePathPress = (event: GestureResponderEvent, countryCode: string) => {
      const { locationX, locationY } = event.nativeEvent;
    
      // Przekonwertuj współrzędne dotyku na współrzędne SVG
      const svgCoordinates = convertToSvgCoordinates(locationX, locationY);
    
      console.log(`Kliknięto w SVG: ${svgCoordinates.x}, ${svgCoordinates.y}`);
    
      // Sprawdź, czy kliknięcie mieści się w granicach kraju (to już jest wbudowane w onPress)
      onCountryPress(countryCode);
    };
    
    

    return (
      <GestureHandlerRootView style={[styles.container, style]}>
      {/* Ref dla całego widoku */}
      <View ref={fullViewRef} style={[styles.fullViewContainer, { backgroundColor: theme.colors.background }]}>
        {/* Górna sekcja */}
        <View style={styles.topSection}>
          <Text style={[styles.titleText, { color: theme.colors.onBackground }]}>
            Twoja Interaktywna Mapa
          </Text>
        </View>
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
                        onPress={(event) => handlePathPress(event, countryCode)}  // Używanie handlePathPress
                      />
                    );
                  })}
                </Svg>
              </View>
            </Animated.View>
          </Animated.View>
        </GestureDetector>
    {/* Dolna sekcja */}
    <View style={styles.bottomSection}>
            <Text style={[styles.infoText, { color: theme.colors.onBackground }]}>
              Udostępnij swoją mapę i pokaż, gdzie byłeś!
            </Text>
          </View>
        </View>
        {/* Ukryta bazowa mapa */}
        <View
  ref={baseMapRef}
  collapsable={false}
  style={[
    styles.baseMapContainer,
    {
      backgroundColor: isDarkTheme ? theme.colors.surface : theme.colors.background,
    },
  ]}
>
  {/* Górna sekcja z napisem */}
  <View style={styles.topSectionPhoto}>
    <Text style={[styles.titleTextLarge, { color: theme.colors.onBackground }]}>
      Twoja Interaktywna Mapa
    </Text>
  </View>

  {/* Mapa */}
  <View style={styles.mapContainer}>
    <Svg
      width="100%"
      height="100%"
      viewBox="232 0 1700 857"
      preserveAspectRatio="xMidYMid meet"
    >
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

  {/* Dolna sekcja z napisem */}
  <View style={styles.bottomSectionPhoto}>
    <Text style={[styles.infoTextLarge, { color: theme.colors.onBackground }]}>
      Udostępnij swoją mapę i pokaż, gdzie byłeś!
    </Text>
  </View>
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
  fullViewContainer: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 20, // Marginesy wokół całego widoku
  },
  topSection: {
    // flex: 1, // Proporcja górnej sekcji
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomSection: {
    // flex: 1, // Proporcja dolnej sekcji
    justifyContent: 'center',
    alignItems: 'center',
  },
  topSectionPhoto: {
    position: 'absolute',
    top: '5%', // Możesz dostosować procent do swoich potrzeb
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
    // marginBottom: -65,
    // marginTop: 50,
  },
  bottomSectionPhoto: {
    // flex: 1, // Proporcja dolnej sekcji
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    bottom: '5%', // Możesz dostosować procent do swoich potrzeb
    left: 0,
    right: 0,
  },
  titleText: {
    fontSize: screenWidth * 0.05, // 5% szerokości ekranu
    fontWeight: 'bold',
    textAlign: 'center',
  },
  titleTextLarge: {
    fontSize: screenWidth * 0.05, // 5% szerokości ekranu
    fontWeight: 'bold',
    textAlign: 'center',
  },
  infoTextLarge: {
    fontSize: screenWidth * 0.04, // 4% szerokości ekranu
    textAlign: 'center',
  },
  infoText: {
    fontSize: screenWidth * 0.04, // 4% szerokości ekranu
    textAlign: 'center',
  },

  mapContainer: {

    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
   baseMapContainer: {
    position: 'absolute',
    top: -1000, // Ukrycie poza ekranem
    left: -1000,
    width: screenWidth, // Dynamiczna szerokość
    height: screenWidth * (16 / 9), // Dynamiczna wysokość dla proporcji 9:16
    pointerEvents: 'none', // Zapobiega przechwytywaniu zdarzeń dotykowych
    // opacity: 0, // Ukrycie widoku
    // justifyContent: 'space-between', // Rozmieszczenie elementów
    // paddingTop: screenWidth * 0.1, // 10% szerokości ekranu dla górnego napisu
    // paddingBottom: screenWidth * 0.1, // 15% szerokości ekranu dla dolnego napisu
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