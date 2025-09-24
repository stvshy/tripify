import React from "react";
import { View, Text, StyleSheet, Image, Dimensions } from "react-native";
import { ScaledSheet, vs } from "react-native-size-matters";

const { width, height } = Dimensions.get("window");

// Progressive responsive spacing for all screen ratios
const getResponsiveSpacing = () => {
  const screenRatio = height / width;

  // Base values for standard screens (around 2400x1080, ratio ~2.22)
  const baseLogoHeight = vs(118);
  const baseLogoMarginTop = vs(34.5);
  const baseLogoMarginBottom = vs(13);
  const baseErrorHolderMinHeight = vs(39.6);

  // Calculate scaling factors based on screen ratio
  let logoScale = 1;
  let marginScale = 1;

  // Progressive scaling based on screen ratio
  if (screenRatio > 2.4) {
    // Very tall screens (like 2992x1344) - moderate reduction with slight increase
    logoScale = 0.92; // Slightly larger than before
    marginScale = 0.75; // Reduced margins
  } else if (screenRatio > 2.3) {
    // Tall screens - slight reduction
    logoScale = 0.95;
    marginScale = 0.85;
  } else if (screenRatio > 2.2) {
    // Moderately tall screens - minimal reduction
    logoScale = 0.98;
    marginScale = 0.95;
  } else if (screenRatio < 1.8) {
    // Short screens - increase spacing
    logoScale = 0.95;
    marginScale = 1.15;
  } else if (screenRatio < 1.9) {
    // Moderately short screens
    logoScale = 0.98;
    marginScale = 1.08;
  } else if (screenRatio < 2.0) {
    // Slightly short screens
    logoScale = 1.0;
    marginScale = 1.05;
  }

  return {
    logoHeight: baseLogoHeight * logoScale,
    logoMarginTop: baseLogoMarginTop * marginScale,
    logoMarginBottom: baseLogoMarginBottom * marginScale,
    errorHolderMinHeight: baseErrorHolderMinHeight * marginScale,
  };
};

type Props = {
  title?: string;
  errorMessage?: string | null;
};

export default function RegisterHeader({
  title = "Create an Account in Tripify",
  errorMessage,
}: Props) {
  const responsiveSpacing = getResponsiveSpacing();

  // Debug info (remove in production)
  if (__DEV__) {
    console.log("Screen dimensions:", { width, height, ratio: height / width });
    console.log("Responsive spacing:", responsiveSpacing);
  }

  return (
    <>
      <View
        style={[
          styles.logoContainer,
          {
            marginTop: responsiveSpacing.logoMarginTop,
            marginBottom: responsiveSpacing.logoMarginBottom,
          },
        ]}
      >
        <Image
          source={require("../../../assets/images/tripify-icon.png")}
          style={[styles.logo, { height: responsiveSpacing.logoHeight }]}
          resizeMode="contain"
        />
      </View>
      <Text style={styles.title}>{title}</Text>
      <View
        style={[
          styles.errorHolder,
          {
            minHeight: responsiveSpacing.errorHolderMinHeight,
          },
        ]}
      >
        {errorMessage ? (
          <Text style={styles.errorText}>{errorMessage}</Text>
        ) : (
          <Text style={styles.subtitle}>
            E-mail verification will be required
          </Text>
        )}
      </View>
    </>
  );
}

const styles = ScaledSheet.create({
  logo: {
    // width: "40%",
    // height will be set dynamically
  },
  logoContainer: {
    justifyContent: "center",
    alignItems: "center",
    // marginBottom and marginTop will be set dynamically
    width: "100%",
    marginLeft: "-1.1@s",
  },
  title: {
    fontSize: "22.1@ms",
    fontFamily: "Figtree-Medium",
    textAlign: "center",
    color: "#FFFFFF",
    width: "100%",
  },
  errorHolder: {
    // minHeight will be set dynamically
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  errorText: {
    color: "#F472B6",
    marginBottom: "7.5@vs",
    fontSize: "13@ms",
    textAlign: "center",
    width: "90%",
    fontFamily: "PlusJakartaSans-Regular",
  },
  subtitle: {
    color: "#D1D5DB",
    marginBottom: "7.5@vs",
    fontSize: "13@ms",
    textAlign: "center",
    width: "90%",
    fontFamily: "PlusJakartaSans-Regular",
  },
});
