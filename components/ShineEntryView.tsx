// components/ShineEntryView.tsx
import React from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import { MotiView } from "moti";
import { LinearGradient } from "expo-linear-gradient";

const { width } = Dimensions.get("window");

interface ShineEntryViewProps {
  children: React.ReactNode;
  delay?: number;
}

const ShineEntryView: React.FC<ShineEntryViewProps> = ({
  children,
  delay = 0,
}) => {
  return (
    // Główny kontener Moti, który animuje pojawienie się
    <MotiView
      // ZMIENIONA WARTOŚĆ:
      from={{ opacity: 0, transform: [{ translateY: -20 }] }}
      animate={{ opacity: 1, transform: [{ translateY: 0 }] }}
      transition={{
        type: "timing",
        duration: 500, // Możesz też dostosować szybkość
        delay: delay,
      }}
      style={styles.container}
    >
      {/* Właściwa treść, którą chcemy pokazać */}
      {children}

      {/* Nakładka z animowanym odblaskiem */}
      <MotiView
        from={{ translateX: -width * 1.5 }} // Startuje całkowicie z lewej
        animate={{ translateX: width * 1.5 }} // Przesuwa się całkowicie na prawo
        transition={{
          type: "timing",
          duration: 800, // Szybkość odblasku
          delay: delay + 200, // Odblask startuje chwilę po pojawieniu się elementu
          loop: false, // Można ustawić na true, jeśli chcesz, żeby się powtarzał
        }}
        style={StyleSheet.absoluteFillObject} // Rozciąga się na cały kontener
      >
        <LinearGradient
          colors={["transparent", "rgba(255, 255, 255, 0.4)", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradient}
        />
      </MotiView>
    </MotiView>
  );
};

const styles = StyleSheet.create({
  container: {
    // Ważne: ukrywamy wszystko, co wychodzi poza kontener (czyli odblask)
    overflow: "hidden",
    backgroundColor: "transparent", // Musi być przezroczysty, żeby było widać tło
  },
  gradient: {
    flex: 1,
    // Obracamy gradient, aby uzyskać efekt "po ukosie"
    transform: [{ rotateZ: "20deg" }],
  },
});

export default ShineEntryView;
