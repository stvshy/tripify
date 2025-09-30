import React from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { s, ScaledSheet } from "react-native-size-matters";

const { width, height } = Dimensions.get("window");

// Clamp UI scale so elements don't grow too much on large screens
const getClampedUiScale = () => {
  const baseWidth = 375; // iPhone X width baseline
  const shortSide = Math.min(width, height);
  const rawScale = shortSide / baseWidth;

  // Calculate screen area ratio for more accurate small screen detection
  const currentArea = width * height;
  const baseArea = 375 * 812; // iPhone X baseline
  const areaRatio = Math.sqrt(currentArea / baseArea);

  // Use more aggressive scaling for very small screens
  if (areaRatio < 0.91) {
    return Math.max(0.92, Math.min(rawScale, 0.98)); // Much higher minimum for small screens
  }

  // Keep within [0.98, 1.15] to reduce extremes for normal screens
  return Math.max(0.98, Math.min(rawScale, 1.15));
};

// More moderate scaling for titles and subtitles
const getTextScale = () => {
  const baseWidth = 375;
  const baseHeight = 812; // iPhone X height baseline
  const shortSide = Math.min(width, height);
  const longSide = Math.max(width, height);

  // Calculate screen area ratio for more accurate detection
  const currentArea = width * height;
  const baseArea = baseWidth * baseHeight;
  const areaRatio = Math.sqrt(currentArea / baseArea);

  // Use more aggressive scaling for very small screens
  if (areaRatio < 0.91) {
    return Math.max(0.94, Math.min(areaRatio, 0.98)); // Much higher minimum for small screens
  }
  return Math.max(0.98, Math.min(areaRatio, 1.15)); // Higher maximum for large screens
};

interface LoginHeaderProps {
  errorMessage?: string | null;
  verificationMessage?: string | null;
}

const LoginHeader = React.memo(function LoginHeader({
  errorMessage,
  verificationMessage,
}: LoginHeaderProps) {
  const uiScale = getClampedUiScale();
  const textScale = getTextScale();
  const iconSize = Math.round(62 * uiScale);
  const titleFontSize = 22.8 * textScale;
  const subtitleFontSize = 13.5 * textScale;
  const errorFontSize = 13.5 * textScale;

  return (
    <View style={styles.container}>
      <Ionicons name="location" size={iconSize} color="#FFFFFF" />
      <Text style={[styles.title, { fontSize: titleFontSize }]}>
        Welcome to Tripify!
      </Text>
      <Text
        style={[
          styles.subtitle,
          errorMessage || verificationMessage ? styles.errorSubtitle : null,
          {
            fontSize:
              errorMessage || verificationMessage
                ? errorFontSize
                : subtitleFontSize,
          },
        ]}
      >
        {errorMessage ||
          verificationMessage ||
          "Sign in to map your journey and discover destinations"}
      </Text>
    </View>
  );
});

const styles = ScaledSheet.create({
  container: {
    alignItems: "center",
    gap: "9.2@vs",
    paddingTop: "7.2@vs",
  },
  title: {
    fontSize: "54.4@ms",
    fontFamily: "Figtree-SemiBold",
    color: "#FFFFFF",
    textAlign: "center",
    // letterSpacing: -0.2,
    marginTop: "5.3@vs",
    marginBottom: "0.2@vs",
  },
  subtitle: {
    marginTop: "2@vs",
    color: "#D1D5DB",
    fontSize: "13@ms",
    fontFamily: "PlusJakartaSans-Regular",
    textAlign: "center",
    maxWidth: width * 0.8,
    marginBottom: "6.7@vs",
    minHeight: "36@vs", // Stała wysokość żeby nie wpływać na layout
  },
  errorSubtitle: {
    color: "#F472B6",
    fontSize: "12.9@ms", // Mniejszy font jak wcześniej
    fontFamily: "PlusJakartaSans-Regular", // Regular zamiast Medium/Bold
    minHeight: "36@vs", // Ta sama wysokość co subtitle
  },
});

export default LoginHeader;
