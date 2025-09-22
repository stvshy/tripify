import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import { ScaledSheet } from "react-native-size-matters";

const { width } = Dimensions.get("window");

type Props = {
  onCreateAccount: () => void;
};

const AuthFooter = React.memo(function AuthFooter({ onCreateAccount }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        Don’t have an account?{" "}
        <Text onPress={onCreateAccount} style={styles.link}>
          Create account
        </Text>
      </Text>
    </View>
  );
});

const styles = ScaledSheet.create({
  container: {
    width: "100%",
    alignItems: "center",
    paddingVertical: "14.6@vs",
  },
  text: {
    color: "#D1D5DB",
    fontSize: "12.7@ms",
    fontFamily: "PlusJakartaSans-Regular",
  },
  link: {
    color: "#FFFFFF",
    fontFamily: "PlusJakartaSans-SemiBold",
  },
});

export default AuthFooter;
