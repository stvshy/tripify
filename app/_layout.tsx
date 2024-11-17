import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DefaultTheme } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { auth, db } from './config/firebaseConfig';
import { View, StyleSheet, ImageBackground, Image, ActivityIndicator } from 'react-native';
import { doc, getDoc } from 'firebase/firestore';
import LoadingScreen from '@/components/LoadingScreen';
import { ThemeProvider } from './config/ThemeContext';

SplashScreen.preventAutoHideAsync();


export default function RootLayout() {
  const [fontsLoaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  const [appIsReady, setAppIsReady] = useState(false);
  const [initialRouteName, setInitialRouteName] = useState<string | null>(null);


  useEffect(() => {
    const prepareApp = async () => {
      // Wait for fonts to load
      if (!fontsLoaded) return;

      let currentUser = auth.currentUser;

      // Wait for auth state to be determined
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
            setInitialRouteName('verifyEmail');
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
  <ThemeProvider>
    <Stack initialRouteName={initialRouteName} screenOptions={{ headerShown: false }}>
      {/* Twoje Stack Screens */}
    </Stack>
  </ThemeProvider>
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