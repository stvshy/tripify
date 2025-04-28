// app/community/_layout.tsx
import React, { useContext } from 'react';
import { Stack } from 'expo-router';
import { useTheme, IconButton } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../../app/config/ThemeContext';
import { TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function CommunityLayout() {
  const { toggleTheme, isDarkTheme } = useContext(ThemeContext);
  const theme = useTheme();
  const router = useRouter();

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerTintColor: theme.colors.onSurface,
        headerTitleAlign: 'center',
        headerTitleStyle: {
          fontSize: 19, // Increase the font size
          fontWeight: '600', // Make the font bold
        },
        headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
            <Ionicons 
              name="arrow-back" 
              size={26} // Increased icon size
              color={theme.colors.onSurface} 
              style={{ marginLeft: -1 }} // Optional margin
            />
            </TouchableOpacity>
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
              style={{ marginRight: -7 }} // Add marginRight here
            />
          ),
        }} 
      />
    </Stack>
  );
}
