import { useContext, forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { StyleSheet, View, Dimensions, StyleProp, ViewStyle, TouchableOpacity, Text, ActivityIndicator, Alert, GestureResponderEvent, PixelRatio, Image } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { ThemeContext } from '../app/config/ThemeContext';
import { captureRef } from 'react-native-view-shot';
import countriesData from '../assets/maps/countries.json';
import { Country, CountriesData } from '../.expo/types/country';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Sharing from 'expo-sharing';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';
import logoImage from '../assets/images/logo-tripify-tekstowe2.png';
import * as Progress from 'react-native-progress';
import logoTextImage from '../assets/images/logo-tripify-tekst.png';
import logoTextImageDesaturated from '../assets/images/logo-tripify-tekst2.png';

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
const pixelRatio = PixelRatio.get(); // Pobiera gęstość pikseli urządzenia
const initialTranslateX = 0;
const initialTranslateY = 0;

const InteractiveMap = forwardRef<InteractiveMapRef, InteractiveMapProps>(
  ({ selectedCountries, onCountryPress, style }, ref) => {
    const { isDarkTheme, toggleTheme } = useContext(ThemeContext);
    const theme = useTheme(); // Używanie hooka useTheme
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
          const uri = await captureRef(mapViewRef, { format: 'png', quality: 1 });
          return uri;
        }
        return null;
      },
    }));

    const data: CountriesData = countriesData;

    const getCountryFill = (countryCode: string) => {
      const isVisited = selectedCountries.includes(countryCode);
      return isVisited ? 'rgba(0,174,245,255)' : '#b2b7bf';
    };
    const totalCountries = data.countries.length;
    const visitedCountries = selectedCountries.length;
    const percentageVisited = visitedCountries / totalCountries;
    
    const scale = useSharedValue(1);
    const translateX = useSharedValue(initialTranslateX);
    const translateY = useSharedValue(initialTranslateY);

    const clamp = (value: number, min: number, max: number): number => {
      'worklet';
      return Math.min(Math.max(value, min), max);
    };
    const fullViewRef = useRef<View>(null); // Ref dla całego widoku

    // Referencje do gestów
    const startX = useSharedValue(0);
    const startY = useSharedValue(0);
    const AnimatedSvg = Animated.createAnimatedComponent(Svg);
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
  
    // Styl animowany
    const animatedStyle = useAnimatedStyle(() => ({
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
      ],
    }));
    const topTextAnimatedStyle = useAnimatedStyle(() => {
      const translateY = -100 * (scale.value - 1); // Dostosuj współczynnik według potrzeb
      const opacity = Math.max(1 - Math.pow(scale.value - 1, 1.5), 0);
      return {
        transform: [{ translateY }],
        opacity,
      };
    });


    const getTranslateY = (maxTranslateY: number, maxScale: number, scaleValue: number) => {
      'worklet';
      const progress = Math.min((scaleValue - 1) / (maxScale - 1), 1);
      return maxTranslateY * progress;
    };

    const bottomTextAnimatedStyle = useAnimatedStyle(() => {
      const maxTranslateY = screenHeight * 0.03; // 3% of screen height
      const maxScale = 1.6;
      const translateY = getTranslateY(maxTranslateY, maxScale, scale.value);
      const opacityProgress = Math.min((scale.value - 1) / (maxScale - 1), 1);
      const opacity = Math.max(1 - Math.pow(opacityProgress, 1.2), 0);
      return {
        transform: [{ translateY }],
        opacity,
      };
    });

    const buttonContainerAnimatedStyle = useAnimatedStyle(() => {
      const maxTranslateY = screenHeight * 0.05; // 5% of screen height
      const maxScale = 1.6;
      const translateY = getTranslateY(maxTranslateY, maxScale, scale.value);
      return {
        transform: [{ translateY }],
      };
    });

        // Funkcja resetująca mapę
    const resetMap = () => {
      scale.value = withTiming(1, { duration: 300 });
      translateX.value = withTiming(0, { duration: 300 });
      translateY.value = withTiming(0, { duration: 300 });
    };    
     // Funkcja udostępniania mapy
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
          width: screenWidth * pixelRatio * 6, // Zwiększ szerokość proporcjonalnie do pixelRatio
          height: (screenWidth * pixelRatio * 6) * (16 / 9), // Zachowaj proporcje

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
    
    console.log('Visited Countries:', visitedCountries);
    console.log('Total Countries:', totalCountries);
    console.log('Percentage Visited:', percentageVisited);

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
        <Animated.View style={[styles.topSection, topTextAnimatedStyle]}>
          <Image
            source={isDarkTheme ? logoTextImageDesaturated : logoTextImage}
            style={styles.logoTextImage}
            resizeMode="contain"
          />
        </Animated.View>


        <GestureDetector gesture={Gesture.Simultaneous(pinchGesture, panGesture)}>
          <Animated.View style={styles.container}>
            <View ref={mapViewRef} style={styles.mapContainer}>
                <AnimatedSvg width="100%" height="100%" viewBox="232 0 1700 857" preserveAspectRatio="xMidYMid meet"   style={animatedStyle}>
                  {data.countries.map((country: Country, index: number) => {
                    const countryCode = country.id;
                    if (!countryCode || countryCode.startsWith('UNKNOWN-')) return null;
                    return (
                      <Path
                        key={`${countryCode}-${index}`}
                        d={country.path}
                        fill={getCountryFill(countryCode)}
                        stroke={theme.colors.outline}
                        strokeWidth={0.2}
                        onPress={(event) => handlePathPress(event, countryCode)}  // Używanie handlePathPress
                      />
                    );
                  })}
                </AnimatedSvg>
              </View>
            </Animated.View>
          {/* </Animated.View> */}
        </GestureDetector>

     {/* Dolna sekcja z postępem */}
        <Animated.View style={[styles.bottomSection, bottomTextAnimatedStyle]}>
          <View style={styles.progressBarWrapper}>
            <Progress.Bar
              progress={percentageVisited}
              width={screenWidth * 0.8}
              color={theme.colors.primary}
              unfilledColor={theme.colors.surfaceVariant}
              borderWidth={0}
              height={20}
              borderRadius={10}
            />
            <View style={styles.progressTextLeft}>
              <Text style={[styles.progressText, { color: theme.colors.onSurface }]}>
                {(percentageVisited * 100).toFixed(1)}%
              </Text>
            </View>
            <View style={styles.progressTextRight}>
              <Text style={[styles.progressText, { color: theme.colors.onSurface }]}>
                {visitedCountries}/{totalCountries}
              </Text>

            </View>
          </View>
        </Animated.View>

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
  <Image
    source={logoImage}
    style={styles.logoImage}
    resizeMode="contain"
  />
  </View>

  {/* Mapa */}
  <View style={styles.mapContainerPhoto}>
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
    <View style={styles.progressBarWrapper}>
      <Progress.Bar
        progress={percentageVisited}
        width={screenWidth * 0.8}
        color={theme.colors.primary}
        unfilledColor={theme.colors.surfaceVariant}
        borderWidth={0}
        height={20}
        borderRadius={10}
        />
        <View style={styles.progressTextLeft}>
          <Text style={[styles.progressText, { color: theme.colors.onSurface }]}>
            {(percentageVisited * 100).toFixed(1)}%
          </Text>
        </View>
        <View style={styles.progressTextRight}>
          <Text style={[styles.progressText, { color: theme.colors.onSurface }]}>
            {visitedCountries}/{totalCountries}
          </Text>

        </View>
          </View>
  </View>
