import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Image,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { ScaledSheet } from "react-native-size-matters";

const { width, height } = Dimensions.get("window");

// Clamp UI scale so elements don't grow too much on large displays
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
    return Math.max(0.92, Math.min(rawScale, 0.98)); // Much higher minimum for small screens
  }

  return Math.max(0.98, Math.min(rawScale, 1.15)); // Higher maximum for large screens
};

// More moderate scaling for text elements
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

type Props = {
  onContinueWithFacebook: () => void;
};

const SocialAuthRow = React.memo(function SocialAuthRow({
  onContinueWithFacebook,
}: Props) {
  const uiScale = getClampedUiScale();
  const textScale = getTextScale();
  const circleSize = Math.round(54.5 * uiScale);
  const iconSize = Math.round(24 * uiScale);
  const imageSize = Math.round(22.5 * uiScale);
  const separatorFontSize = 11.6 * textScale;

  return (
    <View style={styles.wrapper}>
      <View style={styles.separatorRow}>
        <View style={styles.separator} />
        <Text style={[styles.separatorText, { fontSize: separatorFontSize }]}>
          or continue with
        </Text>
        <View style={styles.separator} />
      </View>
      <View style={styles.row}>
        <TouchableOpacity
          style={[
            styles.circle,
            {
              width: circleSize,
              height: circleSize,
              borderRadius: circleSize / 2,
            },
          ]}
          onPress={onContinueWithFacebook}
        >
          <FontAwesome name="facebook" size={iconSize} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.circle,
            {
              width: circleSize,
              height: circleSize,
              borderRadius: circleSize / 2,
            },
          ]}
          onPress={() => {
            /* placeholder only */
          }}
        >
          <Image
            source={require("../../assets/icons/Google_Symbol_1.png")}
            style={[styles.iconImage, { width: imageSize, height: imageSize }]}
            resizeMode="contain"
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.circle,
            {
              width: circleSize,
              height: circleSize,
              borderRadius: circleSize / 2,
            },
          ]}
          onPress={() => {
            /* placeholder only */
          }}
        >
          <Image
            source={require("../../assets/icons/X_idJxGuURW1_1.png")}
            style={[styles.iconImage, { width: imageSize, height: imageSize }]}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </View>
    </View>
  );
});

const styles = ScaledSheet.create({
  wrapper: {
    marginTop: "14@vs",
  },
  separatorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: "12@s",
    width: width * 0.9,
    alignSelf: "center",
  },
  separator: {
    flex: 1,
    height: "0.8@s",
    backgroundColor: "rgba(246, 246, 246, 0.31)",
  },
  separatorText: {
    color: "#D1D5DB",
    fontSize: "11.6@ms",
    fontFamily: "PlusJakartaSans-Regular",
  },
  row: {
    flexDirection: "row",
    justifyContent: "center",
    gap: "11.6@s",
    marginTop: "14.3@vs",
  },
  circle: {
    width: "54.5@s",
    height: "54.5@s",
    borderRadius: "28@s",
    borderWidth: "0.7@s",
    borderColor: "rgba(156,163,175,0.3)",
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconImage: {
    width: "22.5@s",
    height: "22.5@s",
  },
});

export default SocialAuthRow;
