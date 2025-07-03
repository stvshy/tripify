// components/ShineMask.tsx
import React, { useContext } from "react";
import { StyleSheet, View } from "react-native";
import { MotiView } from "moti";
import { LinearGradient } from "expo-linear-gradient";
import MaskedView from "@react-native-masked-view/masked-view";
import { ThemeContext } from "@/app/config/ThemeContext";

interface ShineMaskProps {
  children: React.ReactElement;
  delay?: number;
  duration?: number;
}

const ShineMask: React.FC<ShineMaskProps> = ({
  children,
  delay = 0,
  duration = 800,
}) => {
  const { isDarkTheme } = useContext(ThemeContext);
  const shineColor = isDarkTheme
    ? "rgba(255, 255, 255, 0.15)"
    : "rgba(255, 255, 255, 0.5)";

  return (
    <MaskedView
      // Maska to jest dokładnie ten element, który przekazujemy
      maskElement={children}
    >
      {/* Tło (niewidoczne), które sprawia, że Maska ma na czym pracować */}
      <View style={{ backgroundColor: "transparent" }}>{children}</View>

      {/* Animowany gradient, który będzie widoczny tylko w obszarze maski */}
      <MotiView
        style={StyleSheet.absoluteFillObject}
        from={{ translateX: -200 }} // Startuje daleko z lewej
        animate={{ translateX: 200 }} // Kończy daleko po prawej
        transition={{
          type: "timing",
          duration,
          delay,
          loop: false, // Animacja odpali się tylko raz
        }}
      >
        <LinearGradient
          colors={["transparent", shineColor, "transparent"]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          locations={[0.3, 0.5, 0.7]} // Skupia błysk na środku
          style={styles.gradient}
        />
      </MotiView>
    </MaskedView>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
});

export default React.memo(ShineMask);
