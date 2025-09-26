import { Stack } from "expo-router";
import { useTheme } from "react-native-paper";

export default function TwoStack() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
        presentation: "transparentModal",
        animation: "default",
        gestureEnabled: false,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      />
      <Stack.Screen
        name="chooseVisitedCountries"
        options={{
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      />
    </Stack>
  );
}
