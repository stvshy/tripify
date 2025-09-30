import React, { memo } from "react";
import { View, Text, StyleSheet, Image, Dimensions } from "react-native";
import {
  moderateScale,
  scale,
  ScaledSheet,
  vs,
} from "react-native-size-matters";
import { heightPercentageToDP as hp } from "react-native-responsive-screen";

const { width, height } = Dimensions.get("window");

// Custom scaling only for logo top margin – increases on taller screens
const getLogoTopMargin = () => {
  const ratio = height / width;
  const extra = Math.max(0, ratio - 2.0); // start increasing above ~2.0 ratio
  const percent = Math.min(4 + extra * 4, 10); // base 4% + 4% per extra ratio, clamp 10%
  return hp(`${percent}%`);
};

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
    return Math.max(0.75, Math.min(rawScale, 0.9)); // Much smaller minimum for tiny screens
  }

  // Keep within [0.9, 1.08] to reduce extremes for normal screens
  return Math.max(0.9, Math.min(rawScale, 1.08));
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

  // Debug logging
  if (__DEV__) {
    console.log(
      `Screen: ${width}x${height}, Area: ${currentArea}, Base Area: ${baseArea}, Area Ratio: ${areaRatio.toFixed(3)}`
    );
  }

  // Use area ratio for more precise small screen detection
  // Based on actual Android values: 0.924 and 0.905 are small screens
  if (areaRatio < 0.91) {
    return Math.max(0.7, Math.min(areaRatio, 0.85)); // Much smaller minimum for tiny screens
  }
  return Math.max(0.92, Math.min(areaRatio, 1.12));
};

type Props = {
  title?: string;
  errorMessage?: string | null;
};

export default memo(function RegisterHeader({
  title = "Create an Account in Tripify",
  errorMessage,
}: Props) {
  const logoTopMargin = getLogoTopMargin();
  const uiScale = getClampedUiScale();
  const textScale = getTextScale();
  const logoHeight = Math.round(142 * uiScale); // base ~140dp, gently scaled
  const titleFontSize = 23.0 * textScale; // slightly increased base size
  const subtitleFontSize = 13.8 * textScale; // slightly increased base size
  const errorFontSize = 13.8 * textScale;

  return (
    <>
      <View
        style={[
          styles.logoContainer,
          {
            marginTop: logoTopMargin,
            marginBottom: hp("1.6%"),
          },
        ]}
      >
        <Image
          source={require("../../../assets/images/tripify-icon.png")}
          style={[styles.logo, { height: logoHeight }]}
          resizeMode="contain"
        />
      </View>
      <Text style={[styles.title, { fontSize: titleFontSize }]}>{title}</Text>
      <View
        style={[
          styles.errorHolder,
          {
            minHeight: scale(36.8),
          },
        ]}
      >
        {errorMessage ? (
          <Text style={[styles.errorText, { fontSize: errorFontSize }]}>
            {errorMessage}
          </Text>
        ) : (
          <Text style={[styles.subtitle, { fontSize: subtitleFontSize }]}>
            E-mail verification will be required
          </Text>
        )}
      </View>
    </>
  );
});

const styles = ScaledSheet.create({
  logo: {
    // height will be set dynamically
  },
  logoContainer: {
    justifyContent: "center",
    alignItems: "center",
    // marginBottom and marginTop will be set dynamically
    width: "100%",
    marginLeft: "-1.5@s",
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
    fontSize: "13.3@ms",
    textAlign: "center",
    width: "90%",
    fontFamily: "PlusJakartaSans-Regular",
  },
});
