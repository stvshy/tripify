import React from "react";
import { View, Text, StyleSheet, Dimensions, Pressable } from "react-native";

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

const styles = StyleSheet.create({
  footer: {
    width: "100%",
    alignItems: "center",
    paddingTop: 9,
    paddingBottom: 26,
  },
  registerButton: {
    width: width * 0.9,
    height: 47,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    borderRadius: 999,
    marginTop: 8,
    alignSelf: "center",
  },
  registerButtonInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 47,
  },
  registerButtonText: {
    fontSize: 14,
    fontFamily: "PlusJakartaSans-SemiBold",
    color: "#4F21A5",
    lineHeight: 47,
    textAlignVertical: "center",
    includeFontPadding: false as unknown as boolean,
  },
  authFooterContainer: {
    width: "100%",
    alignItems: "center",
    paddingTop: 16,
    // paddingBottom: 24,
  },
  authFooterText: {
    color: "#D1D5DB",
    fontSize: 13,
    fontFamily: "PlusJakartaSans-Regular",
  },
  authFooterLink: {
    color: "#FFFFFF",
    fontFamily: "PlusJakartaSans-SemiBold",
  },
});
