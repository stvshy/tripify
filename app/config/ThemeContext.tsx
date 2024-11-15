// ThemeContext.tsx

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

  const theme: MD3Theme = useMemo(() => {
    if (isDarkTheme) {
      return {
        ...PaperDarkTheme,
        colors: {
          ...PaperDarkTheme.colors,
          primary: '#a678e0', // Jaśniejszy fiolet w trybie ciemnym
          surfaceVariant: '#2c2c2c', // Przyciemnione tło dla zaznaczonych elementów w trybie ciemnym
          outline: '#555555', // Przyciemnione obramowanie flag i separatorów w trybie ciemnym
          // Możesz dodać inne dostosowane kolory tutaj
        },
      };
    } else {
      return {
        ...PaperDefaultTheme,
        colors: {
          ...PaperDefaultTheme.colors,
          primary: '#9d23ea', // Fioletowy kolor przycisku i innych elementów w trybie jasnym
          surfaceVariant: '#f5f4f4', // Jaśniejsze tło dla zaznaczonych elementów w trybie jasnym
          outline: '#cccccc', // Jasne obramowanie flag i separatorów w trybie jasnym
          // Możesz dodać inne dostosowane kolory tutaj
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
