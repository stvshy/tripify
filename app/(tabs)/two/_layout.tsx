import { Stack } from "expo-router";

export default function TwoStack() {
  return (
    <Stack
      screenOptions={{
        headerShown: false, // <-- wyłączamy domyślny nagłówek
      }}
    />
  );
}
