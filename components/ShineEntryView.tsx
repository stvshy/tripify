// components/ShineEntryView.tsx

import React, { useContext } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import { MotiView } from "moti";
import { LinearGradient } from "expo-linear-gradient";
import { ThemeContext } from "@/app/config/ThemeContext"; // Upewnij się, że ścieżka jest poprawna

const { width } = Dimensions.get("window");

interface ShineEntryViewProps {
  children: React.ReactNode;
  delay?: number;
}

const ShineEntryView: React.FC<ShineEntryViewProps> = ({
  children,
  delay = 0,
}) => {
  // 1. Pobieramy informację o motywie bezpośrednio w komponencie
  const { isDarkTheme } = useContext(ThemeContext);

  // 2. Definiujemy kolor odblasku w zależności od motywu
  // W trybie ciemnym efekt będzie bardziej subtelny (mniejsza przezroczystość)
  const shineColor = isDarkTheme
    ? "rgba(255, 255, 255, 0.15)"
    : "rgba(255, 255, 255, 0.4)";

  return (
    <MotiView
      from={{ opacity: 0, transform: [{ translateY: -20 }] }}
      animate={{ opacity: 1, transform: [{ translateY: 0 }] }}
      transition={{
        type: "timing",
        duration: 500,
        delay: delay,
      }}
      style={styles.container}
    >
      {/* Właściwa treść, którą chcemy pokazać */}
      {children}

      {/* Nakładka z animowanym odblaskiem */}
      <MotiView
        from={{ translateX: -width * 1.5 }}
        animate={{ translateX: width * 1.5 }}
        transition={{
          type: "timing",
          duration: 900, // Możemy trochę spowolnić dla lepszego efektu
          delay: delay + 250,
          loop: false,
        }}
        style={StyleSheet.absoluteFillObject}
      >
        <LinearGradient
          // 3. Używamy dynamicznego koloru
          colors={["transparent", shineColor, "transparent"]}
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
    overflow: "hidden",
    backgroundColor: "transparent",
    // Ta właściwość jest kluczowa dla rozwiązania!
    // Sprawia, że kontener nie rozciąga się na całą szerokość rodzica.
    alignSelf: "flex-start",
  },
  gradient: {
    flex: 1,
    transform: [{ rotateZ: "20deg" }],
  },
});

export default ShineEntryView;
