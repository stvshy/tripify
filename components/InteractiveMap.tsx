import React, {
  useContext,
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  useCallback,
  useMemo,
  useEffect,
} from "react";
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
  Pressable,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { ThemeContext } from "../app/config/ThemeContext";
import { captureRef } from "react-native-view-shot";
import rawCountriesData from "../assets/maps/countries.json";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import * as Sharing from "expo-sharing";
import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Feather, MaterialIcons } from "@expo/vector-icons";
import { useTheme, MD3Theme } from "react-native-paper";
import logoImage from "../assets/images/logo-tripify-tekstowe2.png";
import * as Progress from "react-native-progress";
import logoTextImage from "../assets/images/logo-tripify-tekst.png";
import logoTextImageDesaturated from "../assets/images/logo-tripify-tekst2.png";
import CountryFlag from "react-native-country-flag";
import Popover, { Rect } from "react-native-popover-view";
// Dodajemy hook do nawigacji
import { useRouter } from "expo-router";
import { AntDesign } from "@expo/vector-icons";
import { Entypo } from "@expo/vector-icons";
import FastImage from "@d11/react-native-fast-image";
import {
  Canvas,
  Group,
  Skia,
  Path as SkiaPathDrawing,
} from "@shopify/react-native-skia";

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

const windowWidth = Dimensions.get("window").width;
const windowHeight = Dimensions.get("window").height;
const BUTTON_SIZE = Math.min(windowWidth, windowHeight) * 0.08;
const ICON_SIZE = BUTTON_SIZE * 0.5;
const screenWidth = windowWidth;
const screenHeight = windowHeight;
const pixelRatio = PixelRatio.get();
const initialTranslateX = 0;
const initialTranslateY = 0;

// Przetwarzanie danych, aby usunÄÄ duplikaty i upewniÄ siÄ, Ĺźe 'cca2' istnieje
const uniqueCountries: Country[] = [];

const { countries, countryCentroids } = (() => {
  const countryMap: { [key: string]: Country } = {};
  rawCountriesData.countries.forEach(
    (rawCountry: {
      id: string;
      name: string;
      class: string | null;
      path: string;
    }) => {
      const cca2 =
        rawCountry.id.length === 2 ? rawCountry.id.toUpperCase() : "";
      const countryWithCca2: Country = { ...rawCountry, cca2 };
      if (!countryMap[rawCountry.id]) {
        countryMap[rawCountry.id] = countryWithCca2;
      } else {
        countryMap[rawCountry.id].path += " " + rawCountry.path;
      }
    }
  );
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
 * Funkcje sĹuĹźÄce do obliczania centroidu kraju na podstawie jego ĹcieĹźki SVG.
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
// Najpierw zdefiniujmy interfejs dla props MemoizedCountryPath
interface MemoizedCountryPathProps {
  path: string;
  fill: string;
  stroke: string;
  strokeWidth: number;
  onPress: (event: GestureResponderEvent) => void;
  countryId: string;
}

const MemoizedCountryPath = React.memo<MemoizedCountryPathProps>(
  (props) => {
    return (
      <Path // Ten Path jest z 'react-native-svg'
        d={props.path}
        fill={props.fill}
        stroke={props.stroke}
        strokeWidth={props.strokeWidth}
        onPress={props.onPress}
      />
    );
  },
  (prev, next) => {
    return (
      prev.path === next.path &&
      prev.fill === next.fill &&
      prev.stroke === next.stroke &&
      prev.strokeWidth === next.strokeWidth
    );
  }
);
// Następnie używamy tego interfejsu w komponencie
// const MemoizedCountryPath = React.memo<MemoizedCountryPathProps>(
//   (props) => {
//     return (
//       <Path
//         d={props.path}
//         fill={props.fill}
//         stroke={props.stroke}
//         strokeWidth={props.strokeWidth}
//         onPress={props.onPress}
//       />
//     );
//   },
//   (prev, next) => {
//     return (
//       prev.path === next.path &&
//       prev.fill === next.fill &&
//       prev.stroke === next.stroke &&
//       prev.strokeWidth === next.strokeWidth
//     );
//   }
// );

function computeArea(points: { x: number; y: number }[]): number {
  let area = 0;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i].x * points[j].y - points[j].x * points[i].y;
  }
  return Math.abs(area / 2);
}

