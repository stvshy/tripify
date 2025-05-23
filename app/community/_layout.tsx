// app/community/_layout.tsx
import React, { useContext } from "react";
import { Stack } from "expo-router";
import { useTheme, IconButton } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
// Poprawiona ścieżka, jeśli ThemeContext jest w app/config
import { ThemeContext } from "../config/ThemeContext";
import { TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";

export default function CommunityLayout() {
  const { toggleTheme, isDarkTheme } = useContext(ThemeContext);
  const theme = useTheme();
  const router = useRouter();

  return (
    // Ten View jest kluczowy. Upewnij się, że theme.colors.background jest nieprzezroczysty.
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: theme.colors.surface,
          },
          headerTintColor: theme.colors.onSurface,
          headerTitleAlign: "center",
          headerTitleStyle: {
            fontSize: 19,
            fontWeight: "600",
          },
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons
                name="arrow-back"
                size={26}
                color={theme.colors.onSurface}
                style={{ marginLeft: -1 }}
              />
            </TouchableOpacity>
          ),
          // contentStyle ustawia tło dla obszaru *wewnątrz* karty ekranu.
          // To jest prawidłowe i powinno działać.
          contentStyle: {
            backgroundColor: theme.colors.background,
          },
          animation: "slide_from_right",
          // Upewnijmy się, że nagłówek nie jest ustawiony na przezroczysty,
          // co mogłoby wpłynąć na zachowanie karty. Domyślnie jest false.
          headerTransparent: false,
        }}
      >
        <Stack.Screen name="index" options={{ title: "Your Friends" }} />
        <Stack.Screen
          name="friendRequests"
          options={{
            title: "Friend Requests",
            headerRight: () => (
              <IconButton
                icon={() =>
                  isDarkTheme ? (
                    <Ionicons
                      name="sunny"
                      size={24}
                      color={theme.colors.onSurface}
                    />
                  ) : (
                    <Ionicons
                      name="moon"
                      size={24}
                      color={theme.colors.onSurface}
                    />
                  )
                }
                onPress={toggleTheme}
                accessibilityLabel="Change Theme"
                style={{ marginRight: -7 }}
              />
            ),
          }}
        />
      </Stack>
    </View>
  );
}
