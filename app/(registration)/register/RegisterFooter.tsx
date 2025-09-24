import React, { useState } from "react";
import { View, Text, StyleSheet, Dimensions, Pressable } from "react-native";
import { ScaledSheet, vs } from "react-native-size-matters";

const { width, height } = Dimensions.get("window");

// Progressive responsive scaling for button
const getResponsiveButtonScaling = () => {
  const screenRatio = height / width;

  // Base values for standard screens (around 2400x1080, ratio ~2.22)
  const baseButtonHeight = vs(42.6);
  const baseButtonWidth = width * 0.9;

  // Calculate scaling factors
  let heightScale = 1;

  // Progressive scaling based on screen ratio
  if (screenRatio > 2.4) {
    // Very tall screens - reduce button height
    heightScale = 0.85;
  } else if (screenRatio > 2.3) {
    // Tall screens - slight reduction
    heightScale = 0.9;
  } else if (screenRatio > 2.2) {
    // Moderately tall screens - minimal reduction
    heightScale = 0.94;
  } else if (screenRatio < 1.8) {
    // Short screens - increase height
    heightScale = 1.1;
  } else if (screenRatio < 1.9) {
    // Moderately short screens
    heightScale = 1.05;
  } else if (screenRatio < 2.0) {
    // Slightly short screens
    heightScale = 1.02;
  }

  return {
    buttonHeight: baseButtonHeight * heightScale,
    buttonWidth: baseButtonWidth,
  };
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

  return (
    <View style={styles.footer}>
      <Pressable
        onPress={onSubmit}
        style={({ pressed }) => [
          styles.registerButton,
          {
            height: responsiveScaling.buttonHeight,
            width: responsiveScaling.buttonWidth,
            opacity: isLoading ? 0.7 : pressed ? 0.8 : 1,
            transform: [{ scale: pressed ? 0.98 : 1 }],
          },
        ]}
        disabled={isLoading}
      >
        <Text style={styles.registerButtonText}>Create account</Text>
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
