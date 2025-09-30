import { useRef, useCallback } from "react";
import { Animated, Keyboard } from "react-native";
import { moderateScale } from "react-native-size-matters";

export const useKeyboardAnimation = () => {
  const contentTranslateY = useRef(new Animated.Value(0)).current;

  const animateToTop = useCallback(() => {
    // Używamy moderateScale dla lepszego skalowania na różnych ekranach
    // moderateScale zapewnia bardziej liniowe skalowanie niż verticalScale
    const animationDistance = moderateScale(-108, 0.3);

    Animated.timing(contentTranslateY, {
      toValue: animationDistance,
      duration: 200, // Szybsza animacja niż wcześniej
      useNativeDriver: true,
    }).start();
  }, [contentTranslateY]);

  const animateToBottom = useCallback(() => {
    Animated.timing(contentTranslateY, {
      toValue: 0,
      duration: 180, // Szybsza animacja niż wcześniej
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
