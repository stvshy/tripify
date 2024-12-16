// components/RankingItem.tsx
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CountryFlag from 'react-native-country-flag';
import { useTheme } from 'react-native-paper';

interface Country {
  cca2: string;
  name: string;
}

interface RankingItemProps {
  slot: {
    id: string;
    rank: number;
    country: Country | null;
  };
  index: number;
  onRemove: (index: number) => void;
  activeRankingItemId: string | null;
  setActiveRankingItemId: (id: string | null) => void;
  isDarkTheme: boolean; // Added here
}

const RankingItem: React.FC<RankingItemProps> = ({
  slot,
  index,
  onRemove,
  activeRankingItemId,
  setActiveRankingItemId,
  isDarkTheme,
}) => {
  const theme = useTheme();
  const removeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (activeRankingItemId === slot.id) {
      Animated.timing(removeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(removeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [activeRankingItemId, slot.id, removeAnim]);

  const removeOpacity = removeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const removeScale = removeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 1],
  });

  // Dynamic styles based on theme
  const dynamicStyles = StyleSheet.create({
    rankingSlot: {
      backgroundColor:
        activeRankingItemId === slot.id
          ? isDarkTheme ? '#333333' : '#e3e3e3'
          : theme.colors.surface,
      borderColor: isDarkTheme ? '#2b2b2b' : '#ccc',
      borderWidth: 1,
    },
  });

  return (
    <TouchableOpacity
      style={[styles.rankingSlot, dynamicStyles.rankingSlot]}
      onLongPress={() => setActiveRankingItemId(slot.id)}
      delayLongPress={300}
      disabled={!slot.country}
      activeOpacity={0.8}
    >
      <View style={styles.slotContent}>
        <Text style={[styles.rankNumber, { color: theme.colors.onSurface, fontSize: 20 }]}>
          {slot.rank}.
        </Text>
        {slot.country ? (
          <View style={styles.countryInfoContainer}>
            <CountryFlag isoCode={slot.country.cca2} size={20} style={styles.flag} />
            <Text style={{ color: theme.colors.onSurface, marginLeft: 6, fontSize: 14 }}>
              {slot.country.name}
            </Text>
          </View>
        ) : (
          <Text style={{ color: theme.colors.onSurface, fontStyle: 'italic', fontSize: 12 }}>
            Drop Here
          </Text>
        )}
      </View>
      <View style={styles.actionContainer}>
        {/* Animated "x" button */}
        <Animated.View style={{ opacity: removeOpacity, transform: [{ scale: removeScale }] }}>
          {activeRankingItemId === slot.id && (
            <TouchableOpacity
              onPress={() => onRemove(index)}
              style={styles.removeButton}
            >
              <Ionicons name="close-circle" size={24} color="red" />
            </TouchableOpacity>
          )}
        </Animated.View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  rankingSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 12,
    borderRadius: 15,
    justifyContent: 'space-between',
    minWidth: 150,
  },
  slotContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rankNumber: {
    fontSize: 20,
    marginRight: 12,
    fontWeight: 'bold',
  },
  countryInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  flag: {
    width: 20,
    height: 15,
    borderRadius: 2,
  },
  actionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  removeButton: {
    marginLeft: 8,
  },
});

export default RankingItem;
