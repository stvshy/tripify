import React from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";

const { width, height } = Dimensions.get("window");

interface LoginHeaderProps {
  errorMessage?: string | null;
}

const LoginHeader = React.memo(function LoginHeader({
  errorMessage,
}: LoginHeaderProps) {
  return (
    <View style={styles.container}>
      <Ionicons name="location" size={64} color="#FFFFFF" />
      <Text style={styles.title}>Welcome to Tripify!</Text>
      <Text
        style={[styles.subtitle, errorMessage ? styles.errorSubtitle : null]}
      >
        {errorMessage ||
          "Sign in to continue your journey and discover new places."}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: 10,
    paddingTop: 8,
  },
  title: {
    fontSize: width * 0.06,
    fontFamily: "PlusJakartaSans-Bold",
    color: "#FFFFFF",
    textAlign: "center",
    letterSpacing: -0.5,
  },
  subtitle: {
    marginTop: 2,
    color: "#D1D5DB",
    fontSize: width * 0.037,
    fontFamily: "PlusJakartaSans-Regular",
    textAlign: "center",
    maxWidth: width * 0.8,
    marginBottom: 7,
    minHeight: 40, // Stała wysokość żeby nie wpływać na layout
  },
  errorSubtitle: {
    color: "#F472B6",
    fontSize: 13, // Mniejszy font jak wcześniej
    fontFamily: "PlusJakartaSans-Regular", // Regular zamiast Medium/Bold
    minHeight: 40, // Ta sama wysokość co subtitle
  },
});

export default LoginHeader;
