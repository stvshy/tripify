import { useRef, useCallback } from "react";
import { Animated, Keyboard } from "react-native";
import { moderateScale } from "react-native-size-matters";

export const useKeyboardAnimation = () => {
  const contentTranslateY = useRef(new Animated.Value(0)).current;

  const animateToTop = useCallback(() => {
    // Używamy moderateScale dla lepszego skalowania na różnych ekranach
    const animationDistance = moderateScale(-60, 0.3);

    Animated.timing(contentTranslateY, {
      toValue: animationDistance,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [contentTranslateY]);

  const animateToBottom = useCallback(() => {
    Animated.timing(contentTranslateY, {
      toValue: 0,
      duration: 70,
      useNativeDriver: true,
    }).start();
  }, [contentTranslateY]);

  const resetAnimation = useCallback(() => {
    contentTranslateY.stopAnimation();
    contentTranslateY.setValue(0);
  }, [contentTranslateY]);

  return {
    contentTranslateY,
    animateToTop,
    animateToBottom,
    resetAnimation,
  };
};
