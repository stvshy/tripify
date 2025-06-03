// app/(registration)/_layout.tsx
import { Stack } from "expo-router";
import { Platform } from "react-native";

export default function RegistrationGroupLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        presentation: "card", // Kluczowe dla zachowania stosu i animacji slide

        // --- Opcje dostosowania animacji ---

        // 1. Użycie predefiniowanej opcji 'animation' (jeśli wspierana i daje pożądany efekt)
        // animation: Platform.OS === 'ios' ? 'slide_from_right' : 'default', // 'default' na Androidzie często jest dobrym slide
        // Możesz też spróbować 'ios' na obu platformach, jeśli chcesz identycznego zachowania:
        animation: "ios", // To powinno dać animację slide-from-right na obu platformach

        // 2. Bardziej zaawansowana kontrola (jeśli @react-navigation/stack jest zainstalowane)
        // Jeśli masz zainstalowany @react-navigation/stack (np. npm install @react-navigation/stack@^6.3.0)
        // i chcesz użyć CardStyleInterpolators:
        // cardStyleInterpolator: Platform.OS === 'ios'
        //   ? CardStyleInterpolators.forHorizontalIOS
        //   : CardStyleInterpolators.forHorizontalIOS, // Możesz wybrać inny dla Androida

        // Gesty
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
