// app/community/_layout.tsx
import React, { useCallback } from "react";
import { Stack, useFocusEffect } from "expo-router";
import { useTheme } from "react-native-paper";
import { Feather, Ionicons, MaterialIcons } from "@expo/vector-icons";
import {
  TouchableOpacity,
  View,
  Dimensions,
  Text,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import { useCommunityStore, IncomingRequest } from "../store/communityStore";

export default function CommunityLayout() {
  const theme = useTheme();
  const router = useRouter();
  const { height } = Dimensions.get("window");

  const listenForCommunityData = useCommunityStore(
    (state) => state.listenForCommunityData
  );
  const cleanup = useCommunityStore((state) => state.cleanup);
  const incomingRequests = useCommunityStore((state) => state.incomingRequests);
  const acceptFriendRequest = useCommunityStore(
    (state) => state.acceptFriendRequest
  );

  const handleAcceptAll = useCallback(async () => {
    if (!incomingRequests || incomingRequests.length === 0) return;
    for (const req of incomingRequests as IncomingRequest[]) {
      await acceptFriendRequest(req);
    }
  }, [incomingRequests, acceptFriendRequest]);

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
          fontFamily: "Figtree-Regular",
        },
        headerLeft: () => (
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={{ padding: 8, marginLeft: -6 }}
          >
            <MaterialIcons
              name="arrow-back-ios"
              size={21}
              color={theme.colors.onSurface}
              style={{ marginTop: -0.2 }}
            />
          </TouchableOpacity>
        ),
        contentStyle: {
          backgroundColor: theme.colors.background,
        },
        animation: "slide_from_right",
      }}
    >
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
                  paddingTop: height * 0.045,
                  paddingBottom: 10,
                  paddingHorizontal: 21,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                {/* Lewa strona - Przycisk Wstecz */}
                <View style={{ flex: 1, alignItems: "flex-start" }}>
                  <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={{ padding: 8, marginLeft: -10 }}
                  >
                    <MaterialIcons
                      name="arrow-back-ios"
                      size={21}
                      color={theme.colors.onSurface}
                      style={{ marginTop: -0.2 }}
                    />
                  </TouchableOpacity>
                </View>

                {/* Środek - Tytuł */}
                <View style={{ flex: 3, alignItems: "center" }}>
                  <Text
                    style={{
                      fontSize: 18.5,
                      fontWeight: "600",
                      fontFamily: "Figtree-Regular",
                      color: theme.colors.onSurface,
                    }}
                  >
                    {options.title ?? "Friend Requests"}
                  </Text>
                </View>

                {/* Prawa strona - Akceptuj wszystkie */}
                <View style={{ flex: 1, alignItems: "flex-end" }}>
                  <Pressable
                    onPress={handleAcceptAll}
                    disabled={
                      !incomingRequests || incomingRequests.length === 0
                    }
                    style={({ pressed }) => ({
                      opacity:
                        !incomingRequests || incomingRequests.length === 0
                          ? 0.4
                          : pressed
                            ? 0.6
                            : 1,
                      padding: 6,
                      marginRight: -10,
                    })}
                    accessibilityRole="button"
                    accessibilityLabel="Accept all friend requests"
                  >
                    <Ionicons
                      name="checkmark-done"
                      size={24.5}
                      color={theme.colors.onSurface}
                    />
                  </Pressable>
                </View>
              </View>
            );
          },
        }}
      />
    </Stack>
  );
}
