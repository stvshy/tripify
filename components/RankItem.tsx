// components/RankItem.tsx
import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "react-native-paper";
import FastImage from "@d11/react-native-fast-image";
import { getFlagUrl } from "./countriesIndex";

interface Country {
  cca2: string;
  name: string;
}

interface RankingItemProps {
  slot: { id: string; rank: number; country: Country | null };
  index: number; // może zostać, nawet jeśli go nie używasz
  onRemove: (id: string) => void; // <-- tu zmiana
  isActive: boolean;
  setActiveRankingItemId: (id: string | null) => void;
  isDarkTheme: boolean;
}

const RankingItem: React.FC<RankingItemProps> = ({
  slot,
  index,
  onRemove,
  isActive,
  setActiveRankingItemId,
  isDarkTheme,
}) => {
  const theme = useTheme();
  const removeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(removeAnim, {
      toValue: isActive ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [isActive, removeAnim]);

  const removeOpacity = removeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  const removeScale = removeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1],
  });

  return (
    <TouchableOpacity
      style={[
        styles.rankingSlot,
        {
          backgroundColor: isActive
            ? isDarkTheme
              ? "#333333"
              : "#e3e3e3"
            : theme.colors.surface,
          borderColor: isDarkTheme ? "#2b2b2b" : "#ccc",
          borderWidth: 1,
        },
      ]}
      onLongPress={() => setActiveRankingItemId(slot.id)}
      delayLongPress={250}
      disabled={!slot.country}
      activeOpacity={0.85}
    >
      <View style={styles.slotContent}>
        <Text style={[styles.rankNumber, { color: theme.colors.onSurface }]}>
          {slot.rank}.
        </Text>
        {slot.country ? (
          <View style={styles.countryInfoContainer}>
            <FastImage
              source={{
                uri: getFlagUrl(slot.country.cca2, 40),
                priority: FastImage.priority.normal,
              }}
              style={styles.flag}
              resizeMode={FastImage.resizeMode.cover}
            />
            <Text
              style={{
                color: theme.colors.onSurface,
                marginLeft: 7,
                fontSize: 15,
                fontFamily: "Figtree-Regular",
              }}
              numberOfLines={1}
            >
              {slot.country.name}
            </Text>
          </View>
        ) : (
          <Text
            style={{
              color: theme.colors.onSurface,
              fontStyle: "italic",
              fontSize: 12,
            }}
          >
            Drop Here
          </Text>
        )}
      </View>

      <Animated.View
        style={{ opacity: removeOpacity, transform: [{ scale: removeScale }] }}
      >
        {isActive && (
          <TouchableOpacity
            onPress={() => onRemove(slot.id)}
            style={{ marginLeft: 8 }}
          >
            <Ionicons name="close-circle" size={18} color="red" />
          </TouchableOpacity>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  rankingSlot: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginRight: 6,
    borderRadius: 15,
    justifyContent: "space-between",
    minWidth: 120,
  },
  slotContent: { flexDirection: "row", alignItems: "center", flex: 1 },
  rankNumber: {
    fontSize: 16.5,
    marginRight: 10,
    fontFamily: "Figtree-SemiBold",
  },
  countryInfoContainer: { flexDirection: "row", alignItems: "center", flex: 1 },
  flag: { width: 23, height: 15, borderRadius: 2 },
});

export default React.memo(RankingItem, (prev, next) => {
  return (
    prev.slot.id === next.slot.id &&
    prev.slot.rank === next.slot.rank &&
    prev.isDarkTheme === next.isDarkTheme &&
    prev.isActive === next.isActive
  );
});
