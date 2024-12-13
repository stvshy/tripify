// app/community/_layout.tsx
import React from 'react';
import { Stack } from 'expo-router';
import { useTheme } from 'react-native-paper';

export default function CommunityLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerTintColor: theme.colors.onSurface,
      }}
    >
      {/* Zaktualizowany tytuł na "Znajomi" */}
      <Stack.Screen name="index" options={{ title: 'Znajomi' }} />
      <Stack.Screen name="search" options={{ title: 'Szukaj Znajomych' }} />
      <Stack.Screen name="friends" options={{ title: 'Twoi Znajomi' }} />
      <Stack.Screen name="friendRequests" options={{ title: 'Zaproszenia' }} />
    </Stack>
  );
}
