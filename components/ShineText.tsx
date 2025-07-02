// components/ShineText.tsx
import React, { useContext } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  Text,
  StyleProp,
  TextStyle,
} from "react-native";
import { MotiView } from "moti";
import { LinearGradient } from "expo-linear-gradient";
import MaskedView from "@react-native-masked-view/masked-view";
import { ThemeContext } from "@/app/config/ThemeContext";

const { width } = Dimensions.get("window");

interface ShineTextProps {
  children: React.ReactNode;
  delay?: number;
  style?: StyleProp<TextStyle>;
}

const ShineText: React.FC<ShineTextProps> = ({
  children,
  delay = 0,
  style,
}) => {
  const { isDarkTheme } = useContext(ThemeContext);
  const shineColor = isDarkTheme
    ? "rgba(255, 255, 255, 0.3)" // Nieco jaśniejszy dla tekstu
    : "rgba(255, 255, 255, 0.6)";

  return (
    // Kontener dla animacji wejścia
    <MotiView
      from={{ opacity: 0, transform: [{ translateY: -20 }] }}
      animate={{ opacity: 1, transform: [{ translateY: 0 }] }}
      transition={{ type: "timing", duration: 500, delay }}
    >
      <MaskedView
        style={{ height: 30 }} // Dopasuj wysokość do swojego tekstu
        maskElement={<Text style={style}>{children}</Text>}
      >
        {/* Widoczna zawartość - statyczny tekst */}
        <Text style={[style, { opacity: isDarkTheme ? 0.8 : 1 }]}>
          {children}
        </Text>

        {/* Nakładka z animowanym odblaskiem */}
        <MotiView
          from={{ translateX: -width }}
          animate={{ translateX: width }}
          transition={{
            type: "timing",
            duration: 1000,
            delay: delay + 400,
            loop: false,
          }}
          style={StyleSheet.absoluteFillObject}
        >
          <LinearGradient
            colors={["transparent", shineColor, "transparent"]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.gradient}
          />
        </MotiView>
      </MaskedView>
    </MotiView>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
});

export default ShineText;
