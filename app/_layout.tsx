import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DefaultTheme } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { auth } from './config/firebaseConfig';
import { View, StyleSheet, ImageBackground, Image, ActivityIndicator } from 'react-native';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  const [user, setUser] = useState<User | null>(null);
  const [appIsReady, setAppIsReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (error) {
      console.error("Font loading error:", error);
      return;
    }
  }, [error]);

  // Sprawdzanie stanu zalogowania użytkownika
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      console.log("Auth state changed:", currentUser);
      setUser(currentUser);

      if (!currentUser) {
        console.log("No user found, navigating to /welcome");
        router.push('/welcome');
      } else {
        console.log("User found, navigating to /");
        router.push('/');
      }
    });

    return () => unsubscribe();
  }, [router]);

  // Ukrycie splash screena po załadowaniu czcionek
  useEffect(() => {
    if (loaded) {
      setAppIsReady(true);
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  // Ekran ładowania
  if (!loaded || !appIsReady) {
    return (
      <ImageBackground
        source={require('../assets/images/gradient5.png')}
        style={styles.background}
      >
        <View style={styles.centerContainer}>
          <Image source={require('../assets/images/tripify-icon.png')} style={styles.logo} />
          <ActivityIndicator size="large" color="#FFF" style={styles.loader} />
        </View>
      </ImageBackground>
    );
  }

  return (
    <RootLayoutNav user={user} />
  );
}

function RootLayoutNav({ user }: { user: User | null }) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace('/welcome');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {user ? (
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      ) : (
        <Stack.Screen name="welcome" options={{ headerShown: false }} />
      )}
      <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  loader: {
    marginTop: 20,
  },
});
