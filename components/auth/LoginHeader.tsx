import React from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";

const { width, height } = Dimensions.get("window");

const LoginHeader = React.memo(function LoginHeader() {
  return (
    <View style={styles.container}>
      <Ionicons name="location" size={64} color="#FFFFFF" />
      <Text style={styles.title}>Welcome to Tripify!</Text>
      <Text style={styles.subtitle}>
        Sign in to continue your journey and discover new places.
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
    marginBottom: 10,
  },
});

export default LoginHeader;
