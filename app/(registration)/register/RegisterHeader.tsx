import React from "react";
import { View, Text, StyleSheet, Image, Dimensions } from "react-native";
import { moderateScale, ScaledSheet, vs } from "react-native-size-matters";
import { heightPercentageToDP as hp } from "react-native-responsive-screen";

const { width, height } = Dimensions.get("window");

// Custom scaling only for logo top margin – increases on taller screens
const getLogoTopMargin = () => {
  const ratio = height / width;
  const extra = Math.max(0, ratio - 2.0); // start increasing above ~2.0 ratio
  const percent = Math.min(4 + extra * 4, 10); // base 4% + 4% per extra ratio, clamp 10%
  return hp(`${percent}%`);
};

type Props = {
  title?: string;
  errorMessage?: string | null;
};

export default function RegisterHeader({
  title = "Create an Account in Tripify",
  errorMessage,
}: Props) {
  const logoTopMargin = getLogoTopMargin();

  return (
    <>
      <View
        style={[
          styles.logoContainer,
          {
            marginTop: logoTopMargin,
            marginBottom: hp("1.6%"),
          },
        ]}
      >
        <Image
          source={require("../../../assets/images/tripify-icon.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
      <Text style={styles.title}>{title}</Text>
      <View
        style={[
          styles.errorHolder,
          {
            minHeight: moderateScale(40.3),
          },
        ]}
      >
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
    height: hp("18.6%"),
  },
  logoContainer: {
    justifyContent: "center",
    alignItems: "center",
    // marginBottom and marginTop will be set dynamically
    width: "100%",
    marginLeft: "-1.5@s",
  },
  title: {
    fontSize: "22.1@ms",
    fontFamily: "Figtree-Medium",
    textAlign: "center",
    color: "#FFFFFF",
    width: "100%",
  },
  errorHolder: {
    // minHeight will be set dynamically
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
    fontSize: "13.3@ms",
    textAlign: "center",
    width: "90%",
    fontFamily: "PlusJakartaSans-Regular",
  },
});