</View>



        {/* Kontener dla przycisków */}
        <Animated.View style={[styles.buttonContainer, buttonContainerAnimatedStyle]}>
          {/* Przycisk Reset */}
          <TouchableOpacity
            style={[styles.resetButton, { backgroundColor: theme.colors.primary }]}
            onPress={resetMap}
            activeOpacity={0.7}
          >
            <Feather
              name="code"
              size={ICON_SIZE}
              style={styles.resetIcon}
              color={theme.colors.onPrimary}
            />
          </TouchableOpacity>

          {/* Przycisk Udostępniania */}
          <TouchableOpacity
            style={[styles.shareButton, { backgroundColor: theme.colors.primary }]}
            onPress={shareMap}
            activeOpacity={0.7}
            disabled={isSharing}
          >
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
              style={[styles.toggleButton, { backgroundColor: theme.colors.primary }]}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name={isDarkTheme ? 'dark-mode' : 'light-mode'}
                size={ICON_SIZE}
                color={theme.colors.onPrimary}
              />
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
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
    padding: 2, // Marginesy wokół całego widoku
  },
  topSection: {
    top:10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomSection: {
    // flex: 1, // Proporcja dolnej sekcji
    justifyContent: 'center',
    alignItems: 'center',
    bottom: '3%'
  },
  logoTextImage: {
    width: '16%', // Dostosuj szerokość według potrzeb
    height: undefined,
    aspectRatio: 3, // Ustaw rzeczywisty współczynnik proporcji obrazu
  },  
  progressBarWrapper: {
    width: screenWidth * 0.8,
    height: 20,
    position: 'relative',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: 10,
  },
  
  progressTextLeft: {
    position: 'absolute',
    left: 10,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  
  progressTextRight: {
    position: 'absolute',
    right: 10,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  
  progressText: {
    // color: theme.colors.onPrimary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  topSectionPhoto: {
    position: 'absolute',
    top: '4%', // Możesz dostosować procent do swoich potrzeb
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
    // marginBottom: -65,
    // marginTop: 50,
  },
  percentageText: {
    fontSize: screenWidth * 0.04, // 4% szerokości ekranu
    textAlign: 'center',
    marginTop: 10,
  },
  logoImage: {
    width: '20%', // Możesz dostosować szerokość według potrzeb
    height: undefined,
    aspectRatio: 2, // Ustaw rzeczywisty współczynnik proporcji obrazu
  },
  bottomSectionPhoto: {
    // flex: 1, // Proporcja dolnej sekcji
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    bottom: '3%', // Możesz dostosować procent do swoich potrzeb
    left: 0,
    right: 0,
    // top: -5%
  },
  mapContainerPhoto: {
    flex: 1,
    marginTop: '10%', // Przesunięcie mapy o 10% w dół
    // marginBottom: '5%',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
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
    bottom: '8%',
    left: 0,
  right: 0,
  flexDirection: 'row',
  justifyContent: 'center',
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