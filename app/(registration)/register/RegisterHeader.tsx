import React from "react";
import { View, Text, StyleSheet, Image, Dimensions } from "react-native";

const { width, height } = Dimensions.get("window");

type Props = {
  title?: string;
  errorMessage?: string | null;
};

export default function RegisterHeader({
  title = "Create an Account in Tripify",
  errorMessage,
}: Props) {
  return (
    <>
      <View style={styles.logoContainer}>
        <Image
          source={require("../../../assets/images/tripify-icon.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.errorHolder}>
        {errorMessage ? (
          <Text style={styles.errorText}>{errorMessage}</Text>
        ) : (
          <Text style={styles.subtitle}>
            E-mail verification will be required
          </Text>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  logo: {
    // width: "40%",
    height: height * 0.172,
  },
  logoContainer: {
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
    marginTop: height * 0.055,
    width: "100%",
    marginLeft: -1.3,
  },
  title: {
    fontSize: width * 0.0627,
    fontFamily: "Figtree-Medium",
    textAlign: "center",
    color: "#FFFFFF",
    width: "100%",
  },
  errorHolder: {
    minHeight: 45,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  errorText: {
    color: "#F472B6",
    marginBottom: 8,
    fontSize: 13.2,
    textAlign: "center",
    width: "90%",
    fontFamily: "PlusJakartaSans-Regular",
  },
  subtitle: {
    color: "#D1D5DB",
    marginBottom: 8,
    fontSize: 13.2,
    textAlign: "center",
    width: "90%",
    fontFamily: "PlusJakartaSans-Regular",
  },
});
