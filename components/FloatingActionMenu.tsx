import React, { useCallback, useMemo, useState } from "react";
import {
  Dimensions,
  StyleSheet,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import Animated, {
  Easing,
  SharedValue,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { AntDesign, Feather, MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "react-native-paper";

const windowWidth = Dimensions.get("window").width;
const windowHeight = Dimensions.get("window").height;
const BUTTON_SIZE = Math.min(windowWidth, windowHeight) * 0.08;
const ICON_SIZE = BUTTON_SIZE * 0.5;

export interface FloatingActionMenuProps {
  scale: SharedValue<number>;
  isDarkTheme: boolean;
  onZoomOut: () => void;
  onShare: () => Promise<void> | void;
  onToggleTheme: () => void;
  isSharing?: boolean;
  disabled?: boolean; // disables pointer events when overlay covers
}

export default function FloatingActionMenu(props: FloatingActionMenuProps) {
  const {
    scale,
    isDarkTheme,
    onZoomOut,
    onShare,
    onToggleTheme,
    isSharing,
    disabled,
  } = props;
  const theme = useTheme();

  // Local open/close animation (decoupled from map state)
  const [menuOpen, setMenuOpen] = useState(false);
  const menuProgress = useSharedValue(0);

  // Keep everything on UI thread; avoid React state updates for zoom changes
  const isZoomedSV = useSharedValue(false);
  useAnimatedReaction(
    () => scale.value > 1.01,
    (val) => {
      isZoomedSV.value = val;
      // auto-close when zooming
      if (val) {
        menuProgress.value = withTiming(0, {
          duration: 150,
          easing: Easing.out(Easing.ease),
        });
      }
    }
  );

  const toggleMenu = useCallback(() => {
    const next = !menuOpen;
    setMenuOpen(next);
    menuProgress.value = withTiming(next ? 1 : 0, {
      duration: next ? 240 : 180,
      easing: Easing.out(Easing.ease),
    });
  }, [menuOpen]);

  // Side buttons slide horizontally from center on same Y level
  const leftItemStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -(BUTTON_SIZE + 12) * menuProgress.value }],
    opacity: menuProgress.value,
  }));
  const rightItemStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: (BUTTON_SIZE + 12) * menuProgress.value }],
    opacity: menuProgress.value,
  }));

  // Icon crossfade without React setState
  const zoomIconOpacity = useAnimatedStyle(() => ({
    opacity: isZoomedSV.value ? 1 : 0,
  }));
  const menuIconOpacity = useAnimatedStyle(() => ({
    opacity: isZoomedSV.value ? 0 : 1,
  }));

  const mainButtonStyle = useMemo(
    () => [
      styles.mainButton,
      {
        backgroundColor: "#ffffff",
        borderWidth: 2,
        borderColor: theme.colors.primary,
      },
    ],
    [theme.colors.primary]
  );

  return (
    <View
      style={{
        width: BUTTON_SIZE * 5,
        height: BUTTON_SIZE * 2,
        alignItems: "center",
        justifyContent: "center",
        overflow: "visible",
      }}
      pointerEvents={disabled ? "none" : "auto"}
    >
      {/* Left: Share */}
      <Animated.View
        style={[{ position: "absolute" }, leftItemStyle]}
        pointerEvents={menuOpen ? "auto" : "none"}
      >
        <TouchableOpacity
          style={[styles.sideButton, { backgroundColor: theme.colors.primary }]}
          onPress={async () => {
            await onShare();
            setMenuOpen(false);
            menuProgress.value = withTiming(0, {
              duration: 160,
              easing: Easing.out(Easing.ease),
            });
          }}
          activeOpacity={0.7}
          disabled={isSharing}
        >
          {isSharing ? (
            <ActivityIndicator size="small" color={theme.colors.onPrimary} />
          ) : (
            <Feather
              name="share-2"
              size={ICON_SIZE}
              color={theme.colors.onPrimary}
            />
          )}
        </TouchableOpacity>
      </Animated.View>

      {/* Right: Theme toggle */}
      <Animated.View
        style={[{ position: "absolute" }, rightItemStyle]}
        pointerEvents={menuOpen ? "auto" : "none"}
      >
        <TouchableOpacity
          onPress={() => {
            onToggleTheme();
            setMenuOpen(false);
            menuProgress.value = withTiming(0, {
              duration: 160,
              easing: Easing.out(Easing.ease),
            });
          }}
          style={[styles.sideButton, { backgroundColor: theme.colors.primary }]}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name={isDarkTheme ? "dark-mode" : "light-mode"}
            size={ICON_SIZE}
            color={theme.colors.onPrimary}
          />
        </TouchableOpacity>
      </Animated.View>

      {/* Main: white outlined; zoom-out or menu icon via crossfade */}
      <TouchableOpacity
        style={mainButtonStyle}
        onPress={() => {
          // Decide action on UI thread state, but resolve in JS
          if (isZoomedSV.value) {
            onZoomOut();
          } else {
            toggleMenu();
          }
        }}
        activeOpacity={0.85}
      >
        <Animated.View
          style={[StyleSheet.absoluteFill, styles.center, menuIconOpacity]}
          pointerEvents="none"
        >
          <AntDesign
            name="menuunfold"
            size={ICON_SIZE}
            color={theme.colors.primary}
          />
        </Animated.View>
        <Animated.View
          style={[StyleSheet.absoluteFill, styles.center, zoomIconOpacity]}
          pointerEvents="none"
        >
          <AntDesign
            name="shrink"
            size={ICON_SIZE}
            color={theme.colors.primary}
          />
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  sideButton: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  mainButton: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  center: { alignItems: "center", justifyContent: "center" },
});
