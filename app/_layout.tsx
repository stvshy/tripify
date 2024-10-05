// RootLayout.tsx (zmodyfikowane)
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';  // Dodanie signOut
import { auth } from './config/firebaseConfig';                     // Konfiguracja Firebase
import { useColorScheme } from '@/components/useColorScheme';
import { Pressable, Text } from 'react-native';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  const [user, setUser] = useState<User | null>(null);  // Przechowywanie użytkownika
  const router = useRouter();

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  // Nasłuchiwanie zmian w autoryzacji Firebase
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);  // Ustawienie użytkownika po zalogowaniu lub wylogowaniu
      if (!currentUser) {
        router.push('/welcome');  // Przekierowanie na ekran powitalny, jeśli użytkownik nie jest zalogowany
      }
    });

    return () => unsubscribe(); // Zatrzymanie nasłuchiwania po zamknięciu aplikacji
  }, [router]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav user={user} />;
}

// Dodanie wyświetlania e-maila zalogowanego użytkownika oraz przycisku wylogowania
function RootLayoutNav({ user }: { user: User | null }) {
  const colorScheme = useColorScheme();
  const router = useRouter();

  // Funkcja wylogowania
  const handleLogout = async () => {
    try {
      await signOut(auth);  // Wylogowanie użytkownika z Firebase
      router.replace('/welcome');  // Przekierowanie na ekran powitalny po wylogowaniu
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        {user ? (
          <Stack.Screen
            name="(tabs)"
            options={{
              headerShown: false,  // Ukrycie całego nagłówka dla zakładek
            }}
          />
        ) : (
          <Stack.Screen name="welcome" options={{ headerShown: false }} />
        )}
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}
