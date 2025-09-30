import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Pressable,
} from "react-native";
import { ScaledSheet } from "react-native-size-matters";

const { width, height } = Dimensions.get("window");

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
  onCreateAccount: () => void;
};

const AuthFooter = React.memo(function AuthFooter({ onCreateAccount }: Props) {
  const [isPressed, setIsPressed] = useState(false);
  const textScale = getTextScale();
  const fontSize = 12.7 * textScale;

  return (
    <View style={styles.container}>
      <Pressable
        onPress={onCreateAccount}
        style={styles.pressableContainer}
        onPressIn={() => setIsPressed(true)}
        onPressOut={() => setIsPressed(false)}
      >
        <Text style={[styles.text, { fontSize }]}>
          Don't have an account?{" "}
          <Text style={[styles.link, isPressed && styles.linkPressed]}>
            Create account
          </Text>
        </Text>
      </Pressable>
    </View>
  );
});

const styles = ScaledSheet.create({
  container: {
    width: "100%",
    alignItems: "center",
    paddingBottom: "14.6@vs",
  },
  pressableContainer: {
    alignItems: "center",
    paddingTop: "16@vs",
    paddingHorizontal: "16@s",
  },
  text: {
    color: "#D1D5DB",
    fontSize: "12.7@ms",
    fontFamily: "PlusJakartaSans-Regular",
    textAlign: "center",
  },
  link: {
    color: "#FFFFFF",
    fontFamily: "PlusJakartaSans-SemiBold",
  },
  linkPressed: {
    color: "#B8B8B8",
  },
});

export default AuthFooter;
