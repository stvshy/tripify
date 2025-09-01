import React, { useEffect, useMemo } from "react";
import { Dimensions, StyleSheet, TouchableOpacity, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  withDelay,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
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
};

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
const BUTTON_SIZE = Math.min(screenWidth, screenHeight) * 0.08;
const ICON_SIZE = BUTTON_SIZE * 0.5;
const MORPH_DURATION = 380; // centralize to sync confetti delay

// Confetti origin tuning (mirrors InteractiveMap defaults)
const CONFETTI_SHIFT_X_RATIO = 0.12;
const CONFETTI_ORIGIN_Y_RATIO = 2.06;
const FALLBACK_ORIGIN = { x: screenWidth / 2, y: screenHeight * 0.08 };

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
}) => {
  const theme = useTheme();

  // Morph progress 0..1: from menu-like circle to New pill
  const morphProgress = useSharedValue(0);

  // Scale pop for "New" button (runs after morph finishes)
  const newButtonScale = useSharedValue(1);
  const newButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: newButtonScale.value }],
  }));

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
  const innerGradientRevealStyle = useAnimatedStyle(() => ({ opacity: 1 }));
  // Text stays invisible for the first ~15% of morph, then fades in to 1
  const textOpacityStyle = useAnimatedStyle(() => {
    const start = 0.15; // delay before showing text
    const p = morphProgress.value;
    const opacity = Math.max(0, Math.min(1, (p - start) / (1 - start)));
    return { opacity } as const;
  });

  // Overlay that covers inner gradient, like original inner fill
  // Target alpha mirrors earlier parity: dark ~0.16, light ~0.86
  const TARGET_OVERLAY_ALPHA_DARK = 0.16;
  const TARGET_OVERLAY_ALPHA_LIGHT = 0.86;
  const overlayOpacity = useSharedValue(
    isDarkTheme ? TARGET_OVERLAY_ALPHA_DARK : TARGET_OVERLAY_ALPHA_LIGHT
  );
  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
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

  const restartGradientMotion = () => {
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
  };

  // Kick morph, then pop + confetti once morph completes
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    if (visible) {
      // reset
      try {
        cancelAnimation(morphProgress);
        cancelAnimation(overlayOpacity);
      } catch {}
      morphProgress.value = 0;
      newButtonScale.value = 1;
      // Start fully covering, then decrease to target during widening
      overlayOpacity.value = 1;
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
      });
      // after morph completes, do pop (confetti is now auto-started via delay)
      t = setTimeout(() => {
        newButtonScale.value = withSequence(
          withTiming(1.1, { duration: 110, easing: Easing.out(Easing.ease) }),
          withTiming(1.0, { duration: 140, easing: Easing.out(Easing.ease) })
        );
      }, MORPH_DURATION);
    } else {
      // reset when hidden
      morphProgress.value = 0;
      newButtonScale.value = 1;
    }
    return () => {
      if (t) clearTimeout(t);
    };
  }, [visible, updateSequence]);

  useEffect(() => {
    if (visible) {
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

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        styles.centeredContent,
        { zIndex: 2, elevation: 2 },
        visible ? { opacity: 1, transform: [{ scale: 1 }] } : { opacity: 0 },
      ]}
      pointerEvents={visible ? "box-none" : "none"}
    >
      {/* Confetti below the button */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          bottom: -15.5,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {visible ? (
          <ConfettiCannon
            key={`confetti-${updateSequence}-${isMapActive ? 1 : 0}-${visible ? 1 : 0}`}
            count={140}
            origin={confettiOrigin}
            colors={[
              "#00AEF5",
              theme.colors.primary,
              "#2bc3ffff",
              "#d400d4ff",
              "#7ecc61",
            ]}
            fadeOut
            autoStart
            autoStartDelay={MORPH_DURATION}
            explosionSpeed={700}
            fallSpeed={2400}
          />
        ) : null}
      </View>

      {/* Morphing New button */}
      <Animated.View style={[newButtonAnimatedStyle, frameStyle]}>
        <TouchableOpacity
          style={[styles.newButtonWrapper, { width: "100%", height: "100%" }]}
          activeOpacity={0.85}
          onPress={onPressNew}
        >
          {/* Hit shape */}
          <Animated.View style={[StyleSheet.absoluteFill, borderRadiusStyle]} />

          {/* Outer border with moving gradient */}
          <Animated.View style={[styles.newButtonBorder, borderRadiusStyle]}>
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
                style={[
                  {
                    position: "absolute",
                    left: -(BUTTON_SIZE * 3.8),
                    top: -(BUTTON_SIZE * 0.8),
                    height: BUTTON_SIZE * 2.6,
                    width: BUTTON_SIZE * 7.6,
                  },
                  movingBorderStyle,
                ]}
              >
                <LinearGradient
                  colors={[
                    theme.colors.primary,
                    "#00AEF5",
                    theme.colors.primary,
                  ]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={{ flex: 1 }}
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
                  style={[
                    {
                      position: "absolute",
                      left: -(BUTTON_SIZE * 3.8),
                      top: -(BUTTON_SIZE * 0.8),
                      height: BUTTON_SIZE * 2.6,
                      width: BUTTON_SIZE * 7.6,
                    },
                    movingBorderStyle,
                  ]}
                >
                  <LinearGradient
                    colors={[
                      theme.colors.primary,
                      "#00AEF5",
                      theme.colors.primary,
                    ]}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={{ flex: 1 }}
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
                  { backgroundColor: isDarkTheme ? "#000" : "#fff" },
                ]}
              />
              {/* Label */}
              <Animated.Text
                style={[
                  styles.newButtonText,
                  {
                    color: isDarkTheme
                      ? "rgb(198, 145, 254)"
                      : theme.colors.primary,
                  },
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
