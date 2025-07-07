// app/community/_layout.tsx
import React, { useContext, useCallback } from "react";
import { Stack, useFocusEffect } from "expo-router"; // Dodaj useFocusEffect
import { useTheme, IconButton } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { ThemeContext } from "../config/ThemeContext";
import { TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { useCommunityStore } from "../store/communityStore"; // Importuj store

export default function CommunityLayout() {
  const { toggleTheme, isDarkTheme } = useContext(ThemeContext);
  const theme = useTheme();
  const router = useRouter();

  // --- NOWA, KLUCZOWA CZĘŚĆ ---
  // Pobierz funkcje ze store'u
  const listenForCommunityData = useCommunityStore(
    (state) => state.listenForCommunityData
  );
  const cleanup = useCommunityStore((state) => state.cleanup);

  // Użyj useFocusEffect na poziomie całego layoutu
  useFocusEffect(
    useCallback(() => {
      console.log("CommunityLayout FOCUSED - starting listeners.");
      listenForCommunityData();

      // Funkcja czyszcząca zostanie wywołana, gdy opuścisz całą sekcję Community
      return () => {
        console.log("CommunityLayout UNFOCUSED - cleaning up listeners.");
        cleanup();
      };
    }, [listenForCommunityData, cleanup])
  );
  // -------------------------

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Stack
        screenOptions={{
          // ... twoje opcje bez zmian
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
          contentStyle: {
            backgroundColor: theme.colors.background,
          },
          animation: "slide_from_right",
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
