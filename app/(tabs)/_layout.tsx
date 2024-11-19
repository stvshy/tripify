// screens/TabLayout.tsx
import React, { useEffect, useState, useContext } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs, useRouter } from 'expo-router';
import { Pressable, Text } from 'react-native';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { auth } from '../config/firebaseConfig';
import { ThemeContext } from '../config/ThemeContext';
import { useTheme } from 'react-native-paper'; // Importowanie useTheme
import LoadingScreen from '@/components/LoadingScreen';

const db = getFirestore();

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={28} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const { isDarkTheme } = useContext(ThemeContext);
  const theme = useTheme(); // Używanie hooka useTheme
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [loading, setLoading] = useState(true);
  const [nickname, setNickname] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        if (!currentUser.emailVerified) {
          router.replace('/verifyEmail');
          setLoading(false);
          return;
        }

        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const nickname = userData?.nickname;
          const firstLoginComplete = userData?.firstLoginComplete;

          if (!nickname) {
            router.replace('/setNickname');
            setLoading(false);
            return;
          }

          if (!firstLoginComplete) {
            router.replace('/chooseCountries');
            setLoading(false);
            return;
          }

          setUser(currentUser);
          setNickname(nickname);
        } else {
          router.replace('/welcome');
        }
      } else {
        router.replace('/welcome');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  if (loading) {
    return <LoadingScreen showLogo={false} />; // Set showLogo to false if you don't want the logo
  }

  if (!user) {
    return null;
  }

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace('/welcome');
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary, // Dynamiczny kolor aktywnego przycisku
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant, // Dynamiczny kolor nieaktywnego przycisku
        tabBarStyle: {
          backgroundColor: theme.colors.surface, // Dynamiczny kolor tła dolnego paska
        },
        headerStyle: {
          backgroundColor: theme.colors.surface, // Dynamiczny kolor tła górnego paska
        },
        headerTitleStyle: {
          color: theme.colors.onSurface, // Dynamiczny kolor tekstu tytułu
        },
        headerTitle: () => (
          <Text style={{ fontSize: 17, color: theme.colors.onSurface }}>
            {nickname ? nickname : 'Welcome'}
          </Text>
        ),
        headerRight: () => (
          <Pressable onPress={handleLogout}>
            <FontAwesome
              name="sign-out"
              size={26}
              color={theme.colors.onSurface}
              style={{ marginRight: 15 }}
            />
          </Pressable>
        ),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: '',
          tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="two"
        options={{
          title: '',
          tabBarIcon: ({ color }) => <TabBarIcon name="user" color={color} />,
        }}
      />
    </Tabs>
  );
}
