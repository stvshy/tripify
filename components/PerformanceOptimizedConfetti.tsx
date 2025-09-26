// PerformanceOptimizedConfetti.tsx - Lżejsza wersja konfetti
import React from "react";
import ConfettiCannon from "react-native-confetti-cannon";
import { Platform, Dimensions } from "react-native";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
const BUTTON_SIZE = Math.min(screenWidth, screenHeight) * 0.08;
const MORPH_DURATION = 380; // Oryginalna wartość

interface OptimizedConfettiProps {
  visible: boolean;
  origin: { x: number; y: number };
  colors: string[];
  updateSequence: number;
  isMapActive: boolean;
}

const OptimizedConfetti: React.FC<OptimizedConfettiProps> = ({
  visible,
  origin,
  colors,
  updateSequence,
  isMapActive,
}) => {
  if (!visible) return null;

  // Przywrócone oryginalne wartości konfetti
  const confettiCount = 140; // Oryginalna liczba
  const explosionSpeed = 700; // Oryginalna prędkość
  const fallSpeed = 2400; // Oryginalna prędkość

  return (
    <ConfettiCannon
      key={`confetti-${updateSequence}-${isMapActive ? 1 : 0}-${visible ? 1 : 0}`}
      count={confettiCount}
      origin={origin}
      colors={colors}
      fadeOut
      autoStart
      autoStartDelay={MORPH_DURATION} // Oryginalne
      explosionSpeed={explosionSpeed}
      fallSpeed={fallSpeed}
    />
  );
};

export default React.memo(OptimizedConfetti);
