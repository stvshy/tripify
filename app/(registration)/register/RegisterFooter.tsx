import React from "react";
import { View, Text, StyleSheet, Dimensions, Pressable } from "react-native";
import { ScaledSheet } from "react-native-size-matters";

const { width } = Dimensions.get("window");

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
  return (
    <View style={styles.footer}>
      <Pressable
        onPress={onSubmit}
        style={[styles.registerButton, isLoading && { opacity: 0.7 }]}
        disabled={isLoading}
      >
        <View style={styles.registerButtonInner}>
          <Text style={styles.registerButtonText}>Create account</Text>
        </View>
      </Pressable>

      <Pressable onPress={onGoToLogin} style={styles.authFooterContainer}>
        <Text style={styles.authFooterText}>
          Already have an account?{" "}
          <Text style={styles.authFooterLink}>Log in</Text>
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
    width: width * 0.9,
    height: "42.6@vs",
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    borderRadius: 999,
    // marginTop: "7.5@vs",
    alignSelf: "center",
  },
  registerButtonInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: "42.6@vs",
  },
  registerButtonText: {
    fontSize: "13.8@ms",
    fontFamily: "PlusJakartaSans-SemiBold",
    color: "#4F21A5",
    lineHeight: "42.6@vs",
    textAlignVertical: "center",
    includeFontPadding: false as unknown as boolean,
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
});
