import React, {
  useContext,
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  useCallback,
  useMemo,
  useEffect,
} from 'react';
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
  LayoutChangeEvent,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { ThemeContext } from '../app/config/ThemeContext';
import { captureRef } from 'react-native-view-shot';
import rawCountriesData from '../assets/maps/countries.json';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Sharing from 'expo-sharing';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { useTheme, MD3Theme } from 'react-native-paper';
import logoImage from '../assets/images/logo-tripify-tekstowe2.png';
import * as Progress from 'react-native-progress';
import logoTextImage from '../assets/images/logo-tripify-tekst.png';
import logoTextImageDesaturated from '../assets/images/logo-tripify-tekst2.png';
import CountryFlag from 'react-native-country-flag';
import Popover, { Rect } from 'react-native-popover-view';
// Dodajemy hook do nawigacji
import { useRouter } from 'expo-router';

export interface Country {
  id: string;
  name: string;
  class: string | null;
  path: string;
  cca2: string;
}

export interface CountriesData {
  countries: Country[];
}

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


const { countries, countryCentroids } = (() => {
  const countryMap: { [key: string]: Country } = {};
  rawCountriesData.countries.forEach((rawCountry: { id: string; name: string; class: string | null; path: string }) => {
    const cca2 = rawCountry.id.length === 2 ? rawCountry.id.toUpperCase() : '';
    const countryWithCca2: Country = { ...rawCountry, cca2 };
    if (!countryMap[rawCountry.id]) {
      countryMap[rawCountry.id] = countryWithCca2;
    } else {
      countryMap[rawCountry.id].path += ' ' + rawCountry.path;
    }
  });
  const uniqueCountries = Object.values(countryMap);
  const centroids: { [key: string]: { x: number; y: number } } = {};
  uniqueCountries.forEach((country) => {
    const pts = extractPoints(country.path);
    if (pts.length >= 3) {
      centroids[country.id] = computeCentroid(pts);
    }
  });
  return { countries: uniqueCountries, countryCentroids: centroids };
})();


const data: CountriesData = { countries: uniqueCountries };

/**
 * Funkcje służące do obliczania centroidu kraju na podstawie jego ścieżki SVG.
 */
function extractPoints(d: string): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  const re = /[ML]([^MLZ]+)/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(d)) !== null) {
    const coords = match[1].trim().split(/[\s,]+/);
    for (let i = 0; i < coords.length; i += 2) {
      const x = parseFloat(coords[i]);
      const y = parseFloat(coords[i + 1]);
      if (!isNaN(x) && !isNaN(y)) {
        points.push({ x, y });
      }
    }
  }
  return points;
}

function computeArea(points: { x: number; y: number }[]): number {
  let area = 0;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i].x * points[j].y - points[j].x * points[i].y;
  }
  return Math.abs(area / 2);
}

