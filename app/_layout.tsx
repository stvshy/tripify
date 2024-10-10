// RootLayout.tsx
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DefaultTheme } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { auth } from './config/firebaseConfig';
import { Pressable, Text, View, StyleSheet } from 'react-native';

// Custom theme with a fixed electric blue background color
const CustomTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#0EE7FE', // Electric blue background
  },
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        router.push('/welcome');
      }
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <View style={styles.container}>
      <RootLayoutNav user={user} />
    </View>
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
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: CustomTheme.colors.background } }}>
      {user ? (
        <Stack.Screen
          name="(tabs)"
          options={{
            headerShown: false,
          }}
        />
      ) : (
        <Stack.Screen name="welcome" options={{ headerShown: false }} />
      )}
      <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CustomTheme.colors.background, // Fixed electric blue color
  },
});
