import React, { useState } from "react";
import { View, Text, StyleSheet, Dimensions, Pressable } from "react-native";
import { ScaledSheet, vs } from "react-native-size-matters";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";

const { width, height } = Dimensions.get("window");

// Simple responsive button metrics
const getResponsiveButtonScaling = () => {
  return {
    buttonHeight: hp("6.4%"),
    buttonWidth: wp("90%"),
  };
};

// Clamp UI scale so buttons/fonts don't overgrow on large displays
const getClampedUiScale = () => {
  const baseWidth = 375;
  const shortSide = Math.min(width, height);
  const rawScale = shortSide / baseWidth;

  // Calculate screen area ratio for more accurate small screen detection
  const currentArea = width * height;
  const baseArea = 375 * 812; // iPhone X baseline
  const areaRatio = Math.sqrt(currentArea / baseArea);

  // Use more aggressive scaling for very small screens
  if (areaRatio < 0.91) {
    return Math.max(0.75, Math.min(rawScale, 0.9)); // Much smaller minimum for tiny screens
  }

  return Math.max(0.9, Math.min(rawScale, 1.08));
};

type Props = {
  isLoading: boolean;
  onSubmit: () => void;
  onGoToLogin: () => void;
};

export default function RegisterFooter({
  isLoading,
  onSubmit,
  onGoToLogin,
}: Props) {
  const responsiveScaling = getResponsiveButtonScaling();
  const [isFooterPressed, setIsFooterPressed] = useState(false);
  const uiScale = getClampedUiScale();
  const buttonHeight = Math.round(49 * uiScale); // base 47dp, gently scaled
  const fontSize = 13.8 * uiScale;

  return (
    <View style={styles.footer}>
      <Pressable
        onPress={onSubmit}
        style={({ pressed }) => [
          styles.registerButton,
          {
            height: buttonHeight,
            width: responsiveScaling.buttonWidth,
            opacity: isLoading ? 0.7 : pressed ? 0.8 : 1,
            transform: [{ scale: pressed ? 0.98 : 1 }],
          },
        ]}
        disabled={isLoading}
      >
        <Text style={[styles.registerButtonText, { fontSize }]}>
          Create account
        </Text>
      </Pressable>

      <Pressable
        onPress={onGoToLogin}
        style={styles.authFooterContainer}
        onPressIn={() => setIsFooterPressed(true)}
        onPressOut={() => setIsFooterPressed(false)}
      >
        <Text style={styles.authFooterText}>
          Already have an account?{" "}
          <Text
            style={[
              styles.authFooterLink,
              isFooterPressed && styles.authFooterLinkPressed,
            ]}
          >
            Log in
          </Text>
        </Text>
      </Pressable>
    </View>
  );
}

const styles = ScaledSheet.create({
  footer: {
    width: "100%",
    alignItems: "center",
    paddingTop: "6.4@vs",
    paddingBottom: "23.4@vs",
  },
  registerButton: {
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 999,
    alignSelf: "center",
    // height and width will be set dynamically
  },
  registerButtonText: {
    fontSize: "13.8@ms",
    fontFamily: "PlusJakartaSans-SemiBold",
    color: "#4F21A5",
    textAlign: "center",
    includeFontPadding: false as unknown as boolean,
    textAlignVertical: "center",
    lineHeight: "15.8@ms",
    // marginTop: "-0.3@vs",
  },
  authFooterContainer: {
    width: "100%",
    alignItems: "center",
    paddingTop: "16@vs",
    // paddingBottom: 24,
  },
  authFooterText: {
    color: "#D1D5DB",
    fontSize: "12.8@ms",
    fontFamily: "PlusJakartaSans-Regular",
  },
  authFooterLink: {
    color: "#FFFFFF",
    fontFamily: "PlusJakartaSans-SemiBold",
  },
  authFooterLinkPressed: {
    color: "#B0B0B0",
  },
});
