import React, { useEffect, useMemo } from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "react-native-paper";
// Use expo-blur to match 'tint' and 'intensity' props used in existing code
import { BlurView } from "expo-blur";
import { scale, ScaledSheet } from "react-native-size-matters";

type Props = {
  percentage: number; // 0..1
  visited: number;
  total: number;
  isDarkTheme: boolean;
  animated?: boolean;
  width?: number;
};

const { width: screenWidth } = Dimensions.get("window");
const DEFAULT_WIDTH = scale(282);
const ProgressBar: React.FC<Props> = ({
  percentage,
  visited,
  total,
  isDarkTheme,
  animated = true,
  width = DEFAULT_WIDTH,
}) => {
  const theme = useTheme();

  // Colors and locations replicated from InteractiveMap
  const PINK_HEX = theme.colors.primary;
  const TURQUOISE_HEX = "#00AEF5";
  const gradientLocations = [0, 0.18, 0.5, 0.82, 1];

  const hexToRgba = (hex: string, alpha: number): string => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) {
      if (hex.toLowerCase().startsWith("rgba")) return hex;
      return `rgba(0,0,0,${alpha})`;
    }
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const gradientColorsBase = useMemo(
    () => [PINK_HEX, PINK_HEX, TURQUOISE_HEX, PINK_HEX, PINK_HEX],
    [PINK_HEX]
  );
  const filledGradientColors = useMemo(
    () => gradientColorsBase.map((c) => hexToRgba(c, 1)),
    [gradientColorsBase]
  );
  const backgroundGradientColors = useMemo(
    () => gradientColorsBase.map((c) => hexToRgba(c, 0.25)),
    [gradientColorsBase]
  );

  // Animated width for the filled part
  const progressSV = useSharedValue(percentage);
  useEffect(() => {
    if (animated) {
      progressSV.value = withTiming(percentage, {
        duration: 1500,
        easing: Easing.inOut(Easing.cubic),
      });
    } else {
      // jump immediately
      progressSV.value = percentage;
    }
  }, [percentage, animated]);

  const fillStyle = useAnimatedStyle(() => {
    const p = Math.max(0, Math.min(1, progressSV.value));
    return { width: p * width };
  });

  return (
    <View style={[styles.wrapper, { width }]}>
      {/* Background gradient across full bar */}
      <LinearGradient
        colors={backgroundGradientColors}
        locations={gradientLocations}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Clipped container with animated width */}
      <Animated.View
        style={[{ height: "100%", overflow: "hidden" }, fillStyle]}
      >
        <LinearGradient
          colors={filledGradientColors}
          locations={gradientLocations}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={{ width, height: "100%" }}
        />
        {!isDarkTheme ? (
          <BlurView
            style={StyleSheet.absoluteFillObject}
            tint="light"
            intensity={23}
          />
        ) : (
          <BlurView
            style={StyleSheet.absoluteFillObject}
            tint="dark"
            intensity={8}
          />
        )}
      </Animated.View>

      {/* Text overlays */}
      <View style={styles.textLeft} pointerEvents="none">
        <Animated.Text style={[styles.text, { color: theme.colors.onSurface }]}>
          {(percentage * 100).toFixed(1)}%
        </Animated.Text>
      </View>
      <View style={styles.textRight} pointerEvents="none">
        <Animated.Text style={[styles.text, { color: theme.colors.onSurface }]}>
          {visited}/{total}
        </Animated.Text>
      </View>
    </View>
  );
};

export default React.memo(ProgressBar);

const styles = ScaledSheet.create({
  wrapper: {
    height: "18.8@mvs0.5",
    position: "relative",
    justifyContent: "center",
    overflow: "hidden",
    borderRadius: "14@ms",
  },
  textLeft: {
    position: "absolute",
    left: "10@ms",
    top: 0,
    bottom: 0,
    justifyContent: "center",
    zIndex: 1,
  },
  textRight: {
    position: "absolute",
    right: "10@ms",
    top: 0,
    bottom: 0,
    justifyContent: "center",
    zIndex: 1,
  },
  text: {
    fontSize: "12@ms0.3",
    fontFamily: "DMSans-SemiBold",
  },
});
