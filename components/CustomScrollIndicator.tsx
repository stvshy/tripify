import React, { useRef, useState, useEffect } from "react";
import { View, StyleSheet, Animated, Dimensions, Keyboard } from "react-native";
import { ScaledSheet } from "react-native-size-matters";

const { width, height } = Dimensions.get("window");

interface CustomScrollIndicatorProps {
  children: React.ReactNode;
  style?: any;
  contentContainerStyle?: any;
  keyboardShouldPersistTaps?: "handled" | "always" | "never";
  showsVerticalScrollIndicator?: boolean;
  scrollEventThrottle?: number;
  overScrollMode?: "always" | "never" | "auto";
  removeClippedSubviews?: boolean;
  keyboardDismissMode?: "none" | "interactive" | "on-drag";
  nestedScrollEnabled?: boolean;
  contentInsetAdjustmentBehavior?:
    | "automatic"
    | "scrollableAxes"
    | "never"
    | "always";
}

const CustomScrollIndicator: React.FC<CustomScrollIndicatorProps> = ({
  children,
  style,
  contentContainerStyle,
  keyboardShouldPersistTaps = "handled",
  showsVerticalScrollIndicator = false,
  scrollEventThrottle = 16,
  overScrollMode = "always",
  removeClippedSubviews = false,
  keyboardDismissMode = "interactive",
  nestedScrollEnabled = true,
  contentInsetAdjustmentBehavior = "never",
}) => {
  const [contentHeight, setContentHeight] = useState(0);
  const [scrollViewHeight, setScrollViewHeight] = useState(0);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const scrollIndicator = useRef(new Animated.Value(0)).current;

  // Nasłuchiwanie zdarzeń klawiatury
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      "keyboardDidShow",
      () => {
        setKeyboardVisible(true);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      "keyboardDidHide",
      () => {
        setKeyboardVisible(false);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // Oblicz wysokość scrollbar - dynamicznie w zależności od klawiatury
  const scrollBarHeight =
    contentHeight > scrollViewHeight
      ? scrollViewHeight * (isKeyboardVisible ? 0.3 : 0.7) // 30% z klawiaturą, 70% bez klawiatury
      : scrollViewHeight;

  // Oblicz maksymalną pozycję scrollbar
  const maxScrollBarPosition = Math.max(0, scrollViewHeight - scrollBarHeight);

  // Oblicz maksymalny scroll
  const maxScroll = Math.max(0, contentHeight - scrollViewHeight);

  // Oblicz pozycję scrollbar na podstawie przewijania
  const scrollBarPosition =
    maxScroll > 0 && contentHeight > 0
      ? Animated.multiply(
          scrollIndicator,
          scrollViewHeight / contentHeight
        ).interpolate({
          extrapolate: "clamp",
          inputRange: [0, maxScroll],
          outputRange: [0, maxScrollBarPosition],
        })
      : new Animated.Value(0);

  const onContentSizeChange = (_width: number, contentHeight: number) =>
    setContentHeight(contentHeight);

  const onLayout = ({
    nativeEvent: {
      layout: { height },
    },
  }: {
    nativeEvent: {
      layout: { height: number };
    };
  }) => {
    setScrollViewHeight(height);
  };

  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollIndicator } } }],
    { useNativeDriver: false }
  );

  // Renderuj scrollbar tylko gdy zawartość jest scrollowalna
  const shouldShowScrollBar = contentHeight > scrollViewHeight && maxScroll > 0;

  return (
    <View style={styles.scrollContainer}>
      <Animated.ScrollView
        contentContainerStyle={contentContainerStyle}
        onContentSizeChange={onContentSizeChange}
        onLayout={onLayout}
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
        showsVerticalScrollIndicator={showsVerticalScrollIndicator}
        style={[styles.scrollViewContainer, style]}
        overScrollMode={overScrollMode}
        removeClippedSubviews={removeClippedSubviews}
        keyboardDismissMode={keyboardDismissMode}
        nestedScrollEnabled={nestedScrollEnabled}
        contentInsetAdjustmentBehavior={contentInsetAdjustmentBehavior}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      >
        {children}
      </Animated.ScrollView>
      {shouldShowScrollBar && (
        <View style={styles.customScrollBarBackground}>
          <Animated.View
            style={[
              styles.customScrollBar,
              {
                height: scrollBarHeight,
                transform: [{ translateY: scrollBarPosition }],
              },
            ]}
          />
        </View>
      )}
    </View>
  );
};

const styles = ScaledSheet.create({
  scrollContainer: {
    flexDirection: "row",
    width: "100%",
    flex: 1,
  },
  scrollViewContainer: {
    width: "100%",
    flex: 1,
  },
  customScrollBar: {
    backgroundColor: "rgba(255, 255, 255, 0.4)",
    borderRadius: 2,
    width: 3,
    position: "absolute",
    right: 0, // Dokładnie przy prawej krawędzi
  },
  customScrollBarBackground: {
    backgroundColor: "transparent",
    borderRadius: 2,
    height: "100%",
    width: 3,
    position: "absolute",
    right: 0, // Dokładnie przy prawej krawędzi
  },
});

export default CustomScrollIndicator;
