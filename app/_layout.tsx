import { GestureHandlerRootView } from 'react-native-gesture-handler';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DefaultTheme } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from './config/firebaseConfig';
import { View, StyleSheet } from 'react-native';
import LoadingScreen from '@/components/LoadingScreen';
import { ThemeProvider } from './config/ThemeContext';
import * as Font from 'expo-font';
import { DraxProvider } from 'react-native-drax';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { doc, getDoc } from 'firebase/firestore';

// Zapobiegamy automatycznemu ukryciu splash screena
SplashScreen.preventAutoHideAsync();

// Inicjujemy klienta React Query
const queryClient = new QueryClient();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });
  const [appIsReady, setAppIsReady] = useState(false);
  const [initialRouteName, setInitialRouteName] = useState<string | null>(null);

  useEffect(() => {
    const prepareApp = async () => {
      if (!fontsLoaded) return;

      let currentUser = auth.currentUser;
      if (currentUser === null) {
        currentUser = await new Promise((resolve) => {
          const unsubscribe = auth.onAuthStateChanged((user) => {
            unsubscribe();
            resolve(user);
          });
        });
      }

      if (currentUser) {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const isVerified = currentUser.emailVerified;
          const nickname = userData?.nickname;
          const firstLoginComplete = userData?.firstLoginComplete;

          if (!isVerified) {
            setInitialRouteName('welcome');
          } else if (!nickname) {
            setInitialRouteName('setNickname');
          } else if (!firstLoginComplete) {
            setInitialRouteName('chooseCountries');
          } else {
            setInitialRouteName('(tabs)');
          }
        } else {
          setInitialRouteName('welcome');
        }
      } else {
        setInitialRouteName('welcome');
      }

      setAppIsReady(true);
      await SplashScreen.hideAsync();
    };

    prepareApp();
  }, [fontsLoaded]);

  if (!appIsReady || !initialRouteName) {
    return <LoadingScreen />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <DraxProvider>
        <ThemeProvider>
          {/* Opakowujemy całą aplikację w QueryClientProvider */}
          <QueryClientProvider client={queryClient}>
            <Stack initialRouteName={initialRouteName} screenOptions={{ headerShown: false }}>
              {/* Twoje Stack Screens */}
            </Stack>
          </QueryClientProvider>
        </ThemeProvider>
      </DraxProvider>
    </GestureHandlerRootView>
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
