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

const { width } = Dimensions.get("window");

type Props = {
  onCreateAccount: () => void;
};

const AuthFooter = React.memo(function AuthFooter({ onCreateAccount }: Props) {
  const [isPressed, setIsPressed] = useState(false);

  return (
    <View style={styles.container}>
      <Pressable
        onPress={onCreateAccount}
        style={styles.pressableContainer}
        onPressIn={() => setIsPressed(true)}
        onPressOut={() => setIsPressed(false)}
      >
        <Text style={styles.text}>
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
