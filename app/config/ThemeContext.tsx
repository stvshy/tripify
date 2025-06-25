// app/config/ThemeContext.tsx
import React, {
  createContext,
  useState,
  useMemo,
  ReactNode,
  useCallback,
} from "react";
import {
  MD3DarkTheme as PaperDarkTheme,
  MD3LightTheme as PaperDefaultTheme,
  Provider as PaperProvider,
  MD3Theme,
} from "react-native-paper";
import { Appearance } from "react-native"; // <-- POPRAWKA: Import Appearance
import { storage } from "./storage";

const THEME_KEY = "user-theme";

interface ThemeContextProps {
  toggleTheme: () => void;
  isDarkTheme: boolean;
}

// <-- POPRAWKA: Poprawnie wyeksportowany ThemeContext
export const ThemeContext = createContext<ThemeContextProps>({
  toggleTheme: () => {},
  isDarkTheme: false,
});

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  // Przy starcie odczytaj motyw z pamięci lub użyj domyślnego
  const [isDarkTheme, setIsDarkTheme] = useState(() => {
    const storedTheme = storage.getString(THEME_KEY);
    if (storedTheme) {
      return storedTheme === "dark";
    }
    return Appearance.getColorScheme() === "dark"; // Domyślny z systemu
  });

  const toggleTheme = useCallback(() => {
    setIsDarkTheme((prevTheme) => {
      const newTheme = !prevTheme;
      storage.set(THEME_KEY, newTheme ? "dark" : "light");
      console.log("Theme toggled to:", newTheme ? "dark" : "light");
      return newTheme;
    });
  }, []);

  const theme: MD3Theme = useMemo(() => {
    if (isDarkTheme) {
      return {
        ...PaperDarkTheme,
        colors: {
          ...PaperDarkTheme.colors,
          primary: "#bf80ff",
          surfaceVariant: "#2c2c2c",
          outline: "#555555",
        },
      };
    } else {
      return {
        ...PaperDefaultTheme,
        colors: {
          ...PaperDefaultTheme.colors,
          primary: "#ae05ea",
          surfaceVariant: "#f0efef",
          outline: "#cccccc",
        },
      };
    }
  }, [isDarkTheme]);

  return (
    <ThemeContext.Provider value={{ toggleTheme, isDarkTheme }}>
      <PaperProvider theme={theme}>{children}</PaperProvider>
    </ThemeContext.Provider>
  );
};
