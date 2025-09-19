import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from "react-native";

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

const styles = StyleSheet.create({
  container: {
    width: "100%",
    alignItems: "center",
    paddingVertical: 16,
  },
  text: {
    color: "#D1D5DB",
    fontSize: 13,
    fontFamily: "PlusJakartaSans-Regular",
  },
  link: {
    color: "#FFFFFF",
    fontFamily: "PlusJakartaSans-SemiBold",
  },
});

export default AuthFooter;
