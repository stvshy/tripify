// components/CountryItem.tsx

import React, { useContext, useCallback, useRef } from 'react';
import { TouchableOpacity, View, Text, StyleSheet, Animated, LayoutAnimation } from 'react-native';
import { useTheme } from 'react-native-paper';
import { FontAwesome } from '@expo/vector-icons';
import CountryFlag from 'react-native-country-flag';
import { ThemeContext } from '../app/config/ThemeContext';

interface CountryItemProps {
  item: {
    id: string;
    name: string;
    officialName: string;
    cca2: string;
    cca3: string;
    region: string;
    subregion: string;
    class: string | null;
    path: string;
  };
  onSelect: (countryCode: string) => void;
  isSelected: boolean;
}

const CountryItem: React.FC<CountryItemProps> = ({ item, onSelect, isSelected }) => {
  const theme = useTheme();
  const { isDarkTheme } = useContext(ThemeContext);
  const scaleValue = useRef(new Animated.Value(1)).current;

  const handleCheckboxPress = useCallback(() => {
    Animated.sequence([
      Animated.timing(scaleValue, { toValue: 0.8, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleValue, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();
    onSelect(item.cca2);
  }, [scaleValue, onSelect, item.cca2]);

  const handlePress = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    handleCheckboxPress();
  }, [handleCheckboxPress]);

  // Dynamiczne kolory na podstawie motywu
  const selectedBackgroundColor = isSelected
    ? theme.colors.surfaceVariant
    : theme.colors.surface;

  const flagBorderColor = theme.colors.outline;

  const checkboxBackgroundColor = isSelected
    ? theme.colors.primary
    : 'transparent';

  const checkboxBorderColor = isSelected
    ? theme.colors.primary
    : theme.colors.outline;

  const checkboxIconColor = isSelected
    ? theme.colors.onPrimary
    : 'transparent';

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={[
        styles.countryItemContainer, 
        {
          backgroundColor: selectedBackgroundColor,
          borderRadius: isSelected ? 4.2 : 8,
        },
      ]}
      activeOpacity={0.7}
    >
      <View style={[styles.countryItem, { backgroundColor: selectedBackgroundColor, borderRadius: isSelected ? 4.2 : 8 }]}>
        <View style={[styles.flagContainer, styles.flagWithBorder, { borderColor: flagBorderColor }]}>
          <CountryFlag isoCode={item.cca2} size={25} />
        </View>

        <Text style={[styles.countryText, { color: theme.colors.onSurface }]}>{item.name}</Text>

        <Animated.View
          style={[
            styles.roundCheckbox,
            {
              backgroundColor: checkboxBackgroundColor,
              borderColor: checkboxBorderColor,
              transform: [{ scale: scaleValue }],
            },
          ]}
        >
          {isSelected && <FontAwesome name="check" size={12} color={checkboxIconColor} />}
        </Animated.View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  countryItemContainer: {
    width: '100%',
    backgroundColor: 'transparent',
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#ccc',
  },
  flagContainer: {
    marginRight: 10,
    width: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 7,
  },
  flagWithBorder: {
    borderWidth: 1,
    borderRadius: 5,
    overflow: 'hidden',
  },
  countryText: {
    flex: 1,
    fontSize: 16,
    marginLeft: 5,
  },
  roundCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 7,
  },
});

export default React.memo(CountryItem);
