import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useContext, useEffect, useState } from 'react';
import { auth, db } from './config/firebaseConfig';
import { StyleSheet } from 'react-native';
import LoadingScreen from '@/components/LoadingScreen';
import { ThemeContext, ThemeProvider } from './config/ThemeContext';
import { DraxProvider } from 'react-native-drax';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { doc, getDoc } from 'firebase/firestore';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as NavigationBar from 'expo-navigation-bar';
import { useTheme } from 'react-native-paper';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'PlusJakartaSans-Bold': require('../assets/fonts/PlusJakartaSans-Bold.ttf'),
    'DMSans-Bold': require('../assets/fonts/DMSans-Bold.ttf'),
    'DMSans-SemiBold': require('../assets/fonts/DMSans-SemiBold.ttf'),
    'Inter-Bold': require('../assets/fonts/Inter-Bold.ttf'),
    'Inter-SemiBold': require('../assets/fonts/Inter-SemiBold.ttf'),
    'Inter-Regular': require('../assets/fonts/Inter-Regular.ttf'),
    'Inter-Medium': require('../assets/fonts/Inter-Medium.ttf'),
    'Figtree-Regular': require('../assets/fonts/Figtree-Regular.ttf'),
    'Figtree-Medium': require('../assets/fonts/Figtree-Medium.ttf'),
  });

  // Poprawne typowanie stanu
  const [initialRouteName, setInitialRouteName] = useState<string | null>(null);
  const [appIsReady, setAppIsReady] = useState(false);

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
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <DraxProvider>
          <ThemeProvider>
            <ThemedStatusBarAndNavBar />
            <QueryClientProvider client={queryClient}>
              <Stack initialRouteName={initialRouteName} screenOptions={{ headerShown: false }}>
                {/* Twoje Stack Screens */}
              </Stack>
            </QueryClientProvider>
          </ThemeProvider>
        </DraxProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
function ThemedStatusBarAndNavBar() {
  const { isDarkTheme } = useContext(ThemeContext);
  const theme = useTheme();
  
  useEffect(() => {
    // Ustaw kolor tła dolnej belki nawigacyjnej
    NavigationBar.setBackgroundColorAsync(theme.colors.surface);
    // Ustaw styl przycisków dolnej belki (ikony: "light" daje jasne ikony, "dark" – ciemne)
    NavigationBar.setButtonStyleAsync(isDarkTheme ? 'light' : 'dark');
  }, [isDarkTheme, theme]);

  return (
    <StatusBar
      style={isDarkTheme ? 'light' : 'dark'}
      backgroundColor="transparent"
      translucent
    />
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
