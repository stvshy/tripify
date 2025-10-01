// app/(registration)/_layout.tsx
import { Stack } from "expo-router";
import { Platform } from "react-native";

export default function RegistrationGroupLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        presentation: "card", // Kluczowe dla zachowania stosu i animacji slide
        animation: "fade", // Zmienione z "ios" na "fade"
        gestureEnabled: true, // Włącza gest cofania (swipe)
        gestureDirection: "horizontal",
      }}
    >
      {/* Upewnij się, że nazwy odpowiadają Twojej strukturze plików */}
      <Stack.Screen name="register/index" />
      <Stack.Screen name="setNickname/index" />
      <Stack.Screen name="success/index" />
    </Stack>
  );
}
