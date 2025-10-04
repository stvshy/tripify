import React, {
  useContext,
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  useCallback,
  useMemo,
  useEffect,
  useLayoutEffect, // re-added for synchronous update
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
  clamp,
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  withRepeat,
} from "react-native-reanimated";
import { useAnimatedReaction } from "react-native-reanimated";
import { Feather, MaterialIcons } from "@expo/vector-icons";
import { useTheme, MD3Theme } from "react-native-paper";
import logoImage from "../assets/images/logo-tripify-tekstowe2.png";
import logoTextImage from "../assets/images/logo-tripify-tekst.png";
import logoTextImageDesaturated from "../assets/images/logo-tripify-tekst2.png";
import CountryFlag from "react-native-country-flag";
import Popover, { Rect } from "react-native-popover-view";
import { useFocusEffect } from "@react-navigation/native"; // added for blur/focus lifecycle
// Dodajemy hook do nawigacji
import { useRouter } from "expo-router";
import { AntDesign } from "@expo/vector-icons";
import { Entypo } from "@expo/vector-icons";
import FastImage from "@d11/react-native-fast-image";
import { auth } from "../app/config/firebaseConfig";
import {
  Canvas,
  Group,
  Skia,
  Path as SkiaPathDrawing,
} from "@shopify/react-native-skia";
import ProgressBar from "./ProgressBar";
import ConfettiCannon from "react-native-confetti-cannon";
import { moderateScale, ScaledSheet } from "react-native-size-matters";
import { useMapState } from "@/app/config/MapStateProvider";
import FloatingActionMenu from "./FloatingActionMenu";
import NewOverlay from "./NewOverlay";

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

// Przetwarzanie danych, aby usunÄÄ duplikaty i upewniÄ siÄ, Ĺźe 'cca2' istnieje
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
 * Funkcje sĹ‚uĹźÄce do obliczania centroidu kraju na podstawie jego ĹcieĹźki SVG.
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
  selectedCountries: string[]; // still accepted for now (legacy) TODO: make optional
  totalCountries: number;
  onCountryPress: (countryCode: string) => void;
  style?: StyleProp<ViewStyle>;
}

const InteractiveMapComponent = forwardRef<
  InteractiveMapRef,
  InteractiveMapProps
