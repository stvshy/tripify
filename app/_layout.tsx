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
  
  // Ukrywanie splash screena po załadowaniu czcionek i danych
// Use 'fontsLoaded' consistently
// useEffect(() => {
//   const prepareApp = async () => {
//     if (fontsLoaded) {
//       await SplashScreen.hideAsync(); // Ukrycie splash screena
//       setAppIsReady(true);
//     }
//   };
//   prepareApp();
// }, [fontsLoaded]);


  // Ekran ładowania, gdy czcionki lub dane nie są gotowe

  if (!appIsReady || !initialRouteName) {
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
    <Stack initialRouteName={initialRouteName} screenOptions={{ headerShown: false }}>
      {/* Your Stack Screens */}
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
