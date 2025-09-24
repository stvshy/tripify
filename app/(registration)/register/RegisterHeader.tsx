import React from "react";
import { View, Text, StyleSheet, Image, Dimensions } from "react-native";
import { ScaledSheet } from "react-native-size-matters";

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

const styles = ScaledSheet.create({
  logo: {
    // width: "40%",
    height: "121@vs",
  },
  logoContainer: {
    justifyContent: "center",
    alignItems: "center",
    marginBottom: "13@vs",
    marginTop: "37.5@vs",
    width: "100%",
    marginLeft: "-1.1@s",
  },
  title: {
    fontSize: "22.1@ms",
    fontFamily: "Figtree-Medium",
    textAlign: "center",
    color: "#FFFFFF",
    width: "100%",
  },
  errorHolder: {
    minHeight: "40.6@vs",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  errorText: {
    color: "#F472B6",
    marginBottom: "7.5@vs",
    fontSize: "13@ms",
    textAlign: "center",
    width: "90%",
    fontFamily: "PlusJakartaSans-Regular",
  },
  subtitle: {
    color: "#D1D5DB",
    marginBottom: "7.5@vs",
    fontSize: "13@ms",
    textAlign: "center",
    width: "90%",
    fontFamily: "PlusJakartaSans-Regular",
  },
});