>(({ selectedCountries, totalCountries, onCountryPress, style }, ref) => {
  const {
    scale,
    translateX,
    translateY,
    resetMapTransform,
    isUpdating,
    recentlyChangedCountries,
    clearHighlights,
    showNewIndicator,
    dismissNewIndicator,
    instantDismissNewIndicator,
    selectedCountries: selectedCountriesCtx,
    updateSequence,
    visitedCount,
    isMapActive,
    setMapActive,
    flushQueuedDiffs,
    peekQueuedChanged,
    loadAndApplyPendingDiff,
  } = useMapState();
  const { isDarkTheme, toggleTheme } = useContext(ThemeContext);
  const theme = useTheme();
  const router = useRouter(); // Hook do nawigacji
  const mapViewRef = useRef<View>(null);
  const baseMapRef = useRef<View>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipPosition | null>(null);
  const pendingTooltipRef = useRef<TooltipPosition | null>(null);
  const scaleValue = useSharedValue(1);
  // Local highlight buffer for first-frame coloring before provider flush lands
  const [pendingHighlights, setPendingHighlights] =
    useState<Set<string> | null>(() => {
      try {
        const queued = peekQueuedChanged?.() || [];
        return queued.length > 0 ? new Set(queued) : null;
      } catch {
        return null;
      }
    });
  // Force-show New overlay immediately on first frame if we detected queued diffs
  const [forceNewVisible, setForceNewVisible] = useState<boolean>(() => {
    try {
      const queued = peekQueuedChanged?.() || [];
      return queued.length > 0 && !showNewIndicator;
    } catch {
      return false;
    }
  });
  // B: visitedSet (prefer context list to keep timing with highlights; fallback to prop for legacy)
  const visitedList = useMemo(
    () => selectedCountriesCtx ?? selectedCountries ?? [],
    [selectedCountriesCtx, selectedCountries]
  );
  const visitedSet = useMemo(() => new Set(visitedList), [visitedList]);

  // Szybkie włączenie aktywności mapy i flush queued diffs przed pierwszym rysowaniem
  useLayoutEffect(() => {
    // Pre-arm already handled in lazy state initializers; just ensure map active
    setMapActive(true);
    // CRITICAL OPTIMIZATION: Apply pending diff IMMEDIATELY for instant visual effects
    loadAndApplyPendingDiff();
    // If already visible flag is true, ensure container visible instantly
    if (showNewIndicator) {
      toggleProgress.value = 1;
    }
    return () => {
      setMapActive(false);
      setPendingHighlights(null);
    };
  }, []); // Back to empty dependencies for immediate execution

  // When provider flag flips to true, stop forcing local visibility
  // useEffect(() => {
  //   if (showNewIndicator && forceNewVisible) {
  //     setForceNewVisible(false);
  //   }
  // }, [showNewIndicator, forceNewVisible]);

  // Preserve previous percentageVisited logic after introducing visitedSet
  const visitedCountries = useMemo(() => visitedCount, [visitedCount]);
  const percentageVisited = useMemo(
    () => (totalCountries > 0 ? visitedCount / totalCountries : 0),
    [visitedCount, totalCountries]
  );
  const AnimatedImage = Animated.createAnimatedComponent(Image);
  const storedButtonTranslateY = useSharedValue(0);
  const tooltipVisible = useSharedValue(0);

  const activeTouches = useSharedValue<{ id: number; x: number; y: number }[]>(
    []
  );
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
  // --- Confetti firing and New button scale animation ---
  const confettiRef = useRef<ConfettiCannon>(null);
  const newButtonRef = useRef<View>(null);
  const [confettiOrigin, setConfettiOrigin] = useState<{
    x: number;
    y: number;
  } | null>(null);
  // For scale animation
  const newButtonScale = useSharedValue(1);
  // Confetti: start hidden; reveal next frame to avoid initial clump at origin
  const confettiOpacity = useSharedValue(1);
  const confettiWrapperStyle = useAnimatedStyle(() => ({
    opacity: confettiOpacity.value,
  }));
  // During dismissal, keep regular buttons hidden to avoid flash
  const suppressRegularButtons = useSharedValue(0);
  const CONFETTI_SHIFT_X_RATIO = 0.12; // subtle left shift for origin centering
  const CONFETTI_ORIGIN_Y_RATIO = 2.06; // anchor inside button height: 0=top, 1=bottom
  const FALLBACK_ORIGIN = { x: screenWidth / 2, y: screenHeight * 0.08 };

  // Helper to compute corrected confetti origin immediately (no layout measurement)
  const computeConfettiOrigin = useCallback(() => {
    const buttonWidth = BUTTON_SIZE * 2.2; // styles.newButtonWrapper.width
    const originX = screenWidth / 2 - buttonWidth * CONFETTI_SHIFT_X_RATIO;

    // Convert anchor position to bottom-from-screen coordinates expected by ConfettiCannon
    const containerBottomOffset = screenHeight * 0.08; // styles.buttonContainer.bottom
    const containerHeight = BUTTON_SIZE; // styles.buttonContainer.height
    const wrapperHeight = BUTTON_SIZE * 1.05; // styles.newButtonWrapper.height
    const wrapperTop =
      screenHeight -
      containerBottomOffset -
      containerHeight +
      (containerHeight - wrapperHeight) / 2;
    const anchorTopY = wrapperTop + wrapperHeight * CONFETTI_ORIGIN_Y_RATIO;
    const bottomFromScreen = Math.max(0, screenHeight - anchorTopY);

    return { x: originX, y: bottomFromScreen };
  }, []);

  // Synchronize: when showNewIndicator becomes true, start animations immediately
  useLayoutEffect(() => {
    if (!showNewIndicator) return;
    // Start button scale animation immediately - przywrócone oryginalne
    newButtonScale.value = 1.0;
    newButtonScale.value = withSequence(
      withTiming(1.13, { duration: 120, easing: Easing.out(Easing.ease) }), // Oryginalne
      withTiming(1.0, { duration: 180, easing: Easing.out(Easing.ease) }) // Oryginalne
    );
  }, [showNewIndicator]);

  // Also handle the local forced visibility path (before provider flips)
  useLayoutEffect(() => {
    if (!forceNewVisible) return;
    // Immediate scale pop without waiting a frame - przywrócone oryginalne
    try {
      cancelAnimation(newButtonScale);
      cancelAnimation(confettiOpacity);
    } catch {}
    toggleProgress.value = 1;
    newButtonScale.value = 1.0;
    newButtonScale.value = withSequence(
      withTiming(1.08, { duration: 80, easing: Easing.out(Easing.ease) }), // Oryginalne
      withTiming(1.0, { duration: 110, easing: Easing.out(Easing.ease) }) // Oryginalne
    );
    // Start confetti immediately after mount
    try {
      confettiRef.current?.start();
    } catch {}
  }, [forceNewVisible]);

  // When neither global nor forced visibility is active, nothing to do here now
  useEffect(() => {
    if (!showNewIndicator && !forceNewVisible) {
      // no-op
    }
  }, [showNewIndicator, forceNewVisible]);

  // Fire confetti exactly when the overlay becomes visible; rely on manual start for perfect sync
  useLayoutEffect(() => {
    if (!(showNewIndicator || forceNewVisible)) return;
    // Start immediately after mount (ref should be set post-commit)
    try {
      confettiRef.current?.start();
    } catch {}
  }, [showNewIndicator, forceNewVisible, updateSequence]);

  // Progress bar animation is handled inside ProgressBar component

  // Remove extra delayed start – rely on remount + autoStart

  // Animate scale also when showNewIndicator changes (fallback for first mount)
  // REPLACED by useLayoutEffect above to ensure zero delay and perfect sync
  // useEffect(() => {
  //   if (showNewIndicator) { /* removed */ }
  // }, [showNewIndicator]);

  // If origin updates while visible, fire again (safety)
  // REMOVED to prevent late re-fires and keep single, immediate start
  // useEffect(() => {
  //   if (showNewIndicator && confettiOrigin) { /* removed */ }
  // }, [confettiOrigin, showNewIndicator]);

  const newButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: newButtonScale.value }],
  }));

  // Animated moving gradient for New button border (2D random motion, reverse loop, overscanned)
  const borderShiftX = useSharedValue(0);
  const borderShiftY = useSharedValue(0);
  const restartGradientMotion = useCallback(() => {
    try {
      cancelAnimation(borderShiftX);
      cancelAnimation(borderShiftY);
    } catch {}

    // Przyspieszone random animacje gradientu dla szybszego ruchu
    const totalWidth = BUTTON_SIZE * 2.2;
    const travelX = totalWidth * (0.55 + Math.random() * 0.2); // 55%..75% width
    const travelY = BUTTON_SIZE * (0.1 + Math.random() * 0.12); // 10%..22% height
    const durX = Math.round(800 + Math.random() * 400); // Przyspieszone z 1300-2000ms do 800-1200ms
    const durY = Math.round(700 + Math.random() * 350); // Przyspieszone z 1200-1800ms do 700-1050ms

    borderShiftX.value = -travelX;
    borderShiftY.value = -travelY;
    borderShiftX.value = withRepeat(
      withTiming(travelX, {
        duration: durX,
        easing: Easing.inOut(Easing.ease), // Prostsze easing dla lepszej wydajności
      }),
      -1,
      true
    );
    borderShiftY.value = withRepeat(
      withTiming(travelY, {
        duration: durY,
        easing: Easing.inOut(Easing.ease), // Prostsze easing dla lepszej wydajności
      }),
      -1,
      true
    );
  }, [borderShiftX, borderShiftY]);
  useEffect(() => {
    restartGradientMotion();
  }, [restartGradientMotion]);
  useEffect(() => {
    if (showNewIndicator || forceNewVisible) restartGradientMotion();
  }, [
    showNewIndicator,
    forceNewVisible,
    restartGradientMotion,
    updateSequence,
  ]);
  useEffect(() => {
    if (isMapActive && (showNewIndicator || forceNewVisible))
      restartGradientMotion();
  }, [isMapActive, showNewIndicator, forceNewVisible, restartGradientMotion]);
  const movingBorderStyle = useAnimatedStyle(() => {
    // Ease-in the motion scale a bit to reduce any stepping artifacts
    const damp = 0.98;
    return {
      transform: [
        { translateX: borderShiftX.value * damp },
        { translateY: borderShiftY.value * damp },
      ],
    };
  });

  // Logika przejść PO pierwszym renderze – natychmiastowe pojawienie się przycisku New (bez opóźnienia animacji)
  const prevShowRef = useRef(showNewIndicator);
  const toggleProgress = useSharedValue(
    showNewIndicator || forceNewVisible ? 1 : 0
  );
  // Shared flag that mirrors showNewIndicator/forced for UI-thread usage
  const showNewSV = useSharedValue(showNewIndicator || forceNewVisible ? 1 : 0);

  useEffect(() => {
    // Natychmiastowe pojawienie na wejściu (zero ms), szybkie wygaszanie - przywrócone oryginalne
    const appearing = !prevShowRef.current && showNewIndicator;
    toggleProgress.value = withTiming(showNewIndicator ? 1 : 0, {
      duration: showNewIndicator ? (appearing ? 0 : 120) : 140, // Oryginalne
      easing: Easing.out(Easing.ease),
    });
    prevShowRef.current = showNewIndicator;
    showNewSV.value = showNewIndicator ? 1 : 0;
  }, [showNewIndicator]);

  // Layout-efekt, który w pierwszej klatce po ustawieniu showNewIndicator ustawia widok bez animacji
  useLayoutEffect(() => {
    if (showNewIndicator && !prevShowRef.current) {
      // Zero-delay show and immediate confetti start to perfectly sync with highlights - przywrócone oryginalne
      toggleProgress.value = 1;
      try {
        cancelAnimation(newButtonScale);
        cancelAnimation(confettiOpacity);
      } catch {}
      // no pre-hide of button; confetti wrapper managed separately
      newButtonScale.value = 1.0;
      newButtonScale.value = withSequence(
        withTiming(1.08, { duration: 80, easing: Easing.out(Easing.ease) }), // Oryginalne
        withTiming(1.0, { duration: 110, easing: Easing.out(Easing.ease) }) // Oryginalne
      );
      // rely on ConfettiCannon autoStart on remount
    }
  }, [showNewIndicator]);

  // Gwarantuj widoczność warstwy "New" po powrocie na ekran mapy.
  // Kiedy byliśmy poza ekranem, Reanimated mógł wstrzymać animacje i toggleProgress
  // mógł pozostać na 0 mimo że showNewIndicator jest true. Na fokusie wymuś 1.
  useEffect(() => {
    if (isMapActive && showNewIndicator) {
      toggleProgress.value = 1; // natychmiast pokaż
      prevShowRef.current = true; // zsynchronizuj stan poprzedni
      showNewSV.value = 1;
    }
  }, [isMapActive, showNewIndicator, updateSequence]);

  // Fallback: jeśli flushQueuedDiffs ustawił showNewIndicator na true w tle,
  // po powrocie odpal animację skali i konfetti dla aktualnej sekwencji.
  const lastAnimSeqRef = useRef<number>(-1);
  useEffect(() => {
    if (!isMapActive || !showNewIndicator) return;
    // Jeśli już było true, nie duplikuj animacji (useLayoutEffect już obsłużył)
    if (prevShowRef.current) return;
    if (lastAnimSeqRef.current === updateSequence) return;
    lastAnimSeqRef.current = updateSequence;
    // Upewnij się, że warstwa jest widoczna
    toggleProgress.value = 1;
    // Zresetuj i odpal efekt przycisku + konfetti
    try {
      cancelAnimation(newButtonScale);
      cancelAnimation(confettiOpacity);
    } catch {}
    // no pre-hide of button; confetti wrapper managed separately
    newButtonScale.value = 1.0;
    // Ultra-fast scale to avoid blocking JS and RN bridge
    newButtonScale.value = withSequence(
      withTiming(1.08, { duration: 90, easing: Easing.out(Easing.ease) }),
      withTiming(1.0, { duration: 120, easing: Easing.out(Easing.ease) })
    );
    // rely on autoStart on remount
  }, [isMapActive, showNewIndicator, updateSequence]);

  // Safety: ensure Confetti starts after remount in all edge-cases
  useEffect(() => {
    if (!isMapActive) return;
    if (!(showNewIndicator || forceNewVisible)) return;
    // nothing; confetti runs itself on mount
  }, [updateSequence, isMapActive, showNewIndicator, forceNewVisible]);

  const newContainerAnimatedStyle = useAnimatedStyle(() => {
    // Show/hide instantly; keep scale constant. Only border gradient moves.
    return { opacity: showNewSV.value, transform: [{ scale: 1 }] };
  });

  const regularButtonsAnimatedStyle = useAnimatedStyle(() => {
    const base = 1 - toggleProgress.value;
    const suppressed = 1 - suppressRegularButtons.value;
    return { opacity: base * suppressed };
  });

  // When New appears, immediately suppress regular buttons to avoid overlap
  useEffect(() => {
    if (showNewIndicator) {
      suppressRegularButtons.value = 1;
    }
  }, [showNewIndicator]);

  const handleToggleTheme = () => {
    scaleValue.value = withTiming(1.2, { duration: 100 }, () => {
      scaleValue.value = withTiming(1, { duration: 100 });
    });
    toggleTheme();
  };
  // ProgressBar is imported statically at the top for simplicity and tree-shaking

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
            if (!countryCode || countryCode.startsWith("UNKNOWN-")) return null;

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
      const isVisited = visitedSet.has(countryCode);
      const isHighlighted = tooltip && tooltip.country.id === countryCode;
      const isRecentlyChanged =
        recentlyChangedCountries.has(countryCode) ||
        (pendingHighlights ? pendingHighlights.has(countryCode) : false);
      if (isRecentlyChanged) {
        return theme.colors.primary;
      }
      if (isHighlighted) {
        return applyTransparency(theme.colors.primary, 0.75);
      }
      return isVisited ? "rgba(0,174,245,255)" : "#b2b7bf";
    },
    [
      visitedSet,
      tooltip,
      theme.colors.primary,
      recentlyChangedCountries,
      pendingHighlights,
    ]
  );

  // Zaktualizuj isCountryHighlighted
  const isCountryHighlighted = useCallback(
    (countryCode: string): boolean => {
      return Boolean(tooltip && tooltip.country.id === countryCode);
    },
    [tooltip]
  );
  // OPT (B): Prekomputacja kolorów wszystkich krajów dla Skia (redukcja kosztów w pętli renderowania)
  const countryColors = useMemo(() => {
    return countries.map((c) => {
      const id = c.id;
      const isRecentlyChanged =
        recentlyChangedCountries.has(id) ||
        (pendingHighlights ? pendingHighlights.has(id) : false);
      if (isRecentlyChanged) return theme.colors.primary;
      if (tooltip && tooltip.country.id === id)
        return applyTransparency(theme.colors.primary, 0.75);
      return visitedSet.has(id) ? "rgba(0,174,245,255)" : "#b2b7bf";
    });
  }, [
    visitedSet,
    recentlyChangedCountries,
    pendingHighlights,
    tooltip,
    theme.colors.primary,
  ]);

  // Clear local pending buffer once provider delivers highlights
  useEffect(() => {
    if (
      pendingHighlights &&
      pendingHighlights.size > 0 &&
      recentlyChangedCountries.size > 0
    ) {
      setPendingHighlights(null);
    }
  }, [recentlyChangedCountries, pendingHighlights]);

  // Zmieniono: uproszczona wersja bez React.memo – koszty per render mniejsze dzięki prekomputacji countryColors
  const SkiaVisibleCountries = () => {
    return (
      <>
        {skiaPaths.map((countryData, idx) => {
          if (
            !countryData.skPath ||
            !countryData.id ||
            countryData.id.startsWith("UNKNOWN-")
          ) {
            return null;
          }
          const countryCode = countryData.id;
          const fill = countryColors[idx];
          const strokeHighlighted =
            tooltip && tooltip.country.id === countryCode;
          const strokeColor = strokeHighlighted
            ? theme.colors.primary
            : theme.colors.outline;
          const strokeWidthVal = strokeHighlighted ? 0.5 : 0.2;
          return (
            <React.Fragment key={`skia-visible-${countryCode}`}>
              <SkiaPathDrawing
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
  };

  // Proper definition of invisible SVG touch layer (previously misplaced inside styles)
  const SvgInvisibleTouchLayer = React.memo(
    () => {
      return (
        <>
          {countries.map((country: Country, index: number) => {
            const countryCode = country.id;
            if (!countryCode || countryCode.startsWith("UNKNOWN-")) return null;
            return (
              <MemoizedCountryPath
                key={`touch-svg-${countryCode}-${index}`}
                path={country.path}
                fill="transparent"
                stroke="transparent"
                strokeWidth={0}
                onPress={(event) => handlePathPress(event, countryCode)}
                countryId={countryCode}
              />
            );
          })}
        </>
      );
    },
    () => true
  );

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
    .enabled(!isUpdating)
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
        if (Math.abs(newTranslateX - translateX.value) > TRANSLATE_THRESHOLD) {
          translateX.value = newTranslateX;
        }
        if (Math.abs(newTranslateY - translateY.value) > TRANSLATE_THRESHOLD) {
          translateY.value = newTranslateY;
        }
      }
    })
    .onFinalize(() => {
      isInteracting.value = false;
    });

  const panGesture = Gesture.Pan()
    .maxPointers(1)
    .enabled(!isUpdating)
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

  // Menu odseparowane do komponentu FloatingActionMenu

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
      const nextTooltip: TooltipPosition = {
        x: localX,
        y: localY,
        country,
        position: localY > 100 ? "top" : "bottom",
      };
      // If a Popover is already visible, queue the next one and close current first
      if (tooltip) {
        pendingTooltipRef.current = nextTooltip;
        setTooltip(null);
      } else {
        setTooltip(nextTooltip);
      }
      onCountryPress(countryCode);
    },
    [containerOffset, onCountryPress, tooltip]
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
    resetMapTransform();
    runOnJS(setTooltip)(null);
  }, [resetMapTransform]);

  const handlePressNew = useCallback(() => {
    // Fade out the New layer quickly, while keeping regular buttons hidden to avoid any flash
    try {
      cancelAnimation(toggleProgress);
      cancelAnimation(newButtonScale);
      cancelAnimation(confettiOpacity);
    } catch {}
    confettiOpacity.value = 1; // keep visible; cannon will unmount on dismiss
    suppressRegularButtons.value = 1; // prevent functional buttons from flashing
    // Clear highlights and hide indicator immediately to keep map visuals in sync
    instantDismissNewIndicator();
    toggleProgress.value = withTiming(0, {
      duration: 140,
      easing: Easing.out(Easing.ease),
    });
    // Defer enabling regular buttons slightly after the fade completes to avoid any overlap
    setTimeout(() => {
      suppressRegularButtons.value = 0;
    }, 160);
  }, [instantDismissNewIndicator]);

  // Reset tooltip & zarządzanie aktywnością mapy na fokus/blur ekranu
  useFocusEffect(
    useCallback(() => {
      // Peek queued highlights BEFORE activation to color on first frame
      try {
        const queued = peekQueuedChanged?.() || [];
        if (queued.length > 0) {
          setPendingHighlights(new Set(queued));
          // Force immediate New layer + confetti if provider hasn't flipped yet
          if (!showNewIndicator) {
            setForceNewVisible(true);
            toggleProgress.value = 1;
            try {
              cancelAnimation(newButtonScale);
              cancelAnimation(confettiOpacity);
            } catch {}
            newButtonScale.value = 1.0;
            newButtonScale.value = withSequence(
              withTiming(1.08, {
                duration: 90,
                easing: Easing.out(Easing.ease),
              }),
              withTiming(1.0, {
                duration: 120,
                easing: Easing.out(Easing.ease),
              })
            );
            confettiOpacity.value = withTiming(1, { duration: 0 });
          }
        }
      } catch {}
      // Oznacz mapę jako aktywną – spowoduje flushQueuedDiffs()
      setMapActive(true);
      return () => {
        setTooltip(null);
        setMapActive(false);
        setPendingHighlights(null);
      };
    }, [setMapActive, showNewIndicator])
  );

  // CRITICAL FIX: Clear pending highlights when user logs out
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user: any) => {
      if (!user) {
        console.log(
          "InteractiveMap: User logged out, clearing pending highlights"
        );
        setPendingHighlights(null);
        setForceNewVisible(false);
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!isMapActive) {
      // Cancel ongoing reanimated shared value animations when map becomes inactive
      try {
        cancelAnimation(scale);
        cancelAnimation(translateX);
        cancelAnimation(translateY);
        cancelAnimation(scaleValue);
      } catch {}
      // Also reset overlay animation state so it can re-show cleanly next time
      try {
        cancelAnimation(toggleProgress);
        cancelAnimation(newButtonScale);
        cancelAnimation(confettiOpacity);
      } catch {}
      toggleProgress.value = 0;
      confettiOpacity.value = 1;
      suppressRegularButtons.value = 0;
      newButtonScale.value = 1;
    }
  }, [isMapActive]);

  // Keep regular buttons suppressed while New indicator is visible to avoid overlap/see-through
  useEffect(() => {
    try {
      suppressRegularButtons.value = showNewIndicator ? 1 : 0;
    } catch {}
  }, [showNewIndicator]);

  // Keep regular buttons suppressed and New layer visible while forcing immediate show
  useEffect(() => {
    if (!forceNewVisible) return;
    try {
      suppressRegularButtons.value = 1;
      toggleProgress.value = 1;
    } catch {}
    confettiOpacity.value = withTiming(1, { duration: 0 });
  }, [forceNewVisible]);

  // If provider already painted highlights (recentlyChangedCountries > 0), but overlay isn't up yet,
  // force-show New/confetti/progress immediately to keep everything in perfect sync with the purple highlight.
  useEffect(() => {
    if (!isMapActive) return;
    if (showNewIndicator || forceNewVisible) return;
    if (recentlyChangedCountries.size > 0) {
      setForceNewVisible(true);
      toggleProgress.value = 1;
      try {
        cancelAnimation(newButtonScale);
        cancelAnimation(confettiOpacity);
      } catch {}
      newButtonScale.value = 1.0;
      newButtonScale.value = withSequence(
        withTiming(1.08, { duration: 80, easing: Easing.out(Easing.ease) }),
        withTiming(1.0, { duration: 110, easing: Easing.out(Easing.ease) })
      );
      // Progress width will be handled by ProgressBar internally
    }
  }, [
    recentlyChangedCountries,
    isMapActive,
    showNewIndicator,
    forceNewVisible,
    percentageVisited,
  ]);

  // When provider flag catches up, stop forcing local visibility
  useEffect(() => {
    if (showNewIndicator && forceNewVisible) {
      setForceNewVisible(false);
    }
  }, [showNewIndicator, forceNewVisible]);

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

                    const translateX = (highResWidth - scaledContentWidth) / 2;
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
                  onCloseComplete={() => {
                    if (pendingTooltipRef.current) {
                      const next = pendingTooltipRef.current;
                      pendingTooltipRef.current = null;
                      setTooltip(next);
                    }
                  }}
                  popoverStyle={styles.popoverContainer}
                  arrowSize={{ width: 11.2, height: 11 }}
                  backgroundStyle={{ backgroundColor: "transparent" }}
                >
                  <Animated.View
                    style={[styles.popoverContent, animatedPopoverContentStyle]}
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
        {/* Dolna sekcja z paskiem postępu */}
        <Animated.View style={[styles.bottomSection, bottomTextAnimatedStyle]}>
          <ProgressBar
            percentage={percentageVisited}
            visited={visitedCountries}
            total={totalCountries}
            isDarkTheme={isDarkTheme}
          />
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
          {/* uproszczone: usunięto dodatkowe style *_Photo aby uniknąć duplikatów */}
          <View
            style={{
              position: "absolute",
              top: "4%",
              left: 0,
              right: 0,
              alignItems: "center",
            }}
          >
            <FastImage
              source={
                typeof logoImage === "number"
                  ? logoImage
                  : { uri: Image.resolveAssetSource(logoImage).uri }
              }
              style={{ width: "20%", aspectRatio: 2 }}
              resizeMode={FastImage.resizeMode.contain}
            />
          </View>
          <View
            style={{
              flex: 1,
              marginTop: "10%",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              height: "100%",
            }}
          >
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
          <View
            style={{
              justifyContent: "center",
              alignItems: "center",
              position: "absolute",
              bottom: "3%",
              left: 0,
              right: 0,
            }}
          >
            <ProgressBar
              percentage={percentageVisited}
              visited={visitedCountries}
              total={totalCountries}
              isDarkTheme={isDarkTheme}
              animated={false}
            />
          </View>
        </View>
        {/* Kontener przycisków */}
        <Animated.View
          style={[styles.buttonContainer, buttonContainerAnimatedStyle]}
        >
          {/* Warstwa "New" zawsze montowana - sterujemy tylko opacity */}
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              styles.centeredContent,
              newContainerAnimatedStyle,
              // Ensure this overlay is always visually on top on Android
              { zIndex: 2, elevation: 2 },
              // If indicator flag is true, force immediate visibility to avoid any paused-animation edge cases
              showNewIndicator || forceNewVisible
                ? { opacity: 1, transform: [{ scale: 1 }] }
                : null,
            ]}
            pointerEvents={
              showNewIndicator || forceNewVisible ? "box-none" : "none"
            }
          >
            <NewOverlay
              visible={showNewIndicator || forceNewVisible}
              isDarkTheme={isDarkTheme}
              isMapActive={isMapActive}
              updateSequence={updateSequence}
              onPressNew={handlePressNew}
            />
          </Animated.View>

          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              styles.centeredContent,
              regularButtonsAnimatedStyle,
              { zIndex: 1, elevation: 1 },
              showNewIndicator ? { opacity: 0 } : null,
            ]}
            pointerEvents={showNewIndicator ? "none" : "auto"}
          >
            <FloatingActionMenu
              scale={scale}
              isDarkTheme={isDarkTheme}
              onZoomOut={resetMap}
              onShare={shareMap}
              onToggleTheme={handleToggleTheme}
              isSharing={isSharing}
              disabled={!!(showNewIndicator || forceNewVisible)}
              isMapActive={isMapActive}
            />
          </Animated.View>
        </Animated.View>
      </View>
    </GestureHandlerRootView>
  );
});
// Custom comparison function for React.memo
const areInteractiveMapPropsEqual = (
  prevProps: InteractiveMapProps,
  nextProps: InteractiveMapProps
): boolean => {
  // Since coloring now derives from context (visitedCount + diffs), we only need to compare length for legacy prop
  const selectedCountriesEqual =
    prevProps.selectedCountries.length === nextProps.selectedCountries.length;
  const totalCountriesEqual =
    prevProps.totalCountries === nextProps.totalCountries;
  const onCountryPressEqual =
    prevProps.onCountryPress === nextProps.onCountryPress;
  const styleEqual = prevProps.style === nextProps.style;
  return (
    selectedCountriesEqual &&
    totalCountriesEqual &&
    onCountryPressEqual &&
    styleEqual
  );
};