function computeCentroid(points: { x: number; y: number }[]): {
  x: number;
  y: number;
} {
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
const skiaPaths = countries.map((country) => ({
  id: country.id,
  cca2: country.cca2, // potrzebne do tooltipa i flagi
  name: country.name, // potrzebne do tooltipa
  skPath: Skia.Path.MakeFromSVGString(country.path), // Główna konwersja
}));
interface TooltipPosition {
  x: number;
  y: number;
  country: Country;
  position: "top" | "bottom";
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
    const AnimatedImage = Animated.createAnimatedComponent(Image);
    const storedButtonTranslateY = useSharedValue(0);
    const tooltipVisible = useSharedValue(0);

    const activeTouches = useSharedValue<
      { id: number; x: number; y: number }[]
    >([]);
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
          const uri = await captureRef(mapViewRef, {
            format: "png",
            quality: 1,
          });
          return uri;
        }
        return null;
      },
    }));

    const MemoizedSkiaCountryPaths = React.memo(
      () => {
        return (
          <>
            {skiaPaths.map((countryData, index) => {
              if (
                !countryData.skPath ||
                !countryData.id ||
                countryData.id.startsWith("UNKNOWN-")
              )
                return null;
              const countryCode = countryData.id;

              const fill = getCountryFill(countryCode); // Twoja istniejąca funkcja
              const strokeColor = isCountryHighlighted(countryCode)
                ? theme.colors.primary
                : theme.colors.outline;
              const strokeWidthVal = isCountryHighlighted(countryCode)
                ? 0.5
                : 0.2; // Zmieniłem nazwę zmiennej strokeWidth, aby uniknąć konfliktu, jeśli istnieje props o tej nazwie

              return (
                <React.Fragment key={`skia-${countryCode}-${index}`}>
                  {/* POPRAWKA TUTAJ */}
                  <SkiaPathDrawing
                    path={countryData.skPath}
                    color={fill}
                    style="fill"
                  />
                  {/* POPRAWKA TUTAJ */}
                  <SkiaPathDrawing
                    path={countryData.skPath}
                    color={strokeColor}
                    style="stroke"
                    strokeWidth={strokeWidthVal} // Użyj zmienionej nazwy
                  />
                </React.Fragment>
              );
            })}
          </>
        );
      },
      (prev, next) => !isInteracting.value
    );

    // Niewidzialne ścieżki SVG do obsługi tapnięć
    // Upewnij się, że MemoizedCountryPath i AllCountryPaths są zdefiniowane tak jak wcześniej
    // ale będą renderowane z fill="transparent" i stroke="transparent"

    const InvisibleSvgCountryPaths = React.memo(
      () => {
        return (
          <>
            {countries.map((country: Country, index: number) => {
              const countryCode = country.id;
              if (!countryCode || countryCode.startsWith("UNKNOWN-"))
                return null;

              return (
                <MemoizedCountryPath // Twój istniejący komponent
                  key={`touch-${countryCode}-${index}`}
                  path={country.path}
                  fill="transparent" // Niewidzialne
                  stroke="transparent" // Niewidzialne
                  strokeWidth={0}
                  onPress={(event) => handlePathPress(event, countryCode)} // Twoja logika pozostaje
                  countryId={countryCode}
                />
              );
            })}
          </>
        );
      },
      (prev, next) => true // Te ścieżki się nie zmieniają wizualnie
    );
    // Memoize the entire collection of paths
    const AllCountryPaths = React.memo(
      () => {
        return (
          <>
            {countries.map((country: Country, index: number) => {
              const countryCode = country.id;
              if (!countryCode || countryCode.startsWith("UNKNOWN-"))
                return null;

              return (
                <MemoizedCountryPath
                  key={`${countryCode}-${index}`}
                  path={country.path}
                  fill={getCountryFill(countryCode)}
                  stroke={
                    isCountryHighlighted(countryCode)
                      ? theme.colors.primary
                      : theme.colors.outline
                  }
                  strokeWidth={isCountryHighlighted(countryCode) ? 0.5 : 0.2}
                  onPress={(event) => handlePathPress(event, countryCode)}
                  countryId={countryCode}
                />
              );
            })}
          </>
        );
      },
      (prev, next) => !isInteracting.value
    ); // Only update when not interacting

    const [preGeneratedImage, setPreGeneratedImage] = useState<string | null>(
      null
    );

    useEffect(() => {
      // const generateImage = async () => {
      //   try {
      //     const uri = await captureRef(baseMapRef, {
      //       format: "jpg",
      //       quality: 1,
      //       result: "tmpfile",
      //       width: screenWidth * pixelRatio * 6,
      //       height: screenWidth * pixelRatio * 6 * (16 / 9),
      //     });
      //     setPreGeneratedImage(uri);
      //   } catch (error) {
      //     console.error("BĹÄd przy pre-generowaniu obrazu:", error);
      //   }
      // };
      // generateImage();
    }, [baseMapRef, isDarkTheme]);

    // Funkcja udostÄpniania mapy
    const shareMap = async () => {
      if (isSharing) return;
      setIsSharing(true);

      try {
        const isAvailable = await Sharing.isAvailableAsync();
        if (!isAvailable) {
          Alert.alert(
            "Błąd",
            "Udostępnianie nie jest dostępne na tym urządzeniu"
          );
          setIsSharing(false);
          return;
        }

        // Renderujemy mapę poza ekranem, bez widocznych zmian dla użytkownika
        if (baseMapRef.current) {
          baseMapRef.current.setNativeProps({
            style: {
              position: "absolute",
              top: 0,
              left: 0,
              opacity: 0, // Pozostawiamy niewidoczny dla użytkownika
              zIndex: -1, // Pod wszystkimi innymi elementami
              width: screenWidth,
              height: screenWidth * (16 / 9),
            },
          });
        }

        // Krótsze oczekiwanie, ponieważ nie czekamy na animację widoczności
        await new Promise((resolve) => setTimeout(resolve, 50));

        // Generujemy obraz
        const uri = await captureRef(baseMapRef, {
          format: "jpg",
          quality: 0.9,
          result: "tmpfile",
        });

        // Ukrywamy z powrotem
        if (baseMapRef.current) {
          baseMapRef.current.setNativeProps({
            style: {
              position: "absolute",
              top: -9999,
              left: -9999,
              opacity: 0,
            },
          });
        }

        // Udostępniamy obraz
        if (uri) {
          await Sharing.shareAsync(uri);
        }
      } catch (error) {
        console.error("Błąd podczas udostępniania mapy:", error);
        if (!String(error).includes("The 2nd argument cannot be cast")) {
          Alert.alert("Błąd", "Wystąpił problem podczas udostępniania mapy");
        }
      } finally {
        setIsSharing(false);
      }
    };

    const applyTransparency = (hexColor: string, transparency: number) => {
      const hex = hexColor.replace("#", "");
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${transparency})`;
    };

    // Zaktualizuj funkcjÄ getCountryFill
    const getCountryFill = useCallback(
      (countryCode: string) => {
        const isVisited = selectedCountries.includes(countryCode);
        const isHighlighted = tooltip && tooltip.country.id === countryCode;
        if (isHighlighted) {
          return applyTransparency(theme.colors.primary, 0.75);
        }
        return isVisited ? "rgba(0,174,245,255)" : "#b2b7bf";
      },
      [selectedCountries, tooltip, theme.colors.primary]
    );

    // Zaktualizuj isCountryHighlighted
    const isCountryHighlighted = useCallback(
      (countryCode: string): boolean => {
        return Boolean(tooltip && tooltip.country.id === countryCode);
      },
      [tooltip]
    );
    const SkiaVisibleCountries = React.memo(
      () => {
        console.log(
          "SkiaVisibleCountries re-render, isInteracting:",
          isInteracting.value
        ); // Do debugowania
        return (
          <>
            {skiaPaths.map((countryData) => {
              if (
                !countryData.skPath ||
                !countryData.id ||
                countryData.id.startsWith("UNKNOWN-")
              ) {
                return null;
              }
              const countryCode = countryData.id;
              const fill = getCountryFill(countryCode); // Twoja funkcja
              const strokeColor = isCountryHighlighted(countryCode)
                ? theme.colors.primary
                : theme.colors.outline;
              const strokeWidthVal = isCountryHighlighted(countryCode)
                ? 0.5
                : 0.2;

              return (
                <React.Fragment key={`skia-visible-${countryCode}`}>
                  <SkiaPathDrawing // Ten Path jest z '@shopify/react-native-skia'
                    path={countryData.skPath}
                    color={fill}
                    style="fill"
                  />
                  <SkiaPathDrawing
                    path={countryData.skPath}
                    color={strokeColor}
                    style="stroke"
                    strokeWidth={strokeWidthVal}
                  />
                </React.Fragment>
              );
            })}
          </>
        );
      },
      (prev, next) => !isInteracting.value
    ); // Twoja optymalizacja memo
    const SvgInvisibleTouchLayer = React.memo(
      () => {
        console.log("SvgInvisibleTouchLayer re-render"); // Do debugowania
        return (
          <>
            {countries.map((country) => {
              // Używamy oryginalnych `countries` z `path` SVG
              const countryCode = country.id;
              if (!countryCode || countryCode.startsWith("UNKNOWN-")) {
                return null;
              }
              return (
                <MemoizedCountryPath // Używa komponentu SVG
                  key={`touch-svg-${countryCode}`}
                  path={country.path}
                  fill="transparent" // Niewidzialne
                  stroke="transparent" // Niewidzialne
                  strokeWidth={0.1} // Minimalna grubość dla wykrywania dotyku
                  onPress={(event) => handlePathPress(event, countryCode)} // Twoja istniejąca funkcja
                  countryId={countryCode}
                />
              );
            })}
          </>
        );
      },
      () => true
    );
    const visitedCountries = useMemo(
      () => selectedCountries.length,
      [selectedCountries]
    );
    const percentageVisited = useMemo(
      () => (totalCountries > 0 ? visitedCountries / totalCountries : 0),
      [visitedCountries, totalCountries]
    );

    const clamp = (value: number, min: number, max: number): number => {
      "worklet";
      return Math.min(Math.max(value, min), max);
    };
    useEffect(() => {
      if (tooltip) {
        tooltipVisible.value = 1;
        // Obliczamy bieĹźÄcy progress dla przyciskĂłw
        const currentProgress = Math.min((scale.value - 1) / (1.16 - 1), 1);
        storedButtonTranslateY.value = screenHeight * 0.05 * currentProgress;
      } else {
        tooltipVisible.value = 0;
      }
    }, [tooltip]);

    const isMounted = useRef(true);

    useEffect(() => {
      return () => {
        isMounted.current = false;
        // Resetowanie wartoĹci animowanych przy odmontowaniu
        if (scale) cancelAnimation(scale);
        if (translateX) cancelAnimation(translateX);
        if (translateY) cancelAnimation(translateY);
      };
    }, []);
    useEffect(() => {
      return () => {
        isMounted.current = false;

        // Properly cancel animations on unmount
        cancelAnimation(scale);
        cancelAnimation(translateX);
        cancelAnimation(translateY);
        cancelAnimation(scaleValue);
        cancelAnimation(popoverOffset);
        cancelAnimation(tooltipVisible);
        cancelAnimation(storedButtonTranslateY);
      };
    }, []);

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
    const THROTTLE_DELAY = 16; // ~60fps
    let lastPinchUpdate = 0;
    let lastPanUpdate = 0;
    const isInteracting = useSharedValue(false);
    const MAP_ASPECT_RATIO = 857 / 1700;
    const mapDimensions = useMemo(() => {
      return {
        baseWidth: screenWidth,
        baseHeight: screenWidth * MAP_ASPECT_RATIO,
        highResWidth: screenWidth * RESOLUTION_FACTOR,
        highResHeight: screenWidth * MAP_ASPECT_RATIO * RESOLUTION_FACTOR,
        viewBox: "232 0 1700 857",
      };
    }, [screenWidth, RESOLUTION_FACTOR]);
    const pinchGesture = Gesture.Pinch()
      .onBegin((event) => {
        "worklet";
        if (tooltip) {
          runOnJS(setTooltip)(null);
        } else {
          initialDistance.value = event.scale;
          baseScale.value = scale.value;
          initialFocalX.value = event.focalX;
          initialFocalY.value = event.focalY;
          baseTranslateX.value = translateX.value;
          baseTranslateY.value = translateY.value;
          isInteracting.value = true;
        }
      })
      .onUpdate((event) => {
        const now = Date.now();
        if (now - lastPinchUpdate < THROTTLE_DELAY) return;
        lastPinchUpdate = now;

        const scaleFactor = event.scale;
        const newScale = clamp(baseScale.value * scaleFactor, 1, 7);

        // Optymalizacja: aktualizuj tylko jeĹli zmiana jest znaczÄca
        if (Math.abs(newScale - scale.value) > SCALE_THRESHOLD) {
          scale.value = newScale;

          const newTranslateX = clamp(
            baseTranslateX.value -
              (initialFocalX.value - windowWidth / 2) * (scaleFactor - 1),
            (-windowWidth * (newScale - 1)) / 2,
            (windowWidth * (newScale - 1)) / 2
          );
          const newTranslateY = clamp(
            baseTranslateY.value -
              (initialFocalY.value - windowHeight / 2) * (scaleFactor - 1),
            (-windowHeight * (newScale - 1)) / 4,
            (windowHeight * (newScale - 1)) / 4
          );

          // Sprawdzamy, czy zmiana pozycji jest wystarczajÄco duĹźa
          if (
            Math.abs(newTranslateX - translateX.value) > TRANSLATE_THRESHOLD
          ) {
            translateX.value = newTranslateX;
          }
          if (
            Math.abs(newTranslateY - translateY.value) > TRANSLATE_THRESHOLD
          ) {
            translateY.value = newTranslateY;
          }
        }
      })
      .onFinalize(() => {
        isInteracting.value = false;
      });

    const panGesture = Gesture.Pan()
      .maxPointers(1)
      .onStart(() => {
        startX.value = translateX.value;
        startY.value = translateY.value;
        isInteracting.value = true;
      })
      .onUpdate((event) => {
        const now = Date.now();
        if (now - lastPanUpdate < THROTTLE_DELAY) return;
        lastPanUpdate = now;

        const maxTranslateX = (windowWidth * (scale.value - 1)) / 2;
        const maxTranslateY = (windowHeight * (scale.value - 1)) / 4;
        translateX.value = clamp(
          startX.value + event.translationX,
          -maxTranslateX,
          maxTranslateX
        );
        translateY.value = clamp(
          startY.value + event.translationY,
          -maxTranslateY,
          maxTranslateY
        );
      })
      .onFinalize(() => {
        isInteracting.value = false;
      });
    const animatedMapQuality = useAnimatedStyle(() => {
      return {
        transform: [
          {
            scale:
              1 /
              (isInteracting.value ? RESOLUTION_FACTOR / 2 : RESOLUTION_FACTOR),
          },
        ],
      };
    });

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
      ],
    }));

    const topTextAnimatedStyle = useAnimatedStyle(() => {
      const translateY = -120 * (scale.value - 1);
      // Tymczasowo ustawiamy opacity na wartoĹÄ zaleĹźnÄ od scale
      const opacity = 1 - Math.min(1, (scale.value - 1) * 6.5);
      return { transform: [{ translateY }], opacity };
    });

    const getTranslateY = (
      maxTranslateY: number,
      maxScale: number,
      scaleValue: number
    ) => {
      "worklet";
      const progress = Math.min((scaleValue - 1) / (maxScale - 1), 1);
      return maxTranslateY * progress;
    };

    const bottomTextAnimatedStyle = useAnimatedStyle(() => {
      const maxTranslateY = screenHeight * 0.14;
      const maxScale = 1.6;
      const translateY = getTranslateY(maxTranslateY, maxScale, scale.value);
      const opacityProgress = Math.min((scale.value - 1) / (maxScale - 1), 1);
      const opacity = 1 - Math.min(1, (scale.value - 1) * 5);
      return { transform: [{ translateY }], opacity };
    });
    const popoverOffset = useSharedValue(0);

    const animatedPopoverStyle = useAnimatedStyle(() => {
      return {
        transform: [{ translateY: popoverOffset.value }],
      };
    });
    const handlePopoverPress = () => {
      if (!tooltip) return; // Zapewnij, Ĺźe tooltip istnieje
      popoverOffset.value = withSequence(
        withTiming(-10, { duration: 100 }),
        withTiming(0, { duration: 100 })
      );
      router.push(`/country/${tooltip.country.id}`);
      setTooltip(null);
    };

    const buttonContainerAnimatedStyle = useAnimatedStyle(() => {
      const maxTranslateY = screenHeight * 0.05;
      const saturationScale = 1.16;
      const progress = Math.min((scale.value - 1) / (saturationScale - 1), 1);
      const computedTranslateY = maxTranslateY * progress;
      const translateY = tooltipVisible.value
        ? storedButtonTranslateY.value
        : computedTranslateY;
      return { transform: [{ translateY }] };
    });

    const tooltipAnimatedStyle = useAnimatedStyle(() => {
      try {
        return {
          transform: [
            {
              scale: withTiming(1 / scale.value, {
                duration: 100,
                easing: Easing.out(Easing.ease),
              }),
            },
          ],
        };
      } catch (error) {
        console.error("Tooltip animation error:", error);
        return {};
      }
    });

    const handlePathPress = useCallback(
      (event: GestureResponderEvent, countryCode: string) => {
        event.stopPropagation && event.stopPropagation();
        const country = countries.find((c) => c.id === countryCode);
        if (!country) return;
        const { pageX, pageY } = event.nativeEvent;
        const localX = pageX - containerOffset.x;
        const localY = pageY - containerOffset.y;
        setTooltip({
          x: localX,
          y: localY,
          country,
          position: localY > 100 ? "top" : "bottom",
        });
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
      handlePathPress: (
        event: GestureResponderEvent,
        countryCode: string
      ) => void;
    }

    const countryPaths = useMemo(() => {
      return countries.map((country: Country, index: number) => {
        const countryCode = country.id;
        if (!countryCode || countryCode.startsWith("UNKNOWN-")) return null;

        return (
          <MemoizedCountryPath
            key={`${countryCode}-${index}`}
            path={country.path}
            fill={getCountryFill(countryCode)}
            stroke={
              isCountryHighlighted(countryCode)
                ? theme.colors.primary
                : theme.colors.outline
            }
            strokeWidth={isCountryHighlighted(countryCode) ? 0.5 : 0.2}
            onPress={(event) => handlePathPress(event, countryCode)}
            countryId={countryCode}
          />
        );
      });
    }, [
      getCountryFill,
      isCountryHighlighted,
      theme.colors.primary,
      theme.colors.outline,
      handlePathPress,
    ]);
    const popoverScale = useSharedValue(1);

    const animatedPopoverContentStyle = useAnimatedStyle(() => ({
      transform: [{ scale: popoverScale.value }],
    }));

    const handlePopoverPressIn = () => {
      popoverScale.value = withTiming(1.023, { duration: 100 });
    };

    const handlePopoverPressOut = () => {
      popoverScale.value = withTiming(1, { duration: 100 });
    };
    const resetMap = useCallback(() => {
      // Cancel any ongoing animations
      cancelAnimation(scale);
      cancelAnimation(translateX);
      cancelAnimation(translateY);

      // Use optimized spring configuration
      scale.value = withSpring(1, {
        damping: 20,
        stiffness: 90,
        mass: 1.2,
        restDisplacementThreshold: 0.01,
        restSpeedThreshold: 0.01,
      });

      translateX.value = withSpring(0, {
        damping: 20,
        stiffness: 90,
        mass: 1.2,
      });

      translateY.value = withSpring(0, {
        damping: 20,
        stiffness: 90,
        mass: 1.2,
      });

      runOnJS(setTooltip)(null);
    }, []);

    return (
      <GestureHandlerRootView>
        <View
          ref={fullViewRef}
          style={[
            styles.fullViewContainer,
            { backgroundColor: theme.colors.background },
          ]}
          onLayout={(e: LayoutChangeEvent) => {
            const { x, y } = e.nativeEvent.layout;
            setContainerOffset({ x, y });
          }}
        >
          {/* Główna sekcja z logo */}
          <Animated.View style={[styles.topSection, topTextAnimatedStyle]}>
            <AnimatedImage
              source={isDarkTheme ? logoTextImageDesaturated : logoTextImage}
              style={styles.logoTextImage}
              resizeMode="contain"
            />
          </Animated.View>
          <GestureDetector
            gesture={Gesture.Simultaneous(pinchGesture, panGesture)}
          >
            <Animated.View style={[styles.container, animatedStyle]}>
              <View ref={mapViewRef} style={styles.mapContainer}>
                <Animated.View
                  style={{
                    width: highResWidth, // Canvas Skia potrzebuje jawnych wymiarów
                    height: highResHeight,
                    transform: [{ scale: 1 / RESOLUTION_FACTOR }],
                  }}
                  pointerEvents="none" // Skia nie będzie obsługiwać dotyku bezpośrednio
                >
                  <Canvas style={{ flex: 1 }}>
                    {(() => {
                      const vbParts = mapDimensions.viewBox
                        .split(" ")
                        .map(Number); // [232, 0, 1700, 857]
                      const vbX = vbParts[0];
                      const vbY = vbParts[1];
                      const vbWidth = vbParts[2];
                      const vbHeight = vbParts[3];

                      const scaleToFitX = highResWidth / vbWidth;
                      const scaleToFitY = highResHeight / vbHeight;
                      const scaleFactor = Math.min(scaleToFitX, scaleToFitY); // Zachowuje proporcje 'meet'

                      // Oblicz przesunięcia, aby wycentrować zawartość viewBox na płótnie Skia
                      const scaledContentWidth = vbWidth * scaleFactor;
                      const scaledContentHeight = vbHeight * scaleFactor;

                      const translateX =
                        (highResWidth - scaledContentWidth) / 2;
                      const translateY =
                        (highResHeight - scaledContentHeight) / 2;

                      // Budujemy macierz transformacji dla Skia <Group>
                      const transformMatrix = Skia.Matrix();
                      transformMatrix.translate(translateX, translateY); // 3. Przesuń na środek płótna
                      transformMatrix.scale(scaleFactor, scaleFactor); // 2. Skaluj
                      transformMatrix.translate(-vbX, -vbY); // 1. Przesuń początek viewBox do (0,0)

                      return (
                        <Group matrix={transformMatrix}>
                          <SkiaVisibleCountries />
                        </Group>
                      );
                    })()}
                  </Canvas>
                </Animated.View>

                {/* ---- WARSTWA 2: SVG (NIEWIDZIALNA, DLA KLIKNIĘĆ) ---- */}
                <View
                  style={{
                    ...StyleSheet.absoluteFillObject, // Rozciąga się na cały mapViewRef
                    // backgroundColor: 'rgba(0,255,0,0.1)', // Do debugowania pozycji warstwy SVG
                  }}
                  pointerEvents="auto" // Ta warstwa przechwytuje dotyk
                >
                  <Svg
                    width="100%"
                    height="100%"
                    viewBox={mapDimensions.viewBox} // Użyj tego samego viewBox co wcześniej
                    preserveAspectRatio="xMidYMid meet" // Kluczowe dla dopasowania geometrii kliknięć
                  >
                    <SvgInvisibleTouchLayer />
                  </Svg>
                </View>
                {/* Tooltip z informacjami o kraju oraz przyciskiem View */}
                {tooltip && (
                  <Popover
                    isVisible={tooltip !== null}
                    from={new Rect(tooltip.x, tooltip.y, 1, 1)}
                    onRequestClose={() => setTooltip(null)}
                    popoverStyle={styles.popoverContainer}
                    arrowSize={{ width: 11.2, height: 11 }}
                    backgroundStyle={{ backgroundColor: "transparent" }}
                  >
                    <Animated.View
                      style={[
                        styles.popoverContent,
                        animatedPopoverContentStyle,
                      ]}
                    >
                      <TouchableOpacity
                        onPressIn={handlePopoverPressIn}
                        onPressOut={handlePopoverPressOut}
                        onPress={() => {
                          router.push(`/country/${tooltip.country.id}`);
                          setTooltip(null);
                        }}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <CountryFlag
                          isoCode={tooltip.country.cca2}
                          size={22}
                          style={{ borderRadius: 5, overflow: "hidden" }}
                        />
                        <Text style={styles.popoverText}>
                          {tooltip.country.name}
                        </Text>
                        <AntDesign
                          name="rightcircle"
                          size={13}
                          color={"rgb(240, 237, 242)"}
                          style={{ marginLeft: -2, marginTop: 1.5 }}
                        />
                      </TouchableOpacity>
                    </Animated.View>
                  </Popover>
                )}
              </View>
            </Animated.View>
          </GestureDetector>
          {/* Dolna sekcja z paskiem postÄpu */}
          <Animated.View
            style={[styles.bottomSection, bottomTextAnimatedStyle]}
          >
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
                <Text
                  style={[
                    styles.progressText,
                    { color: theme.colors.onSurface },
                  ]}
                >
                  {(percentageVisited * 100).toFixed(1)}%
                </Text>
              </View>
              <View style={styles.progressTextRight}>
                <Text
                  style={[
                    styles.progressText,
                    { color: theme.colors.onSurface },
                  ]}
                >
                  {visitedCountries}/{totalCountries}
                </Text>
              </View>
            </View>
          </Animated.View>
          {/* Ukryta bazowa mapa do udostÄpniania */}
          <View
            ref={baseMapRef}
            collapsable={false}
            style={[
              styles.baseMapContainer,
              {
                backgroundColor: isDarkTheme
                  ? theme.colors.surface
                  : theme.colors.background,
              },
            ]}
          >
            <View style={styles.topSectionPhoto}>
              <FastImage
                source={
                  typeof logoImage === "number"
                    ? logoImage
                    : { uri: Image.resolveAssetSource(logoImage).uri }
                }
                style={styles.logoImage}
                resizeMode={FastImage.resizeMode.contain}
              />
            </View>
            <View style={styles.mapContainerPhoto}>
              <Svg
                width="100%"
                height="100%"
                viewBox="232 0 1700 857"
                preserveAspectRatio="xMidYMid meet"
              >
                {countries.map((country: Country, index: number) => {
                  const countryCode = country.id;
                  if (!countryCode || countryCode.startsWith("UNKNOWN-"))
                    return null;

                  return (
                    <Path
                      key={`share-${countryCode}-${index}`}
                      d={country.path}
                      fill={getCountryFill(countryCode)}
                      stroke={theme.colors.outline}
                      strokeWidth={0.2}
                    />
                  );
                })}
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
                  <Text
                    style={[
                      styles.progressText,
                      { color: theme.colors.onSurface },
                    ]}
                  >
                    {(percentageVisited * 100).toFixed(1)}%
                  </Text>
                </View>
                <View style={styles.progressTextRight}>
                  <Text
                    style={[
                      styles.progressText,
                      { color: theme.colors.onSurface },
                    ]}
                  >
                    {visitedCountries}/{totalCountries}
                  </Text>
                </View>
              </View>
            </View>
          </View>
          {/* Kontener przyciskĂłw */}
          <Animated.View
            style={[styles.buttonContainer, buttonContainerAnimatedStyle]}
          >
            <TouchableOpacity
              style={[
                styles.resetButton,
                { backgroundColor: theme.colors.primary },
              ]}
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
            <TouchableOpacity
              style={[
                styles.shareButton,
                { backgroundColor: theme.colors.primary },
              ]}
              onPress={shareMap}
              activeOpacity={0.7}
              disabled={isSharing}
            >
              {isSharing ? (
                <ActivityIndicator
                  size="small"
                  color={theme.colors.onPrimary}
                />
              ) : (
                <Feather
                  name="share-2"
                  size={ICON_SIZE}
                  color={theme.colors.onPrimary}
                />
              )}
            </TouchableOpacity>
            <Animated.View
              style={[styles.toggleButtonContainer, animatedToggleStyle]}
            >
              <TouchableOpacity
                onPress={handleToggleTheme}
                style={[
                  styles.toggleButton,
                  { backgroundColor: theme.colors.primary },
                ]}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name={isDarkTheme ? "dark-mode" : "light-mode"}
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
    justifyContent: "space-between",
    padding: 2,
  },
  topSection: {
    top: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  bottomSection: {
    justifyContent: "center",
    alignItems: "center",
    bottom: "2.5%",
  },
  logoTextImage: {
    width: "16%",
    height: undefined,
    aspectRatio: 3,
  },
  progressBarWrapper: {
    width: screenWidth * 0.8,
    height: 20,
    position: "relative",
    justifyContent: "center",
    overflow: "hidden",
    borderRadius: 10,
  },
  popoverContainer: {
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    padding: 8,
    borderRadius: 8,
  },
  popoverContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  popoverText: {
    color: "#fff",
    fontSize: 16,
  },
  // Styl dla przycisku "View"
  viewButton: {
    width: 42,
    height: 22,
    borderRadius: 20,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    // marginLeft: 10,
  },
  viewButtonText: {
    color: "#000",
    fontSize: 12,
    fontWeight: "600", // Less bold but bolder than normal
  },
  progressTextLeft: {
    position: "absolute",
    left: 10,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
  progressTextRight: {
    position: "absolute",
    right: 10,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
  progressText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  topSectionPhoto: {
    position: "absolute",
    top: "4%",
    left: 0,
    right: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  logoImage: {
    width: "20%",
    height: undefined,
    aspectRatio: 2,
  },
  bottomSectionPhoto: {
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
    bottom: "3%",
    left: 0,
    right: 0,
  },
  mapContainerPhoto: {
    flex: 1,
    marginTop: "10%",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    height: "100%",
  },
  mapContainer: {
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    height: "100%",
  },
  baseMapContainer: {
    position: "absolute",
    top: -9999, // zamiast opacity: 0, caĹkowicie usuwamy z pola widzenia
    left: -9999,
    width: screenWidth,
    height: screenWidth * (16 / 9),
    pointerEvents: "none",
  },
  buttonContainer: {
    position: "absolute",
    bottom: "8%",
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  resetButton: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  shareButton: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  toggleButtonContainer: {},
  toggleButton: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  resetIcon: {
    transform: [{ rotate: "-45deg" }],
    fontSize: ICON_SIZE,
  },
});

export default InteractiveMap;
