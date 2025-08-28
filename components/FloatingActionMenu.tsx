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
import {
  AntDesign,
  Feather,
  Ionicons,
  MaterialIcons,
} from "@expo/vector-icons";
import { useTheme } from "react-native-paper";
import { LinearGradient } from "expo-linear-gradient";
import { rgbaColor } from "react-native-reanimated/lib/typescript/reanimated2/Colors";

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
    transform: [{ translateX: -(BUTTON_SIZE + 10.6) * menuProgress.value }],
    opacity: menuProgress.value,
  }));
  const rightItemStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: (BUTTON_SIZE + 10.6) * menuProgress.value }],
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
        // Transparent to let gradient below show through
        backgroundColor: "transparent",
        borderWidth: 0.1,
        borderColor: theme.colors.primary,
      },
    ],
    [theme.colors.primary]
  );

  // Static gradient matching the progress bar styling
  const PINK_HEX = theme.colors.primary;
  const TURQUOISE_HEX = "#00AEF5";
  const gradientColors = [
    PINK_HEX,
    PINK_HEX,
    TURQUOISE_HEX,
    PINK_HEX,
    PINK_HEX,
  ];
  const gradientLocations = [0, 0.18, 0.5, 0.82, 1];

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
        <LinearGradient
          colors={gradientColors}
          locations={gradientLocations}
          // Extend gradient beyond the button height for a more stretched vertical look
          start={{ x: 0.5, y: -7 }}
          end={{ x: 0.5, y: 2.7 }}
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: BUTTON_SIZE / 2,
              transform: [{ rotate: "45deg" }],
            },
          ]}
          pointerEvents="none"
        />
        <Animated.View
          style={[StyleSheet.absoluteFill, styles.center, menuIconOpacity]}
          pointerEvents="none"
        >
          <Feather
            name="menu"
            size={BUTTON_SIZE * 0.5}
            color={
              isDarkTheme ? "rgba(221, 213, 230, 1)" : "rgba(242, 222, 242, 1)" // kolor dla trybu jasnego
            }
          />
        </Animated.View>
        <Animated.View
          style={[StyleSheet.absoluteFill, styles.center, zoomIconOpacity]}
          pointerEvents="none"
        >
          <AntDesign
            name="shrink"
            size={ICON_SIZE}
            color={"theme.colors.primary"}
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
