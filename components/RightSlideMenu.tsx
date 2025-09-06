import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Dimensions,
  PanResponder,
  Pressable,
  StyleSheet,
  View,
  Text,
  Platform,
} from "react-native";
import { useTheme } from "react-native-paper";
import { AnimatePresence, MotiView } from "moti";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";

export type RightSlideMenuItem = {
  key: string;
  label: string;
  icon?: React.ReactNode;
  onPress?: () => void;
  danger?: boolean;
  disabled?: boolean;
};

export interface RightSlideMenuHandles {
  open: () => void;
  close: () => void;
  toggle: () => void;
}

interface RightSlideMenuProps {
  items: RightSlideMenuItem[];
  header?: React.ReactNode;
  widthPercent?: number; // 0-1, default 0.70
  onClose?: () => void;
}

const RightSlideMenu = forwardRef<RightSlideMenuHandles, RightSlideMenuProps>(
  ({ items, header, widthPercent = 0.6, onClose }, ref) => {
    const [visible, setVisible] = useState(false);
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const { width } = Dimensions.get("window");
    const sheetWidth = Math.min(Math.max(width * widthPercent, 235), 400);

    const open = useCallback(() => setVisible(true), []);
    const close = useCallback(() => {
      setVisible(false);
      onClose?.();
    }, [onClose]);
    const toggle = useCallback(() => setVisible((v) => !v), []);

    useImperativeHandle(ref, () => ({ open, close, toggle }), [
      open,
      close,
      toggle,
    ]);

    const borderColor = useMemo(
      () => (theme.dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"),
      [theme.dark]
    );

    // Pan gesture to close the sheet by swiping right
    const panHandlers = useMemo(
      () =>
        PanResponder.create({
          onStartShouldSetPanResponder: () => false,
          onMoveShouldSetPanResponder: (_e, g) =>
            Math.abs(g.dx) > Math.abs(g.dy) && g.dx > 10,
          onPanResponderRelease: (_e, g) => {
            if (g.dx > 50) {
              close();
            }
          },
        }).panHandlers,
      [close]
    );

    return (
      <AnimatePresence>
        {visible && (
          <MotiView
            key="overlay"
            style={styles.overlay}
            from={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: "timing", duration: 180 }}
          >
            {/* tap outside to close */}
            <Pressable style={StyleSheet.absoluteFill} onPress={close} />

            <MotiView
              key="sheet"
              style={[
                styles.sheet,
                {
                  width: sheetWidth,
                  paddingTop: Math.max(insets.top, 14),
                  paddingBottom: Math.max(insets.bottom, 14),
                  backgroundColor: theme.colors.surface,
                },
              ]}
              from={{ translateX: sheetWidth, opacity: 0.9 }}
              animate={{ translateX: 0, opacity: 1 }}
              exit={{ translateX: sheetWidth, opacity: 0.95 }}
              transition={{ type: "timing", duration: 240 }}
              {...panHandlers}
            >
              <View
                style={[
                  styles.headerContainer,
                  { borderBottomColor: borderColor },
                ]}
              >
                <View style={{ flex: 1 }}>{header}</View>
                <Pressable
                  onPress={close}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={({ pressed }) => [
                    styles.closeButton,
                    { opacity: pressed ? 0.6 : 1 },
                  ]}
                >
                  <MaterialIcons
                    name="arrow-forward-ios"
                    size={18}
                    color={theme.colors.onSurface}
                  />
                </Pressable>
              </View>

              <View>
                {items.map((it, idx) => {
                  const isLast = idx === items.length - 1;
                  const color = it.danger
                    ? theme.colors.error
                    : theme.colors.onSurface;
                  const opacity = it.disabled ? 0.4 : 1;
                  return (
                    <Pressable
                      key={it.key}
                      disabled={it.disabled}
                      onPress={() => {
                        close();
                        requestAnimationFrame(() => it.onPress?.());
                      }}
                      style={({ pressed }) => [
                        styles.itemRow,
                        {
                          borderBottomColor: isLast
                            ? "transparent"
                            : borderColor,
                          backgroundColor: pressed
                            ? theme.dark
                              ? "rgba(255,255,255,0.06)"
                              : "rgba(0,0,0,0.04)"
                            : "transparent",
                          opacity,
                        },
                      ]}
                    >
                      <View style={styles.itemIcon}>{it.icon}</View>
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.itemLabel,
                          { color, fontFamily: "Figtree-SemiBold" },
                        ]}
                      >
                        {it.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </MotiView>
          </MotiView>
        )}
      </AnimatePresence>
    );
  }
);

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
    zIndex: 100,
  },
  sheet: {
    height: "100%",
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  headerContainer: {
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  itemIcon: {
    width: 26,
    alignItems: "center",
    marginRight: 12,
  },
  itemLabel: {
    fontSize: 16,
    flexShrink: 1,
  },
});

export default RightSlideMenu;
