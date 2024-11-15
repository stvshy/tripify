import React, { createContext, useState, useMemo, ReactNode } from 'react';
import {
  MD3DarkTheme as PaperDarkTheme,
  MD3LightTheme as PaperDefaultTheme,
  Provider as PaperProvider,
  MD3Theme,
} from 'react-native-paper';

interface ThemeContextProps {
  toggleTheme: () => void;
  isDarkTheme: boolean;
}

export const ThemeContext = createContext<ThemeContextProps>({
  toggleTheme: () => {},
  isDarkTheme: false,
});

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const [isDarkTheme, setIsDarkTheme] = useState(false);

  const toggleTheme = () => {
    setIsDarkTheme((prevTheme) => !prevTheme);
    console.log('Theme toggled to:', !isDarkTheme ? 'dark' : 'light');
  };

  const theme: MD3Theme = useMemo(
    () => (isDarkTheme ? PaperDarkTheme : PaperDefaultTheme),
    [isDarkTheme]
  );

  return (
    <ThemeContext.Provider value={{ toggleTheme, isDarkTheme }}>
      <PaperProvider theme={theme}>{children}</PaperProvider>
    </ThemeContext.Provider>
  );
};

