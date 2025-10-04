// PerformanceOptimizedConfetti.tsx - Lżejsza wersja konfetti
import React from "react";
import ConfettiCannon from "react-native-confetti-cannon";
import { Platform, Dimensions } from "react-native";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
const BUTTON_SIZE = Math.min(screenWidth, screenHeight) * 0.08;
const MORPH_DURATION = 280; // Ultra-fast morphing

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

  // ULTRA-FAST: Ultra-fast confetti for instant visual impact
  const confettiCount = 120; // Reduced for better performance
  const explosionSpeed = 900; // Ultra-fast explosion
  const fallSpeed = 2000; // Ultra-fast fall

  return (
    <ConfettiCannon
      key={`confetti-${updateSequence}-${isMapActive ? 1 : 0}-${visible ? 1 : 0}`}
      count={confettiCount}
      origin={origin}
      colors={colors}
      fadeOut
      autoStart
      autoStartDelay={MORPH_DURATION} // PERFECT TIMING: Start confetti after morphing completes
      explosionSpeed={explosionSpeed}
      fallSpeed={fallSpeed}
    />
  );
};

export default React.memo(OptimizedConfetti);
