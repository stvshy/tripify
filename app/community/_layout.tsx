// app/community/_layout.tsx
import React, { useContext, useCallback } from "react";
import { Stack, useFocusEffect } from "expo-router";
import { useTheme, IconButton } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { ThemeContext } from "../config/ThemeContext";
import { TouchableOpacity, View, Dimensions, Text } from "react-native";
import { useRouter } from "expo-router";
import { useCommunityStore } from "../store/communityStore";

export default function CommunityLayout() {
  const { toggleTheme, isDarkTheme } = useContext(ThemeContext);
  const theme = useTheme();
  const router = useRouter();
  const { height } = Dimensions.get("window");

  const listenForCommunityData = useCommunityStore(
    (state) => state.listenForCommunityData
  );
  const cleanup = useCommunityStore((state) => state.cleanup);

  useFocusEffect(
    useCallback(() => {
      listenForCommunityData();
      return () => cleanup();
    }, [listenForCommunityData, cleanup])
  );

  return (
    <Stack
      screenOptions={{
        // Domyślne opcje dla ekranów, które NIE mają customowego nagłówka
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
              style={{ marginLeft: 16 }} // Dodajemy padding dla spójności
            />
          </TouchableOpacity>
        ),
        contentStyle: {
          backgroundColor: theme.colors.background,
        },
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="index" options={{ title: "Your Friends" }} />
      <Stack.Screen
        name="friendRequests"
        options={{
          // ✅ KLUCZOWA ZMIANA: Zamiast tworzyć osobny komponent,
          // definiujemy JSX nagłówka bezpośrednio tutaj.
          header: ({ navigation, options }) => {
            // Mamy dostęp do wszystkiego ze scope'u CommunityLayout!
            // (theme, toggleTheme, isDarkTheme, height)
            return (
              <View
                style={{
                  backgroundColor: theme.colors.surface,
                  paddingTop: height * 0.05, // <-- Twój upragniony padding
                  paddingBottom: 12,
                  paddingHorizontal: 16,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  // Można dodać dolną linię dla estetyki
                  borderBottomWidth: 0.5,
                  borderBottomColor: theme.colors.outline,
                }}
              >
                {/* Lewa strona - Przycisk Wstecz */}
                <View style={{ flex: 1, alignItems: "flex-start" }}>
                  <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons
                      name="arrow-back"
                      size={26}
                      color={theme.colors.onSurface}
                      style={{ marginLeft: -3 }}
                    />
                  </TouchableOpacity>
                </View>

                {/* Środek - Tytuł */}
                <View style={{ flex: 3, alignItems: "center" }}>
                  <Text
                    style={{
                      fontSize: 19,
                      fontWeight: "600",
                      color: theme.colors.onSurface,
                    }}
                  >
                    {options.title ?? "Friend Requests"}
                  </Text>
                </View>

                {/* Prawa strona - Przycisk Zmiany Motywu */}
                <View style={{ flex: 1, alignItems: "flex-end" }}>
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
                    style={{ margin: -10 }} // Ujemny margines, aby powiększyć obszar dotyku
                  />
                </View>
              </View>
            );
          },
        }}
      />
    </Stack>
  );
}
