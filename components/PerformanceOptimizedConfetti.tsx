// PerformanceOptimizedConfetti.tsx - Lżejsza wersja konfetti
import React, { forwardRef, useImperativeHandle, useRef } from "react";
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

export interface OptimizedConfettiRef {
  start: () => void;
  startWithDelay: (delay: number) => void;
}

const OptimizedConfetti = forwardRef<
  OptimizedConfettiRef,
  OptimizedConfettiProps
>(({ visible, origin, colors, updateSequence, isMapActive }, ref) => {
  const confettiRef = useRef<ConfettiCannon>(null);

  useImperativeHandle(
    ref,
    () => ({
      start: () => {
        try {
          confettiRef.current?.start();
        } catch (error) {
          console.log("Confetti start error:", error);
        }
      },
      startWithDelay: (delay: number) => {
        try {
          // Use setTimeout with withDelay timing for precise control
          setTimeout(() => {
            confettiRef.current?.start();
          }, delay);
        } catch (error) {
          console.log("Confetti startWithDelay error:", error);
        }
      },
    }),
    []
  );

  if (!visible) return null;

  // ULTRA-FAST: Ultra-fast confetti for instant visual impact
  const confettiCount = 120; // Reduced for better performance
  const explosionSpeed = 900; // Ultra-fast explosion
  const fallSpeed = 2000; // Ultra-fast fall

  return (
    <ConfettiCannon
      ref={confettiRef}
      key={`confetti-${updateSequence}-${isMapActive ? 1 : 0}-${visible ? 1 : 0}`}
      count={confettiCount}
      origin={origin}
      colors={colors}
      fadeOut
      autoStart={false} // Disable autoStart - we'll control timing with withDelay
      explosionSpeed={explosionSpeed}
      fallSpeed={fallSpeed}
    />
  );
});

OptimizedConfetti.displayName = "OptimizedConfetti";

export default React.memo(OptimizedConfetti);
