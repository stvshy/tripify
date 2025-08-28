import React, { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
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

const NewOverlay: React.FC<Props> = ({ visible, isDarkTheme, isMapActive, updateSequence, onPressNew }) => {
  const theme = useTheme();

  // Scale pop for "New" button
  const newButtonScale = useSharedValue(1);
  const newButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: newButtonScale.value }],
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
      withTiming(travelX, { duration: durationX, easing: Easing.inOut(Easing.quad) }),
      -1,
      true
    );
    borderShiftY.value = withRepeat(
      withTiming(travelY, { duration: durationY, easing: Easing.inOut(Easing.quad) }),
      -1,
      true
    );
  };

  // Kick animations as soon as overlay is visible
  useLayoutEffect(() => {
    if (!visible) return;
    newButtonScale.value = 1;
    newButtonScale.value = withSequence(
      withTiming(1.1, { duration: 90, easing: Easing.out(Easing.ease) }),
      withTiming(1.0, { duration: 110, easing: Easing.out(Easing.ease) })
    );
  }, [visible]);

  useEffect(() => {
    if (visible && isMapActive) restartGradientMotion();
  }, [visible, isMapActive]);

  // Confetti control
  const confettiRef = useRef<ConfettiCannon>(null);

  useLayoutEffect(() => {
    if (!visible) return;
    try {
      confettiRef.current?.start();
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, updateSequence]);

  const confettiOrigin = useMemo(() => computeConfettiOrigin() || FALLBACK_ORIGIN, [updateSequence]);

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
            ref={confettiRef}
            count={140}
            origin={confettiOrigin}
            colors={["#00AEF5", theme.colors.primary, "#2bc3ffff", "#d400d4ff", "#7ecc61"]}
            fadeOut
            autoStart={false}
            autoStartDelay={0}
            explosionSpeed={700}
            fallSpeed={2400}
          />
        ) : null}
      </View>

      <Animated.View style={newButtonAnimatedStyle}>
        <TouchableOpacity style={styles.newButtonWrapper} activeOpacity={0.85} onPress={onPressNew}>
          <View style={styles.newButtonBorder}>
            {/* Static base stroke to avoid any perceived gap */}
            <View
              style={{
                ...StyleSheet.absoluteFillObject,
                borderRadius: BUTTON_SIZE / 2,
                borderWidth: 1.9,
                borderColor: theme.colors.primary,
              }}
            />
            {/* Animated gradient border */}
            <Animated.View
              style={{
                ...StyleSheet.absoluteFillObject,
                overflow: "hidden",
                borderRadius: BUTTON_SIZE / 2,
              }}
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
                  colors={[theme.colors.primary, "#00AEF5", theme.colors.primary]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={{ flex: 1 }}
                />
              </Animated.View>
            </Animated.View>

            <View
              style={[
                styles.newButtonInner,
                {
                  backgroundColor: isDarkTheme ? "rgba(0, 0, 0, 0.16)" : "rgba(255, 255, 255, 0.86)",
                },
              ]}
            >
              <Text
                style={[
                  styles.newButtonText,
                  { color: isDarkTheme ? "rgb(198, 145, 254)" : theme.colors.primary },
                ]}
              >
                New
              </Text>
            </View>
          </View>
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
