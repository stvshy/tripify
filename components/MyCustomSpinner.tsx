// components/MyCustomSpinner.tsx
import React from "react";
import { View, StyleSheet } from "react-native";
import LottieView from "lottie-react-native";

interface MyCustomSpinnerProps {
  size?: "small" | "large";
}

const MyCustomSpinner: React.FC<MyCustomSpinnerProps> = ({
  size = "large",
}) => {
  const lottieStyle =
    size === "large" ? styles.lottieLarge : styles.lottieSmall;
  return (
    <View style={styles.spinnerContainer}>
      <LottieView
        source={require("../assets/animations/loader-gradient.json")} // Zmień na poprawną ścieżkę!
        autoPlay
        loop
        style={lottieStyle}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  spinnerContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  lottieLarge: {
    width: 100, // Dostosuj do swoich potrzeb
    height: 100,
  },
  lottieSmall: {
    width: 50,
    height: 50,
  },
});

export default MyCustomSpinner;
