import React from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { s, ScaledSheet } from "react-native-size-matters";

const { width, height } = Dimensions.get("window");

interface LoginHeaderProps {
  errorMessage?: string | null;
  verificationMessage?: string | null;
}

const LoginHeader = React.memo(function LoginHeader({
  errorMessage,
  verificationMessage,
}: LoginHeaderProps) {
  return (
    <View style={styles.container}>
      <Ionicons name="location" size={s(62)} color="#FFFFFF" />
      <Text style={styles.title}>Welcome to Tripify!</Text>
      <Text
        style={[
          styles.subtitle,
          errorMessage || verificationMessage ? styles.errorSubtitle : null,
        ]}
      >
        {errorMessage ||
          verificationMessage ||
          "Sign in to map your journey and discover destinations"}
      </Text>
    </View>
  );
});

const styles = ScaledSheet.create({
  container: {
    alignItems: "center",
    gap: "9.2@vs",
    paddingTop: "7.2@vs",
  },
  title: {
    fontSize: "22.4@ms",
    fontFamily: "Figtree-SemiBold",
    color: "#FFFFFF",
    textAlign: "center",
    // letterSpacing: -0.2,
    marginTop: "5.3@vs",
    marginBottom: "0.2@vs",
  },
  subtitle: {
    marginTop: "2@vs",
    color: "#D1D5DB",
    fontSize: "13@ms",
    fontFamily: "PlusJakartaSans-Regular",
    textAlign: "center",
    maxWidth: width * 0.8,
    marginBottom: "6.7@vs",
    minHeight: "36@vs", // Stała wysokość żeby nie wpływać na layout
  },
  errorSubtitle: {
    color: "#F472B6",
    fontSize: "12.9@ms", // Mniejszy font jak wcześniej
    fontFamily: "PlusJakartaSans-Regular", // Regular zamiast Medium/Bold
    minHeight: "36@vs", // Ta sama wysokość co subtitle
  },
});

export default LoginHeader;
