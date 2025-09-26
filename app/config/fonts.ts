// fonts.ts - Optymalizowane ładowanie fontów
import { useFonts } from "expo-font";

// Podziel fonty na krytyczne i opcjonalne
const CRITICAL_FONTS = {
  "Inter-Regular": require("../../assets/fonts/Inter-Regular.ttf"),
  "Inter-Medium": require("../../assets/fonts/Inter-Medium.ttf"),
  "Inter-SemiBold": require("../../assets/fonts/Inter-SemiBold.ttf"),
  "Inter-Bold": require("../../assets/fonts/Inter-Bold.ttf"),
};

const OPTIONAL_FONTS = {
  "PlusJakartaSans-Regular": require("../../assets/fonts/PlusJakartaSans-Regular.ttf"),
  "PlusJakartaSans-Medium": require("../../assets/fonts/PlusJakartaSans-Medium.ttf"),
  "PlusJakartaSans-SemiBold": require("../../assets/fonts/PlusJakartaSans-SemiBold.ttf"),
  "PlusJakartaSans-Bold": require("../../assets/fonts/PlusJakartaSans-Bold.ttf"),
  "PlusJakartaSans-ExtraBold": require("../../assets/fonts/PlusJakartaSans-ExtraBold.ttf"),
  "DMSans-Bold": require("../../assets/fonts/DMSans-Bold.ttf"),
  "DMSans-SemiBold": require("../../assets/fonts/DMSans-SemiBold.ttf"),
  "Figtree-Regular": require("../../assets/fonts/Figtree-Regular.ttf"),
  "Figtree-SemiBold": require("../../assets/fonts/Figtree-SemiBold.ttf"),
  "Figtree-Medium": require("../../assets/fonts/Figtree-Medium.ttf"),
  "Figtree-Bold": require("../../assets/fonts/Figtree-Bold.ttf"),
  Inter: require("../../assets/fonts/Inter-VariableFont_opsz,wght.ttf"),
  "NotoSans-Regular": require("../../assets/fonts/NotoSans-Regular.ttf"),
  "NotoSans-Medium": require("../../assets/fonts/NotoSans-Medium.ttf"),
  "NotoSans-SemiBold": require("../../assets/fonts/NotoSans-SemiBold.ttf"),
  "NotoSans-Bold": require("../../assets/fonts/NotoSans-Bold.ttf"),
  "NotoSans-Black": require("../../assets/fonts/NotoSans-Black.ttf"),
};

export function useCriticalFonts() {
  return useFonts(CRITICAL_FONTS);
}

export function useOptionalFonts() {
  return useFonts(OPTIONAL_FONTS);
}

export function useAllFonts() {
  return useFonts({ ...CRITICAL_FONTS, ...OPTIONAL_FONTS });
}
