import React, {
  useEffect,
  useMemo,
  useCallback,
  useState,
  useRef,
  useLayoutEffect,
} from "react";
import {
  Dimensions,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  withDelay,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  runOnJS,
  useAnimatedReaction,
  runOnUI,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import ConfettiCannon from "react-native-confetti-cannon";
import { useTheme } from "react-native-paper";
import OptimizedConfetti, {
  OptimizedConfettiRef,
} from "./PerformanceOptimizedConfetti";

type Props = {
  visible: boolean;
  isDarkTheme: boolean;
  isMapActive: boolean;
  updateSequence: number; // used to remount confetti for exact timing
  onPressNew: () => void;
  onReverseComplete?: () => void;
};

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
const BUTTON_SIZE = Math.min(screenWidth, screenHeight) * 0.08;
const ICON_SIZE = BUTTON_SIZE * 0.5;
const MORPH_DURATION = 280; // Ultra-fast morphing for instant response
const COLLAPSE_DURATION = 300; // Increased duration for complete animation
const COLLAPSE_TARGET = 0; // collapse to a perfect circle

// Confetti origin tuning (mirrors InteractiveMap defaults)
const CONFETTI_SHIFT_X_RATIO = 0.12;
const CONFETTI_ORIGIN_Y_RATIO = 2.06;
const FALLBACK_ORIGIN = { x: screenWidth / 2, y: screenHeight * 0.08 };
const BORDER_RADIUS = BUTTON_SIZE / 2;
const GRADIENT_PLANE_BASE_STYLE = {
  position: "absolute" as const,
  left: -(BUTTON_SIZE * 3.8),
  top: -(BUTTON_SIZE * 0.8),
  height: BUTTON_SIZE * 2.6,
  width: BUTTON_SIZE * 7.6,
};

const CONFETTI_CONTAINER_STYLE: ViewStyle = {
  position: "absolute",
  left: 0,
  right: 0,
  top: 0,
  bottom: 0, // full-screen to match screen-based origin
  justifyContent: "center",
  alignItems: "center",
};

const FLEX_ONE = { flex: 1 } as const;

type ConfettiProps = {
  visible: boolean;
  origin: { x: number; y: number };
  colors: string[];
  updateSequence: number;
  isMapActive: boolean;
};

// Usunięto ConfettiWrapper - używamy teraz OptimizedConfetti

function computeConfettiOrigin() {
  const buttonWidth = BUTTON_SIZE * 2.2;
  const originX = screenWidth / 2 - buttonWidth * CONFETTI_SHIFT_X_RATIO;

  const containerBottomOffset = screenHeight * 0.08; // must match button container bottom in map
  const containerHeight = BUTTON_SIZE; // must match button container height
  const wrapperHeight = BUTTON_SIZE * 1.05; // must match styles.newButtonWrapper.height
  const wrapperTop =
    screenHeight -
    containerBottomOffset -
    containerHeight +
    (containerHeight - wrapperHeight) / 2;
  const anchorTopY = wrapperTop + wrapperHeight * CONFETTI_ORIGIN_Y_RATIO;
  const bottomFromScreen = Math.max(0, screenHeight - anchorTopY);

  return { x: originX, y: bottomFromScreen };
}

const NewOverlay: React.FC<Props> = ({
  visible,
  isDarkTheme,
  isMapActive,
  updateSequence,
  onPressNew,
  onReverseComplete,
}) => {
  const theme = useTheme();
  const prevVisibleRef = useRef(visible);
  const confettiRef = useRef<OptimizedConfettiRef>(null);

  const [collapsing, setCollapsing] = useState(false);
  const [collapseStarted, setCollapseStarted] = useState(false);
  const effectiveVisible = visible || collapsing;

  const morphProgress = useSharedValue(0);
  const collapsingSV = useSharedValue(0);

  // Reset state when updateSequence changes (new user session)
  useEffect(() => {
    setCollapsing(false);
    setCollapseStarted(false);
    morphProgress.value = 0;
    collapsingSV.value = 0;
  }, [updateSequence]);

  const newButtonScale = useSharedValue(1);
  const newButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: newButtonScale.value }],
  }));

  const initialFrameBaseStyle = useMemo(
    () =>
      ({
        width: BUTTON_SIZE,
        height: BUTTON_SIZE,
        borderRadius: BORDER_RADIUS,
      }) as const,
    []
  );

  const frameStyle = useAnimatedStyle(() => {
    const w0 = BUTTON_SIZE;
    const h0 = BUTTON_SIZE;
    const w1 = BUTTON_SIZE * 2.2;
    const h1 = BUTTON_SIZE * 1.05;
    const w = w0 + (w1 - w0) * morphProgress.value;
    const h = h0 + (h1 - h0) * morphProgress.value;
    const r = BUTTON_SIZE / 2;
    return { width: w, height: h, borderRadius: r } as const;
  });
  const borderRadiusStyle = useAnimatedStyle(() => {
    const r = BUTTON_SIZE / 2;
    return { borderRadius: r } as const;
  });

  const innerGradientRevealStyle = useMemo(() => ({ opacity: 1 }) as const, []);

  const textOpacityStyle = useAnimatedStyle(() => {
    const p = morphProgress.value;
    if (collapsingSV.value) {
      // During collapse, fade out text immediately and smoothly
      const t = 1 - p;
      const smooth = t * t * (3 - 2 * t);
      const opacity = Math.max(0, 1 - smooth * 2); // Faster fade out during collapse
      return { opacity } as const;
    }
    const start = 0.28;
    const end = 0.92;
    let t = (p - start) / (end - start);
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const smooth = t * t * (3 - 2 * t);
    return { opacity: smooth } as const;
  });

  const TARGET_OVERLAY_ALPHA_DARK = 0.16;
  const TARGET_OVERLAY_ALPHA_LIGHT = 0.86;
  const overlayOpacity = useSharedValue(1);
  const overlayStyle = useAnimatedStyle(() => {
    if (collapsingSV.value) {
      const target = isDarkTheme
        ? TARGET_OVERLAY_ALPHA_DARK
        : TARGET_OVERLAY_ALPHA_LIGHT;
      const p = morphProgress.value;
      const opacity = target + (1 - target) * (1 - p);
      return { opacity } as const;
    }
    return { opacity: overlayOpacity.value } as const;
  });

  const confettiOpacity = useSharedValue(1);
  const confettiScale = useSharedValue(1);
  const confettiProgress = useSharedValue(0);
  const confettiWrapperAnimatedStyle = useAnimatedStyle(() => ({
    opacity: confettiOpacity.value,
    transform: [{ scale: confettiScale.value }],
  }));

  const borderShiftX = useSharedValue(0);
  const borderShiftY = useSharedValue(0);
  const movingBorderStyle = useAnimatedStyle(() => {
    const damp = 1;
    return {
      transform: [
        { translateX: borderShiftX.value * damp },
        { translateY: borderShiftY.value * damp },
      ],
    };
  });
  const restartGradientMotion = useCallback(() => {
    try {
      cancelAnimation(borderShiftX);
    } catch {}
    try {
      cancelAnimation(borderShiftY);
    } catch {}

    // ULTRA-FAST: Przyspieszone animacje gradientu dla błyskawicznego ruchu
    const travelX = BUTTON_SIZE * 1.6;
    const travelY = BUTTON_SIZE * 0.6;
    const durationX = 1800; // Ultra-fast gradient movement
    const durationY = 1600; // Ultra-fast gradient movement

    borderShiftX.value = -travelX;
    borderShiftY.value = -travelY;
    borderShiftX.value = withRepeat(
      withTiming(travelX, {
        duration: durationX,
        easing: Easing.inOut(Easing.ease), // Prostsze easing dla lepszej wydajności
      }),
      -1,
      true
    );
    borderShiftY.value = withRepeat(
      withTiming(travelY, {
        duration: durationY,
        easing: Easing.inOut(Easing.ease), // Prostsze easing dla lepszej wydajności
      }),
      -1,
      true
    );
  }, [borderShiftX, borderShiftY]);

  // PERFECT TIMING: Start confetti with precise delay using withDelay
  const startConfetti = useCallback(() => {
    try {
      confettiRef.current?.start();
    } catch (error) {
      console.log("Confetti start error:", error);
    }
  }, []);

  const startConfettiWithDelay = useCallback((delay: number) => {
    try {
      confettiRef.current?.startWithDelay(delay);
    } catch (error) {
      console.log("Confetti startWithDelay error:", error);
    }
  }, []);

  // Unified collapse starter (idempotent)
  const startCollapse = useCallback(() => {
    if (collapsing || collapseStarted) return;
    setCollapsing(true);
    setCollapseStarted(true);
    collapsingSV.value = 1;
    try {
      cancelAnimation(morphProgress);
      cancelAnimation(overlayOpacity);
      cancelAnimation(newButtonScale);
      cancelAnimation(borderShiftX);
      cancelAnimation(borderShiftY);
    } catch {}
    // ULTRA-FAST: Ultra-fast confetti fade out
    confettiOpacity.value = withTiming(0, {
      duration: 100, // Ultra-fast
      easing: Easing.out(Easing.ease),
    });
    confettiScale.value = withTiming(0.82, {
      duration: 120, // Ultra-fast
      easing: Easing.in(Easing.cubic),
    });
    // ULTRA-FAST: Stop gradient motion immediately
    borderShiftX.value = 0;
    borderShiftY.value = 0;
    morphProgress.value = withTiming(
      COLLAPSE_TARGET,
      {
        duration: COLLAPSE_DURATION,
        easing: Easing.inOut(Easing.cubic),
      },
      () => {
        // Ensure overlay stays fully opaque when switching back to non-collapsing branch
        overlayOpacity.value = 1;
        collapsingSV.value = 0;
        runOnJS(setCollapsing)(false);
        runOnJS(setCollapseStarted)(false);
        runOnJS(restartGradientMotion)();
        if (onReverseComplete) runOnJS(onReverseComplete)();
      }
    );
  }, [collapsing, collapseStarted, restartGradientMotion, onReverseComplete]);

  // Unified UI-thread sequence starter (worklet)
  const startNewOverlaySequence = useCallback(() => {
    "worklet";
    // Reset all shared values to initial state
    morphProgress.value = 0;
    newButtonScale.value = 1;
    overlayOpacity.value = 1;
    confettiOpacity.value = 1;
    confettiScale.value = 1;
    confettiProgress.value = 0;

    // Fire confetti shortly BEFORE the scale-up phase (which starts after morph)
    // Lead time ~60ms, skip early frames in Lottie to show visible burst immediately
    const CONFETTI_LEAD_MS = -110;
    const startFrame = 0.15; // start a bit into the animation for instant particles
    const confettiDuration = 850;
    const confettiSequence = withSequence(
      withTiming(startFrame, { duration: 0 }),
      withTiming(1, { duration: confettiDuration, easing: Easing.linear })
    );
    const delayMs = Math.max(0, MORPH_DURATION - CONFETTI_LEAD_MS);
    confettiProgress.value = withDelay(delayMs, confettiSequence);

    // Start morph/overlay now; scale will start after morph (MORPH_DURATION)
    morphProgress.value = withTiming(1, {
      duration: MORPH_DURATION,
      easing: Easing.out(Easing.cubic),
    });
    overlayOpacity.value = withTiming(
      isDarkTheme ? TARGET_OVERLAY_ALPHA_DARK : TARGET_OVERLAY_ALPHA_LIGHT,
      {
        duration: MORPH_DURATION,
        easing: Easing.out(Easing.cubic),
      }
    );
    // Button scale animation
    newButtonScale.value = withDelay(
      MORPH_DURATION,
      withSequence(
        withTiming(1.15, { duration: 80, easing: Easing.out(Easing.ease) }),
        withTiming(1.0, { duration: 120, easing: Easing.out(Easing.ease) })
      )
    );
  }, [isDarkTheme]);

  // ULTRA-FAST: Show animation with zero delays for instant response
  useEffect(() => {
    if (collapsing || collapseStarted) {
      prevVisibleRef.current = visible;
      return;
    }

    if (visible) {
      try {
        cancelAnimation(morphProgress);
        cancelAnimation(overlayOpacity);
        cancelAnimation(newButtonScale);
      } catch {}
      morphProgress.value = 0;
      newButtonScale.value = 1;
      overlayOpacity.value = 1;
      confettiOpacity.value = 1;
      confettiScale.value = 1;

      // Run entire sequence on UI thread for perfect sync
      runOnUI(startNewOverlaySequence)();
    } else {
      if (prevVisibleRef.current) {
        startCollapse();
      } else {
        try {
          cancelAnimation(morphProgress);
          cancelAnimation(overlayOpacity);
          cancelAnimation(newButtonScale);
        } catch {}
        morphProgress.value = 0;
        newButtonScale.value = 1;
        overlayOpacity.value = 1;
      }
    }

    prevVisibleRef.current = visible;
  }, [
    visible,
    isDarkTheme,
    collapsing,
    collapseStarted,
    startCollapse,
    startNewOverlaySequence,
  ]);

  useEffect(() => {
    // Keep gradient motion running during collapse to avoid visual jumps
    if (visible && !collapsing) {
      restartGradientMotion();
    } else if (!visible && !collapsing) {
      try {
        cancelAnimation(borderShiftX);
        cancelAnimation(borderShiftY);
      } catch {}
    }
    // During collapse, gradient motion is stopped immediately in startCollapse()
  }, [visible, collapsing, restartGradientMotion]);

  const confettiOrigin = useMemo(
    () => computeConfettiOrigin() || FALLBACK_ORIGIN,
    [updateSequence]
  );

  const gradientColors = useMemo(
    () => [theme.colors.primary, "#00AEF5", theme.colors.primary],
    [theme.colors.primary]
  );
  const confettiColors = useMemo(
    () => [
      "#00AEF5",
      theme.colors.primary,
      "#2bc3ffff",
      "#d400d4ff",
      "#7ecc61",
    ],
    [theme.colors.primary]
  );

  const labelColor = useMemo(
    () => (isDarkTheme ? "rgb(198, 145, 254)" : theme.colors.primary),
    [isDarkTheme, theme.colors.primary]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      try {
        cancelAnimation(borderShiftX);
        cancelAnimation(borderShiftY);
        cancelAnimation(morphProgress);
        cancelAnimation(overlayOpacity);
        cancelAnimation(newButtonScale);
      } catch {}
    };
  }, []);

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        styles.centeredContent,
        { zIndex: 2, elevation: 2 },
        effectiveVisible
          ? { opacity: 1, transform: [{ scale: 1 }] }
          : { opacity: 0 },
      ]}
      pointerEvents={effectiveVisible ? "box-none" : "none"}
    >
      {/* Confetti below the button */}
      <Animated.View
        pointerEvents="none"
        style={[CONFETTI_CONTAINER_STYLE, confettiWrapperAnimatedStyle]}
      >
        <OptimizedConfetti
          ref={confettiRef}
          visible={visible && !collapsing}
          origin={confettiOrigin}
          colors={confettiColors}
          updateSequence={updateSequence}
          isMapActive={isMapActive}
          progressSV={confettiProgress}
        />
      </Animated.View>

      {/* Morphing New button */}
      <Animated.View
        style={[initialFrameBaseStyle, newButtonAnimatedStyle, frameStyle]}
        renderToHardwareTextureAndroid
        needsOffscreenAlphaCompositing
        collapsable={false}
      >
        <TouchableOpacity
          style={[styles.newButtonWrapper, { width: "100%", height: "100%" }]}
          activeOpacity={0.85}
          onPress={() => {
            startCollapse();
            try {
              onPressNew();
            } catch {}
          }}
        >
          {/* Hit shape */}
          <Animated.View style={[StyleSheet.absoluteFill, borderRadiusStyle]} />

          {/* Outer border with moving gradient */}
          <Animated.View
            style={[styles.newButtonBorder, borderRadiusStyle]}
            renderToHardwareTextureAndroid
            needsOffscreenAlphaCompositing
            collapsable={false}
          >
            {/* Static base stroke */}
            <Animated.View
              style={[
                StyleSheet.absoluteFillObject,
                borderRadiusStyle,
                { borderWidth: 1.9, borderColor: theme.colors.primary },
              ]}
            />

            {/* Animated gradient border plane */}
            <Animated.View
              style={[
                StyleSheet.absoluteFillObject,
                { overflow: "hidden" },
                borderRadiusStyle,
              ]}
            >
              <Animated.View
                style={[GRADIENT_PLANE_BASE_STYLE, movingBorderStyle]}
                renderToHardwareTextureAndroid
                collapsable={false}
              >
                <LinearGradient
                  colors={gradientColors}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={FLEX_ONE}
                />
              </Animated.View>
            </Animated.View>

            {/* Inner content: menu-like gradient revealed from center, then covered */}
            <Animated.View
              style={[
                styles.newButtonInner,
                borderRadiusStyle,
                { backgroundColor: "transparent" },
              ]}
            >
              {/* Inner gradient fill: same moving gradient family as border, revealed via opacity during widening */}
              <Animated.View
                pointerEvents="none"
                style={[
                  StyleSheet.absoluteFill,
                  borderRadiusStyle,
                  { overflow: "hidden" },
                  innerGradientRevealStyle,
                ]}
              >
                <Animated.View
                  style={[GRADIENT_PLANE_BASE_STYLE, movingBorderStyle]}
                  renderToHardwareTextureAndroid
                  collapsable={false}
                >
                  <LinearGradient
                    colors={gradientColors}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={FLEX_ONE}
                  />
                </Animated.View>
              </Animated.View>
              {/* Cover layer to match original transparency over gradient */}
              <Animated.View
                pointerEvents="none"
                style={[
                  StyleSheet.absoluteFill,
                  borderRadiusStyle,
                  overlayStyle,
                  { backgroundColor: theme.colors.surface },
                ]}
                collapsable={false}
                renderToHardwareTextureAndroid
                needsOffscreenAlphaCompositing
              />
              {/* Label */}
              <Animated.Text
                style={[
                  styles.newButtonText,
                  { color: labelColor },
                  textOpacityStyle,
                ]}
              >
                New
              </Animated.Text>
            </Animated.View>
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
};

export default React.memo(NewOverlay);

const styles = StyleSheet.create({
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
    justifyContent: "center",
    alignItems: "center",
  },
  newButtonText: {
    fontSize: ICON_SIZE,
    fontWeight: "500",
  },
});
