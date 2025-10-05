// PerformanceOptimizedConfetti.tsx - Skottie-based (UI-thread) confetti
import React, { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import { Dimensions, View } from "react-native";
import Animated, { useAnimatedProps } from "react-native-reanimated";
import AnimatedLottieView from "lottie-react-native";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

interface OptimizedConfettiProps {
  visible: boolean;
  origin: { x: number; y: number };
  colors: string[]; // kept for API compatibility (not used by Lottie)
  updateSequence: number;
  isMapActive: boolean;
  // Optional: UI-thread driven progress (0..1) to force frame-perfect start
  progressSV?: Animated.SharedValue<number>;
}

export interface OptimizedConfettiRef {
  start: () => void;
  startWithDelay: (delay: number) => void;
}

const SIZE_MULTIPLIER = 2.8; // much wider
const HEIGHT_MULTIPLIER = 4.9; // much taller
const BASE_SIZE = Math.min(screenWidth, screenHeight) * 0.52;
const ANIM_WIDTH = BASE_SIZE * SIZE_MULTIPLIER;
const ANIM_HEIGHT = BASE_SIZE * HEIGHT_MULTIPLIER;

const OptimizedConfetti = forwardRef<
  OptimizedConfettiRef,
  OptimizedConfettiProps
>(({ visible, origin, updateSequence, progressSV }, ref) => {
  // Load Lottie JSON (placed under assets/animations)
  const source = useMemo(
    () => require("../assets/animations/Confetti Reaction GIF.json"),
    []
  );
  const lottieRef = useRef<AnimatedLottieView>(null);
  const ReanimatedLottie = useMemo(
    () => Animated.createAnimatedComponent(AnimatedLottieView),
    []
  );
  const animatedProps = useAnimatedProps(() => {
    return { progress: progressSV ? progressSV.value : 0 } as any;
  }, [progressSV]);

  useImperativeHandle(
    ref,
    () => ({
      start: () => {
        try {
          // Start from very first frame to minimize any visual delay
          // play(startFrame, endFrame) ensures immediate jump to frame 0
          // Fallback to reset+play if API not supported on platform
          // @ts-ignore
          if (lottieRef.current?.play) lottieRef.current?.play(0, 60);
          else {
            lottieRef.current?.reset();
            lottieRef.current?.play();
          }
        } catch (error) {
          console.log("Skottie confetti start error:", error);
        }
      },
      startWithDelay: (delay: number) => {
        try {
          setTimeout(
            () => {
              // @ts-ignore
              if (lottieRef.current?.play) lottieRef.current?.play(0, 60);
              else {
                lottieRef.current?.reset();
                lottieRef.current?.play();
              }
            },
            Math.max(0, delay)
          );
        } catch (error) {
          console.log("Skottie confetti startWithDelay error:", error);
        }
      },
    }),
    []
  );

  // Keep mounted at all times to avoid mount-time startup delays; visibility handled by parent

  // Position the animation so that its origin sits at the provided point.
  // We anchor the Lottie view such that its bottom-center aligns to origin.
  // Nudge slightly to the right so the blast appears a bit offset
  const RIGHT_SHIFT = ANIM_WIDTH * 0.02;
  const left = origin.x - ANIM_WIDTH / 2 + RIGHT_SHIFT;
  // Bottom anchoring: increase downward shift using screen height for stability
  const VERTICAL_SHIFT = Math.min(
    screenHeight * 0.35 + ANIM_HEIGHT * 0.85,
    screenHeight - 20
  );
  const bottom = Math.max(0, origin.y - VERTICAL_SHIFT);
  // Force a visual push in Y regardless of container math
  const EXTRA_PUSH_Y = Math.max(0, screenHeight * 0.004 + ANIM_HEIGHT * 0.29);

  return (
    <View
      key={`skottie-confetti-${updateSequence}`}
      pointerEvents="none"
      style={{
        position: "absolute",
        left,
        bottom,
        width: ANIM_WIDTH,
        height: ANIM_HEIGHT,
      }}
    >
      <ReanimatedLottie
        ref={lottieRef}
        style={{
          width: "100%",
          height: "100%",
          transform: [{ translateY: EXTRA_PUSH_Y }],
        }}
        source={source}
        loop={false}
        autoPlay={false}
        enableMergePathsAndroidForKitKatAndAbove
        renderMode="HARDWARE"
        speed={0.6}
        // Drive Lottie progress directly from Reanimated shared value
        animatedProps={animatedProps}
        // Force immediate rendering
        cacheComposition={false}
        // Ensure hardware acceleration for immediate updates
        hardwareAccelerationAndroid={true}
      />
    </View>
  );
});

OptimizedConfetti.displayName = "OptimizedConfetti";

export default React.memo(OptimizedConfetti);
