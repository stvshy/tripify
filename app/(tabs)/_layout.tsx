// screens/TabLayout.tsx
import React, { useEffect, useState, useContext } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs, useRouter } from 'expo-router';
import { Pressable, Text, StyleSheet, useWindowDimensions, SafeAreaView, View } from 'react-native';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { auth } from '../config/firebaseConfig';
import { ThemeContext } from '../config/ThemeContext';
import { useTheme } from 'react-native-paper'; // Importowanie useTheme
import LoadingScreen from '@/components/LoadingScreen';
import AntDesign from '@expo/vector-icons/AntDesign';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Fontisto from '@expo/vector-icons/Fontisto';
import Octicons from '@expo/vector-icons/Octicons';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
// screens/TabLayout.tsx
import ChooseCountriesScreen from '../chooseCountries'; // Dostosuj ścieżkę, jeśli jest inna

const db = getFirestore();

// Definicja niestandardowego komponentu TabBarButton
const CustomTabBarButton: React.FC<BottomTabBarButtonProps> = ({ children, onPress }) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [
      styles.customTabButton,
      pressed && styles.pressedTabButton, // Dodanie efektu podświetlenia
    ]}
  >
    {children}
  </Pressable>
);

export default function TabLayout() {
  const { isDarkTheme } = useContext(ThemeContext);
  const theme = useTheme(); // Używanie hooka useTheme
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [loading, setLoading] = useState(true);
  const [nickname, setNickname] = useState<string | null>(null);
  const router = useRouter();
  const window = useWindowDimensions();
  
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
    return <LoadingScreen showLogo={true} />; // Set showLogo to false if you don't want the logo
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
  const handleNavigateToAccount = () => {
    router.push('/account'); // Upewnij się, że masz skonfigurowany ekran /account
  };
  const tabBarIconStyle = {
    marginTop: window.height * 0.02, // Adjust the margin to lower the icons
  };
  return (
    <Tabs
      screenOptions={{
        tabBarIconStyle: {
          marginTop: window.height * 0.014, // Adjust the margin to lower the icons
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          height: window.height * 0.067, // Skalowana wysokość tab bar
          borderTopWidth: 0, // Usunięcie górnej krawędzi paska zakładek
          justifyContent: 'center', // Wyśrodkowanie ikon w pionie
        },
        tabBarItemStyle: {
          justifyContent: 'center',
          alignItems: 'center', // Wyśrodkowanie ikon w poziomie
          marginTop: window.height * 0.014,
        },
        headerStyle: {
          backgroundColor: theme.colors.surface,
          height: window.height * 0.105, // Ustawienie wysokości nagłówka
          shadowOpacity: 0, // Usunięcie cienia dla czystszego wyglądu na iOS
          elevation: 0, // Usunięcie cienia dla czystszego wyglądu na Androidzie
        },
        headerTitle: () => (
          <SafeAreaView>
            <Pressable
              onPress={handleNavigateToAccount}
              style={({ pressed }) => [
                styles.headerTitleContainer,
                pressed && styles.pressedHeader, // Dodanie efektu podświetlenia
              ]}
            >
              <AntDesign
                name="user"
                size={19}
                color={theme.colors.onSurface}
                style={styles.userIcon}
              />
              <Text style={[styles.headerTitleText, { color: theme.colors.onSurface }]}>
                {nickname ? nickname : 'Welcome'}
              </Text>
            </Pressable>
          </SafeAreaView>
        ),
        headerRight: () => (
          <SafeAreaView>
            <Pressable
              onPress={handleLogout}
              style={({ pressed }) => [
                styles.headerRightContainer,
                pressed && styles.pressedHeaderRight, // Dodanie efektu podświetlenia
              ]}
            >
              <AntDesign
                name="logout"
                size={17}
                color={theme.colors.onSurface}
                style={styles.logoutIcon}
              />
            </Pressable>
          </SafeAreaView>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '',
            // Dodanie niestandardowego przycisku tabBarButton
            tabBarButton: (props) => (
              <CustomTabBarButton onPress={props.onPress}>
                {props.children}
              </CustomTabBarButton>
            ),
          tabBarIcon: ({ color }) => (
            <View style={styles.tabIconContainer}>
              <Ionicons name="earth" size={26} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="two"
        options={{
          title: '',
            // Dodanie niestandardowego przycisku tabBarButton
            tabBarButton: (props) => (
              <CustomTabBarButton onPress={props.onPress}>
                {props.children}
              </CustomTabBarButton>
            ),
          tabBarIcon: ({ color }) => (
            <View style={[styles.tabIconContainer, { marginTop: 1 }]}>
              <FontAwesome6 name="list-check" size={22} color={color} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressedHeader: {
    opacity: 0.6, // Opcjonalnie: zmniejszenie przezroczystości podczas naciśnięcia
  },
  headerRightContainer: {
    // Możesz dodać dodatkowe style, jeśli potrzebujesz
  },
  pressedHeaderRight: {
    opacity: 0.6, // Opcjonalnie: zmniejszenie przezroczystości podczas naciśnięcia
  },
  pressedTabButton: {
    opacity: 0.6, // Efekt podświetlenia przez zmniejszenie przezroczystości
  },
  customTabButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabIconContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userIcon: {
    marginRight: 8,
    marginLeft: -4
  },
  logoutIcon: {
    marginRight: 13,
  },
  headerTitleText: {
    fontSize: 16,
  },
});