import { useRef, useCallback } from "react";
import { Animated, Keyboard } from "react-native";
import { verticalScale } from "react-native-size-matters";

export const useKeyboardAnimation = () => {
  const contentTranslateY = useRef(new Animated.Value(0)).current;

  const animateToTop = useCallback(() => {
    Animated.timing(contentTranslateY, {
      toValue: verticalScale(-98), // Większy dystans niż w forgotPassword
      duration: 200, // Szybsza animacja niż w forgotPassword
      useNativeDriver: true,
    }).start();
  }, [contentTranslateY]);

  const animateToBottom = useCallback(() => {
    Animated.timing(contentTranslateY, {
      toValue: 0,
      duration: 180, // Szybsza animacja niż w forgotPassword
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
