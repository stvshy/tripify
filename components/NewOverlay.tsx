import React, { useEffect, useMemo, useCallback, useState } from "react";
import {
  Dimensions,
  StyleSheet,
  TouchableOpacity,
  View,
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
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import ConfettiCannon from "react-native-confetti-cannon";
import { useTheme } from "react-native-paper";

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
const MORPH_DURATION = 380; // centralize to sync confetti delay
const COLLAPSE_DURATION = 260; // quick, smooth reverse morph
// Stop reverse morph slightly above circle size to speed perceived transition (~102%)
const COLLAPSE_TARGET = 0.02 / 1.03; // (1.02-1.0)/(2.2-1.0) = 0.016666...

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

// Hoisted frequently-reused style objects
const CONFETTI_CONTAINER_STYLE: ViewStyle = {
  position: "absolute",
  left: 0,
  right: 0,
  top: 0,
  bottom: -15.5,
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

const ConfettiWrapper = React.memo(function ConfettiWrapper({
  visible,
  origin,
  colors,
  updateSequence,
  isMapActive,
}: ConfettiProps) {
  if (!visible) return null;
  return (
    <ConfettiCannon
      key={`confetti-${updateSequence}-${isMapActive ? 1 : 0}-${visible ? 1 : 0}`}
      count={140}
      origin={origin}
      colors={colors}
      fadeOut
      autoStart
      autoStartDelay={MORPH_DURATION}
      explosionSpeed={700}
      fallSpeed={2400}
    />
  );
});

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

  // Local collapsing state to play reverse morph even if parent hides us
  const [collapsing, setCollapsing] = useState(false);
  const effectiveVisible = visible || collapsing;

  // Morph progress 0..1: from menu-like circle to New pill
  const morphProgress = useSharedValue(0);
  // UI-thread collapse flag to drive derived opacity during reverse morph
  const collapsingSV = useSharedValue(0);

  // Scale pop for "New" button (runs after morph finishes)
  const newButtonScale = useSharedValue(1);
  const newButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: newButtonScale.value }],
  }));

  // Base initial frame to avoid a first-frame flash at full pill width
  const initialFrameBaseStyle = useMemo(
    () =>
      ({
        width: BUTTON_SIZE,
        height: BUTTON_SIZE,
        borderRadius: BORDER_RADIUS,
      }) as const,
    []
  );

  // Animated size/shape for morphing frame
  const frameStyle = useAnimatedStyle(() => {
    const w0 = BUTTON_SIZE;
    const h0 = BUTTON_SIZE;
    const w1 = BUTTON_SIZE * 2.2;
    const h1 = BUTTON_SIZE * 1.05;
    const w = w0 + (w1 - w0) * morphProgress.value;
    const h = h0 + (h1 - h0) * morphProgress.value;
    const r = BUTTON_SIZE / 2; // must match original button radius
    return { width: w, height: h, borderRadius: r } as const;
  });
  const borderRadiusStyle = useAnimatedStyle(() => {
    const r = BUTTON_SIZE / 2;
    return { borderRadius: r } as const;
  });

  // Inner gradient is present from the beginning; overlay controls perceived transparency
  // This is static (always opaque) — use a plain object to avoid an animated hook
  const innerGradientRevealStyle = useMemo(() => ({ opacity: 1 }) as const, []);
  // Text stays invisible initially, then eases in smoothly (delayed + smoothstep)
  const textOpacityStyle = useAnimatedStyle(() => {
    const p = morphProgress.value;
    const start = 0.28; // delay start a bit more to avoid early visibility
    const end = 0.92; // finish fade slightly before morph end
    let t = (p - start) / (end - start);
    // clamp 0..1
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    // smoothstep easing: t*t*(3 - 2*t) -> gentle start
    const smooth = t * t * (3 - 2 * t);
    return { opacity: smooth } as const;
  });

  // Overlay that covers inner gradient, like original inner fill
  // Target alpha mirrors earlier parity: dark ~0.16, light ~0.86
  const TARGET_OVERLAY_ALPHA_DARK = 0.16;
  const TARGET_OVERLAY_ALPHA_LIGHT = 0.86;
  // Start fully covered to avoid first-frame gradient peek; animate down to target
  const overlayOpacity = useSharedValue(1);
  const overlayStyle = useAnimatedStyle(() => {
    // During collapse drive opacity from morphProgress for perfect sync
    if (collapsingSV.value) {
      const target = isDarkTheme
        ? TARGET_OVERLAY_ALPHA_DARK
        : TARGET_OVERLAY_ALPHA_LIGHT;
      const p = morphProgress.value; // 0..1
      // Map p (1->0) to opacity (target->1)
      const opacity = target + (1 - target) * (1 - p);
      return { opacity } as const;
    }
    return { opacity: overlayOpacity.value } as const;
  });

  // Confetti quick fade/"suck-in" wrapper
  const confettiOpacity = useSharedValue(1);
  const confettiScale = useSharedValue(1);
  const confettiWrapperAnimatedStyle = useAnimatedStyle(() => ({
    opacity: confettiOpacity.value,
    transform: [{ scale: confettiScale.value }],
  }));

  // Animated moving gradient around the button
  const borderShiftX = useSharedValue(0);
  const borderShiftY = useSharedValue(0);
  const movingBorderStyle = useAnimatedStyle(() => {
    const damp = 1; // can tweak for slower/faster motion
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
      cancelAnimation(borderShiftY);
    } catch {}
    const travelX = BUTTON_SIZE * 1.6;
    const travelY = BUTTON_SIZE * 0.6;
    const durationX = 4200;
    const durationY = 3800;
    borderShiftX.value = -travelX;
    borderShiftY.value = -travelY;
    borderShiftX.value = withRepeat(
      withTiming(travelX, {
        duration: durationX,
        easing: Easing.inOut(Easing.quad),
      }),
      -1,
      true
    );
    borderShiftY.value = withRepeat(
      withTiming(travelY, {
        duration: durationY,
        easing: Easing.inOut(Easing.quad),
      }),
      -1,
      true
    );
  }, [borderShiftX, borderShiftY]);

  // Kick morph, then pop + confetti once morph completes
  useEffect(() => {
    if (collapsing) return; // Prevent interruption of collapse animation

    if (visible) {
      // If collapsing, ignore re-show triggers to avoid flicker/restart
      if (collapsing) return;
      // reset
      try {
        cancelAnimation(morphProgress);
        cancelAnimation(overlayOpacity);
        cancelAnimation(newButtonScale);
      } catch {}
      morphProgress.value = 0;
      newButtonScale.value = 1;
      // Start fully covering, then decrease to target during widening
      overlayOpacity.value = 1;
      // Reset confetti wrapper in case previous collapse faded it
      confettiOpacity.value = 1;
      confettiScale.value = 1;
      // start morph & overlay easing on next frame to avoid jumpy first frames
      requestAnimationFrame(() => {
        // start morph
        morphProgress.value = withDelay(
          16,
          withTiming(1, {
            duration: MORPH_DURATION,
            easing: Easing.out(Easing.cubic),
          })
        );
        // Decrease transparency to target to match original final state
        overlayOpacity.value = withDelay(
          16,
          withTiming(
            isDarkTheme
              ? TARGET_OVERLAY_ALPHA_DARK
              : TARGET_OVERLAY_ALPHA_LIGHT,
            {
              duration: MORPH_DURATION,
              easing: Easing.out(Easing.cubic),
            }
          )
        );
        // Schedule pop purely on UI thread to avoid JS timer jitter
        newButtonScale.value = withDelay(
          MORPH_DURATION,
          withSequence(
            withTiming(1.1, { duration: 110, easing: Easing.out(Easing.ease) }),
            withTiming(1.0, { duration: 140, easing: Easing.out(Easing.ease) })
          )
        );
      });
      // reset when hidden, but don't interrupt local reverse animation
      if (!collapsing) {
        morphProgress.value = 0;
        newButtonScale.value = 1;
        overlayOpacity.value = 1;
      }
    } else {
      // Ensure animated values are reset while hidden to avoid re-show at full width
      try {
        cancelAnimation(morphProgress);
        cancelAnimation(overlayOpacity);
        cancelAnimation(newButtonScale);
      } catch {}
      morphProgress.value = 0;
      newButtonScale.value = 1;
      overlayOpacity.value = 1;
    }
    return () => {};
  }, [visible, isDarkTheme, collapsing]);

  useEffect(() => {
    if (visible) {
      // Start immediately so gradient is moving from the very beginning
      restartGradientMotion();
    } else {
      try {
        cancelAnimation(borderShiftX);
        cancelAnimation(borderShiftY);
      } catch {}
    }
  }, [visible]);

  const confettiOrigin = useMemo(
    () => computeConfettiOrigin() || FALLBACK_ORIGIN,
    [updateSequence]
  );

  // Memoized colors to avoid re-alloc each render
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

  // Memoized theme-dependent style pieces to avoid per-render allocation
  const borderStrokeStyle = useMemo(
    () => ({ borderWidth: 1.9, borderColor: theme.colors.primary }),
    [theme.colors.primary]
  );
  const labelColor = useMemo(
    () => (isDarkTheme ? "rgb(198, 145, 254)" : theme.colors.primary),
    [isDarkTheme, theme.colors.primary]
  );

  // Cancel animations on unmount to avoid cross-screen lag if user navigates away mid-animation
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
        <ConfettiWrapper
          visible={effectiveVisible}
          origin={confettiOrigin}
          colors={confettiColors}
          updateSequence={updateSequence}
          isMapActive={isMapActive}
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
            // Start reverse morph immediately; independent from map/confetti removal
            if (!collapsing) {
              setCollapsing(true);
              // Stop any ongoing widen/pop animations to prevent jumps
              try {
                cancelAnimation(morphProgress);
                cancelAnimation(overlayOpacity);
                cancelAnimation(newButtonScale);
              } catch {}
              // Fade/suck confetti quickly
              confettiOpacity.value = withTiming(0, {
                duration: 140,
                easing: Easing.out(Easing.ease),
              });
              confettiScale.value = withTiming(0.82, {
                duration: 160,
                easing: Easing.in(Easing.cubic),
              });
              // Gradually cover inner gradient during collapse to match morph timing
              overlayOpacity.value = withTiming(1, {
                duration: 360,
                easing: Easing.inOut(Easing.cubic),
              });
              // Reverse morph to near-circle (stop slightly above 1.0 to accelerate hand-off)
              morphProgress.value = withTiming(
                COLLAPSE_TARGET,
                {
                  duration: 240,
                  easing: Easing.inOut(Easing.cubic),
                },
                () => {
                  // end of collapse on UI thread -> flip JS state safely
                  runOnJS(setCollapsing)(false);
                  // restart moving border after collapse completes for next show
                  runOnJS(restartGradientMotion)();
                  if (onReverseComplete) {
                    runOnJS(onReverseComplete)();
                  }
                }
              );
              // Let parent clear highlights/dismiss immediately (in parallel)
              try {
                onPressNew();
              } catch {}
            }
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