// Export the memoized component
export default React.memo(InteractiveMapComponent, areInteractiveMapPropsEqual);
const styles = ScaledSheet.create({
  container: {
    flex: 1,
  },
  fullViewContainer: {
    flex: 1,
    justifyContent: "space-between",
    // padding: 2,
  },
  topSection: {
    top: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  bottomSection: {
    justifyContent: "center",
    alignItems: "center",
    bottom: "2.8%",
  },
  logoTextImage: {
    width: "16%",
    height: undefined,
    aspectRatio: 3,
  },
  popoverContainer: {
    backgroundColor: "rgba(0, 0, 0, 0.77)",
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
  mapContainer: {
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    height: "100%",
  },
  // Usunięto *_Photo style definitions aby uniknąć duplikatów / nieużywanych referencji
  baseMapContainer: {
    position: "absolute",
    top: -9999,
    left: -9999,
    width: screenWidth,
    height: screenWidth * (16 / 9),
    pointerEvents: "none",
  },
  buttonContainer: {
    position: "absolute",
    bottom: "50@ms0.5",
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    height: BUTTON_SIZE,
    width: "100%",
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
  centeredContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  newButtonWrapper: {
    width: BUTTON_SIZE * 2.2,
    height: BUTTON_SIZE * 1.05,
    borderRadius: BUTTON_SIZE / 2,
    justifyContent: "center",
    alignItems: "center",
  },
  newButtonBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: BUTTON_SIZE / 2,
    padding: 2.3,
    justifyContent: "center",
    alignItems: "center",
  },
  newButtonInner: {
    flex: 1,
    width: "100%",
    borderRadius: BUTTON_SIZE / 2,
    // backgroundColor moved to dynamic runtime style (dark/light)
    justifyContent: "center",
    alignItems: "center",
  },
  newButton: {
    width: BUTTON_SIZE * 2.4,
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
  newButtonText: {
    fontSize: ICON_SIZE,
    fontWeight: "500",
  },
});
