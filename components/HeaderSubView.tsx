// components/Header.tsx
import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ThemeContext } from '../app/config/ThemeContext';
import { useTheme } from 'react-native-paper';

interface HeaderProps {
  title: string;
}

const Header: React.FC<HeaderProps> = ({ title }) => {
  const { isDarkTheme, toggleTheme } = useContext(ThemeContext);
  const theme = useTheme();
  const router = useRouter();
  const { height } = Dimensions.get('window');

  const handleGoBack = () => {
    router.back();
  };

  return (
    <View style={[styles.header, { paddingTop: height * 0.03, backgroundColor: theme.colors.surface }]}>
      <TouchableOpacity onPress={handleGoBack} style={[styles.headerButton, { marginLeft: -19 }]}>
        <Ionicons name="arrow-back" size={28} color={theme.colors.onSurface} />
      </TouchableOpacity>
      <Text style={[styles.headerTitle, { color: theme.colors.onSurface }]}>{title}</Text>
      <TouchableOpacity onPress={toggleTheme} style={[styles.headerButton, { marginRight: -16 }]}>
        <Ionicons name={isDarkTheme ? 'sunny' : 'moon'} size={26} color={theme.colors.onSurface} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    // Możesz dodać inne style, jeśli potrzebne
  },
  headerButton: {
    padding: 8,
    width: 40,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
});

export default Header;
