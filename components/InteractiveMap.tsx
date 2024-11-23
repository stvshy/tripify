// components/InteractiveMap.tsx
import React, { useContext, forwardRef, useImperativeHandle, useRef, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Dimensions,
  StyleProp,
  ViewStyle,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Alert,
  GestureResponderEvent,
  PixelRatio,
  Image,
  TouchableWithoutFeedback,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { ThemeContext } from '../app/config/ThemeContext';
import { captureRef } from 'react-native-view-shot';
import rawCountriesData from '../assets/maps/countries.json';
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
import CountryFlag from 'react-native-country-flag';

const windowWidth = Dimensions.get('window').width;
const windowHeight = Dimensions.get('window').height;
const BUTTON_SIZE = Math.min(windowWidth, windowHeight) * 0.08;
const ICON_SIZE = BUTTON_SIZE * 0.5;
const screenWidth = windowWidth;
const screenHeight = windowHeight;
const pixelRatio = PixelRatio.get();
const initialTranslateX = 0;
const initialTranslateY = 0;

// Przetwarzanie danych, aby usunąć duplikaty i upewnić się, że 'cca2' istnieje
const uniqueCountries: Country[] = [];
const countryMap: { [key: string]: Country } = {};

rawCountriesData.countries.forEach((rawCountry: { id: string; name: string; class: string | null; path: string }) => {
  const cca2 = rawCountry.id.length === 2 ? rawCountry.id.toUpperCase() : '';

  const countryWithCca2: Country = {
    ...rawCountry,
    cca2
  };

  if (!countryMap[rawCountry.id]) {
    countryMap[rawCountry.id] = countryWithCca2;
  } else {
    countryMap[rawCountry.id].path += ' ' + rawCountry.path;
  }
});

uniqueCountries.push(...Object.values(countryMap));
const data: CountriesData = { countries: uniqueCountries };

export interface InteractiveMapRef {
  capture: () => Promise<string | null>;
}

interface TooltipPosition {
  x: number;
  y: number;
  country: Country;
  position: 'top' | 'bottom';
}

interface InteractiveMapProps {
  selectedCountries: string[];
  totalCountries: number;
  onCountryPress: (countryCode: string) => void;
  style?: StyleProp<ViewStyle>;
}

const InteractiveMap = forwardRef<InteractiveMapRef, InteractiveMapProps>(
  ({ selectedCountries, totalCountries, onCountryPress, style }, ref) => {
    const { isDarkTheme, toggleTheme } = useContext(ThemeContext);
    const theme = useTheme();
    const mapViewRef = useRef<View>(null);
    const baseMapRef = useRef<View>(null);
    const [isSharing, setIsSharing] = useState(false);
    const [tooltip, setTooltip] = useState<TooltipPosition | null>(null);
    const scaleValue = useSharedValue(1);
    const scale = useSharedValue(1);
    const translateX = useSharedValue(initialTranslateX);
    const translateY = useSharedValue(initialTranslateY);

    const activeTouches = useSharedValue<{ id: number; x: number; y: number }[]>([]);
    const initialDistance = useSharedValue<number | null>(null);
    const initialFocalX = useSharedValue<number>(0);
    const initialFocalY = useSharedValue<number>(0);
    const baseScale = useSharedValue<number>(1);
    const baseTranslateX = useSharedValue<number>(0);
    const baseTranslateY = useSharedValue<number>(0);

    const animatedToggleStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scaleValue.value }],
    }));

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

    const getCountryFill = (countryCode: string) => {
      const isVisited = selectedCountries.includes(countryCode);
      return isVisited ? 'rgba(0,174,245,255)' : '#b2b7bf';
    };

    const visitedCountries = selectedCountries.length;
    const percentageVisited = totalCountries > 0 ? visitedCountries / totalCountries : 0;

    const clamp = (value: number, min: number, max: number): number => {
      'worklet';
      return Math.min(Math.max(value, min), max);
    };

    const fullViewRef = useRef<View>(null);

    const startX = useSharedValue(0);
    const startY = useSharedValue(0);
    const AnimatedSvg = Animated.createAnimatedComponent(Svg);

    const SCALE_THRESHOLD = 0.01;
    const TRANSLATE_THRESHOLD = 0.5;
    
    const pinchGesture = Gesture.Pinch()
      .onBegin((event) => {
        initialDistance.value = event.scale;
        baseScale.value = scale.value;
        initialFocalX.value = event.focalX;
        initialFocalY.value = event.focalY;
        baseTranslateX.value = translateX.value;
        baseTranslateY.value = translateY.value;
      })
      .onUpdate((event) => {
        const scaleFactor = event.scale;
        const newScale = clamp(baseScale.value * scaleFactor, 1, 6);
        
        if (Math.abs(newScale - scale.value) > SCALE_THRESHOLD) {
          scale.value = newScale;
        }
    
        const newTranslateX = clamp(
          baseTranslateX.value - (initialFocalX.value - windowWidth / 2) * (scaleFactor - 1),
          -windowWidth * (newScale - 1) / 2,
          windowWidth * (newScale - 1) / 2
        );
        const newTranslateY = clamp(
          baseTranslateY.value - (initialFocalY.value - windowHeight / 2) * (scaleFactor - 1),
          -windowHeight * (newScale - 1) / 4,
          windowHeight * (newScale - 1) / 4
        );
    
        if (Math.abs(newTranslateX - translateX.value) > TRANSLATE_THRESHOLD) {
          translateX.value = newTranslateX;
        }
        if (Math.abs(newTranslateY - translateY.value) > TRANSLATE_THRESHOLD) {
          translateY.value = newTranslateY;
        }
      })
      .onEnd(() => {
        // Opcjonalnie: Możesz tutaj dodać logikę końcową
      });
    

    const panGesture = Gesture.Pan()
      .maxPointers(1)
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

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
      ],
    }));

    const topTextAnimatedStyle = useAnimatedStyle(() => {
      const translateY = -100 * (scale.value - 1);
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
      const maxTranslateY = screenHeight * 0.03;
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
      const maxTranslateY = screenHeight * 0.05;
      const maxScale = 1.6;
      const translateY = getTranslateY(maxTranslateY, maxScale, scale.value);
      return {
        transform: [{ translateY }],
      };
    });

    // Definicja animowanego stylu dla Tooltipa
    const tooltipAnimatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: withTiming(1 / scale.value, { duration: 100 }) }],
      // Opcjonalnie, możesz dodać inne animacje, np. opacity
    }));

    const resetMap = useCallback(() => {
      scale.value = withTiming(1, { duration: 300 });
      translateX.value = withTiming(0, { duration: 300 });
      translateY.value = withTiming(0, { duration: 300 });
      setTooltip(null);
    }, [scale, translateX, translateY]);

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
          width: screenWidth * pixelRatio * 6,
          height: (screenWidth * pixelRatio * 6) * (16 / 9),
        });

        if (uri) {
          await Sharing.shareAsync(uri).catch((error) => {
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

    // Zaktualizowana funkcja handlePathPress
    const handlePathPress = useCallback((event: GestureResponderEvent, countryCode: string) => {
      const { locationX, locationY } = event.nativeEvent;
      
      // Obliczamy rzeczywistą pozycję względem aktualnej skali i przesunięcia
      const adjustedX = (locationX - translateX.value) / scale.value;
      const adjustedY = (locationY - translateY.value) / scale.value;

      const country = data.countries.find(c => c.id === countryCode);

      if (country) {
        let position: 'top' | 'bottom' = 'top';
        
        // Sprawdzamy czy tooltip powinien być wyświetlany nad czy pod punktem
        // uwzględniając aktualną skalę
        const scaledOffset = 60 / scale.value;
        if (adjustedY - scaledOffset < 0) {
          position = 'bottom';
        }

        setTooltip({
          x: adjustedX,
          y: adjustedY,
          country,
          position
        });
      }

      onCountryPress(countryCode);
    }, [scale, translateX, translateY, onCountryPress]);


    return (
      <GestureHandlerRootView style={[styles.container, style]}>
        <TouchableWithoutFeedback onPress={() => setTooltip(null)}>
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
              <Animated.View style={[styles.container, animatedStyle]}>
                <View ref={mapViewRef} style={styles.mapContainer}>
                  <AnimatedSvg
                    width="100%"
                    height="100%"
                    viewBox="232 0 1700 857"
                    preserveAspectRatio="xMidYMid meet"
                    style={styles.mapContainer}
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
                          strokeWidth={0.2}
                          onPress={(event) => handlePathPress(event, countryCode)}
                        />
                      );
                    })}
                  </AnimatedSvg>

                  {/* Renderowanie Tooltipa wewnątrz kontenera mapy */}
                  {tooltip && (
           <Animated.View
           style={[
             styles.tooltip,
             tooltipAnimatedStyle,
             {
               position: 'absolute',
               left: tooltip.x * scale.value + translateX.value - 75,
               top: tooltip.y * scale.value + translateY.value - 
                 (tooltip.position === 'top' ? 
                   // Dynamiczny offset dla górnej pozycji
                   (26 + (20 * (1 / scale.value))) : 
                   // Dynamiczny offset dla dolnej pozycji
                   (15 + (10 * (1 / scale.value)))),
               width: 150,
               transform: [
                 { scale: 1 / scale.value },
               ],
             },
           ]}
         >
            {tooltip.position === 'top' && (
              <View
                style={[
                  styles.arrowBottom,
                  {
                    left: 75 - 5,
                  },
                ]}
              />
            )}
            {tooltip.position === 'bottom' && (
              <View
                style={[
                  styles.arrowTop,
                  {
                    left: 75 - 5,
                  },
                ]}
              />
            )}
            <View style={styles.tooltipContent}>
              <CountryFlag isoCode={tooltip.country.cca2} size={25} />
              <Text style={styles.tooltipText}>{tooltip.country.name}</Text>
            </View>
          </Animated.View>
        )}

                </View>
              </Animated.View>
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
          </View>
        </TouchableWithoutFeedback>
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
    padding: 2,
  },
  topSection: {
    top: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomSection: {
    justifyContent: 'center',
    alignItems: 'center',
    bottom: '2.5%',
  },
  logoTextImage: {
    width: '16%',
    height: undefined,
    aspectRatio: 3,
  },
  progressBarWrapper: {
    width: screenWidth * 0.8,
    height: 20,
    position: 'relative',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: 10,
  },
  tooltip: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 10,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
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
    fontSize: 12,
    fontWeight: 'bold',
  },
  topSectionPhoto: {
    position: 'absolute',
    top: '4%',
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  percentageText: {
    fontSize: screenWidth * 0.04,
    textAlign: 'center',
    marginTop: 10,
  },
  logoImage: {
    width: '20%',
    height: undefined,
    aspectRatio: 2,
  },
  bottomSectionPhoto: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    bottom: '3%',
    left: 0,
    right: 0,
  },
  mapContainerPhoto: {
    flex: 1,
    marginTop: '10%',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  titleText: {
    fontSize: screenWidth * 0.05,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  titleTextLarge: {
    fontSize: screenWidth * 0.05,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  infoTextLarge: {
    fontSize: screenWidth * 0.04,
    textAlign: 'center',
  },
  infoText: {
    fontSize: screenWidth * 0.04,
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
    top: -1000,
    left: -1000,
    width: screenWidth,
    height: screenWidth * (16 / 9),
    pointerEvents: 'none',
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
    marginLeft: 10,
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
    marginLeft: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  toggleButtonContainer: {
    // Możesz dodać dodatkowe style, jeśli potrzebujesz
  },
  tooltipText: {
    color: '#fff',
    marginLeft: 10,
  },
  tooltipContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  arrowTop: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderBottomWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'rgba(0, 0, 0, 0.8)',
    top: -10,
    left: 75 - 5,
  },
  arrowBottom: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: 'rgba(0, 0, 0, 0.8)',
    bottom: -10,
    left: 75 - 5,
  },
  toggleButton: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
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