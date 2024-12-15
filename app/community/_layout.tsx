// app/community/_layout.tsx
import React, { useContext } from 'react';
import { Stack } from 'expo-router';
import { useTheme, IconButton } from 'react-native-paper';
import { AntDesign, Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../../app/config/ThemeContext';

export default function CommunityLayout() {
  const { toggleTheme, isDarkTheme } = useContext(ThemeContext);
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
      headerStyle: {
        backgroundColor: theme.colors.surface,
      },
      headerTintColor: theme.colors.onSurface,
      headerTitleAlign: 'center',
      headerTitleStyle: {
        fontSize: 20, // Increase the font size
      },
      headerLeft: () => (
        <Ionicons 
          name="arrow-back" 
          size={26} // Zwiększony rozmiar ikony
          color={theme.colors.onSurface} 
          // style={{ marginLeft: 10 }} // Opcjonalny margines
        />
      ),
    }}
  >
      <Stack.Screen name="index" options={{ title: 'Your Friends' }} />
      <Stack.Screen name="search" options={{ title: 'Find Friends' }} />
      <Stack.Screen name="friends" options={{ title: 'Your Friends' }} />
      <Stack.Screen 
      name="friendRequests" 
      options={{ 
        title: 'Friend Requests',
        headerRight: () => (
        <IconButton
          icon={() => (
          isDarkTheme 
            ? <Ionicons name="sunny" size={24} color={theme.colors.onSurface} /> 
            : <Ionicons name="moon" size={24} color={theme.colors.onSurface} />
          )}
          onPress={toggleTheme}
          accessibilityLabel="Change Theme"
          style={{ marginRight: -7 }} // Dodaj marginRight tutaj
        />
        ),
      }} 
      />
    </Stack>
  );
}