function computeCentroid(points: { x: number; y: number }[]): { x: number; y: number } {
  let area = 0;
  let cx = 0;
  let cy = 0;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const cross = points[i].x * points[j].y - points[j].x * points[i].y;
    area += cross;
    cx += (points[i].x + points[j].x) * cross;
    cy += (points[i].y + points[j].y) * cross;
  }
  area = area / 2;
  cx = cx / (6 * area);
  cy = cy / (6 * area);
  return { x: cx, y: cy };
}



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
    const router = useRouter(); // Hook do nawigacji
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
    const [containerOffset, setContainerOffset] = useState({ x: 0, y: 0 });
    const animatedToggleStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scaleValue.value }],
    }));

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

    const [preGeneratedImage, setPreGeneratedImage] = useState<string | null>(null);

     useEffect(() => {
      const generateImage = async () => {
        try {
          const uri = await captureRef(baseMapRef, {
            format: 'jpg', // używamy formatu jpg dla najlepszej jakości
            quality: 1,
            result: 'tmpfile',
            width: screenWidth * pixelRatio * 6,
            height: (screenWidth * pixelRatio * 6) * (16 / 9),
          });
          setPreGeneratedImage(uri);
        } catch (error) {
          console.error('Błąd przy pre-generowaniu obrazu:', error);
        }
      };

      generateImage();
    }, [baseMapRef]);

    const applyTransparency = (hexColor: string, transparency: number) => {
      const hex = hexColor.replace('#', '');
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${transparency})`;
    };

    const getCountryFill = (countryCode: string) => {
      const isVisited = selectedCountries.includes(countryCode);
      const isHighlighted = tooltip && tooltip.country.id === countryCode;
      if (isHighlighted) {
        return applyTransparency(theme.colors.primary, 0.75);
      }
      return isVisited ? 'rgba(0,174,245,255)' : '#b2b7bf';
    };

    const isCountryHighlighted = (countryCode: string): boolean => {
      return Boolean(tooltip && tooltip.country.id === countryCode);
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
    const RESOLUTION_FACTOR = 6;
    const baseWidth = screenWidth;
    const baseHeight = baseWidth * (857 / 1700);
    const highResWidth = baseWidth * RESOLUTION_FACTOR;
    const highResHeight = baseHeight * RESOLUTION_FACTOR;

    const SCALE_THRESHOLD = 0.01;
    const TRANSLATE_THRESHOLD = 0.5;

    const pinchGesture = Gesture.Pinch()
      .onBegin((event) => {
        runOnJS(setTooltip)(null); // Ukryj tooltip przy rozpoczęciu gestu
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
      .onEnd(() => {});

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
      return { transform: [{ translateY }], opacity };
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
      return { transform: [{ translateY }], opacity };
    });

    const buttonContainerAnimatedStyle = useAnimatedStyle(() => {
      const maxTranslateY = screenHeight * 0.05;
      const maxScale = 1.6;
      const translateY = getTranslateY(maxTranslateY, maxScale, scale.value);
      return { transform: [{ translateY }] };
    });

    const tooltipAnimatedStyle = useAnimatedStyle(() => {
      try {
        return { transform: [{ scale: withTiming(1 / scale.value, { duration: 100 }) }] };
      } catch (error) {
        console.error("Tooltip animation error:", error);
        return {};
      }
    });

    // Obsługa kliknięcia w kraj – zatrzymujemy propagację zdarzenia, ustawiamy tooltip
    // oraz wywołujemy callback przekazany przez rodzica.
    const handlePathPress = useCallback(
      (event: GestureResponderEvent, countryCode: string) => {
        event.stopPropagation && event.stopPropagation();
        const country = countries.find(c => c.id === countryCode);
        if (!country) return;
    
        const { pageX, pageY } = event.nativeEvent;
        const localX = pageX - containerOffset.x;
        const localY = pageY - containerOffset.y;
    
        setTooltip({
          x: localX,
          y: localY,
          country,
          position: localY > 100 ? 'top' : 'bottom',
        });
        // Przekazujemy kod kraju do rodzica – logika wyboru jest obsługiwana w App.tsx.
        onCountryPress(countryCode);
      },
      [containerOffset, onCountryPress]
    );
    interface CountryPathProps {
      country: Country;
      index: number;
      getCountryFill: (countryCode: string) => string;
      isCountryHighlighted: (countryCode: string) => boolean;
      theme: MD3Theme;
      handlePathPress: (event: GestureResponderEvent, countryCode: string) => void;
    }
    
    const CountryPath = React.memo(
      ({ country, index, getCountryFill, isCountryHighlighted, theme, handlePathPress }: CountryPathProps) => {
        const countryCode = country.id;
        if (!countryCode || countryCode.startsWith('UNKNOWN-')) return null;
        return (
          <Path
            key={`${countryCode}-${index}`}
            d={country.path}
            fill={getCountryFill(countryCode)}
            stroke={isCountryHighlighted(countryCode) ? theme.colors.primary : theme.colors.outline}
            strokeWidth={isCountryHighlighted(countryCode) ? 0.5 : 0.2}
            onPress={(event) => handlePathPress(event, countryCode)}
          />
        );
      }
    );
    
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
        // Używamy pre-generowanego obrazu, jeśli jest dostępny
        let uri = preGeneratedImage;
        if (!uri) {
          uri = await captureRef(baseMapRef, {
            format: 'jpg', // format jpg dla lepszej jakości
            quality: 1,
            result: 'tmpfile',
            width: screenWidth * pixelRatio * 6,
            height: (screenWidth * pixelRatio * 6) * (16 / 9),
          });
        }
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
    

    return (
      <GestureHandlerRootView>
        <View
          ref={fullViewRef}
          style={[styles.fullViewContainer, { backgroundColor: theme.colors.background }]}
          onLayout={(e: LayoutChangeEvent) => {
            const { x, y } = e.nativeEvent.layout;
            setContainerOffset({ x, y });
          }}
        >
          {/* Górna sekcja z logo */}
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
                <Animated.View style={{ transform: [{ scale: 1 / RESOLUTION_FACTOR }] }} pointerEvents="auto">
                  <AnimatedSvg
                    width={highResWidth}
                    height={highResHeight}
                    viewBox="232 0 1700 857"
                    preserveAspectRatio="xMidYMid meet"
                    style={styles.mapContainer}
                  >
                    {countries.map((country: Country, index: number) => (
                      <CountryPath
                        key={`${country.id}-${index}`}
                        country={country}
                        index={index}
                        getCountryFill={getCountryFill}
                        isCountryHighlighted={isCountryHighlighted}
                        theme={theme}
                        handlePathPress={handlePathPress}
                      />
                    ))}
                  </AnimatedSvg>
                </Animated.View>
                {/* Tooltip z informacjami o kraju oraz przyciskiem View */}
                {tooltip && (
                  <Popover
                    isVisible={tooltip !== null}
                    from={new Rect(tooltip.x, tooltip.y, 1, 1)}
                    onRequestClose={() => setTooltip(null)}
                    popoverStyle={styles.popoverContainer}
                    arrowSize={{ width: 11.2, height: 11 }}
                    backgroundStyle={{ backgroundColor: 'transparent' }}
                  >
                    <View style={styles.popoverContent}>
                      <CountryFlag
                        isoCode={tooltip.country.cca2}
                        size={22}
                        style={{ borderRadius: 5, overflow: 'hidden' }}
                      />
                      <Text style={styles.popoverText}>{tooltip.country.name}</Text>
                      {/* Okrągły przycisk "View" */}
                      <TouchableOpacity
                        style={[styles.viewButton]}
                        onPress={() => {
                          // Przechodzimy do profilu kraju, np. /country/[cid]
                          router.push(`/country/${tooltip.country.id}`);
                          // Opcjonalnie zamykamy popover
                          setTooltip(null);
                        }}
                      >
                        <Text style={[styles.viewButtonText]}>View</Text>
                      </TouchableOpacity>
                    </View>
                  </Popover>
                )}
              </View>
            </Animated.View>
          </GestureDetector>
          {/* Dolna sekcja z paskiem postępu */}
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
          {/* Ukryta bazowa mapa do udostępniania */}
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
            <View style={styles.topSectionPhoto}>
              <Image source={logoImage} style={styles.logoImage} resizeMode="contain" />
            </View>
            <View style={styles.mapContainerPhoto}>
              <Svg
                width="100%"
                height="100%"
                viewBox="232 0 1700 857"
                preserveAspectRatio="xMidYMid meet"
              >
                {countries.map((country: Country, index: number) => (
                  <CountryPath
                    key={`${country.id}-${index}`}
                    country={country}
                    index={index}
                    getCountryFill={getCountryFill}
                    isCountryHighlighted={isCountryHighlighted}
                    theme={theme}
                    handlePathPress={handlePathPress}
                  />
                ))}
              </Svg>
            </View>
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
          {/* Kontener przycisków */}
          <Animated.View style={[styles.buttonContainer, buttonContainerAnimatedStyle]}>
            <TouchableOpacity
              style={[styles.resetButton, { backgroundColor: theme.colors.primary }]}
              onPress={resetMap}
              activeOpacity={0.7}
            >
              <Feather name="code" size={ICON_SIZE} style={styles.resetIcon} color={theme.colors.onPrimary} />
            </TouchableOpacity>
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
  popoverContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 8,
    borderRadius: 8,
  },
  popoverContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  popoverText: {
    color: '#fff',
    fontSize: 16,
  },
  // Styl dla przycisku "View"
  viewButton: {
    width: 42,
    height: 22,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    // marginLeft: 10,
  },
  viewButtonText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '600', // Less bold but bolder than normal
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
  mapContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  baseMapContainer: {
    position: 'absolute',
    top: 0, // zamiast -1000
    left: 0, // zamiast -1000
    width: screenWidth,
    height: screenWidth * (16 / 9),
    opacity: 0, // ukrywamy widok, ale pozostaje on w drzewie renderowania
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
  toggleButtonContainer: {},
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