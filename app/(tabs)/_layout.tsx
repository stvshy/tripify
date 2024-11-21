// screens/TabLayout.tsx
import React, { useEffect, useState, useContext } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs, useRouter } from 'expo-router';
import { Pressable, Text, StyleSheet } from 'react-native';
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
const db = getFirestore();

// Definicje typów dla nazw ikon
type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];
type MaterialCommunityIconsName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];
type FontistoName = React.ComponentProps<typeof Fontisto>['name'];
type OcticonsName = React.ComponentProps<typeof Octicons>['name'];
type AntDesignName = React.ComponentProps<typeof AntDesign>['name'];

interface TabBarIconProps {
  type: 'Ionicons' | 'MaterialCommunityIcons' | 'Fontisto' | 'Octicons' | 'AntDesign';
  name: IoniconsName | MaterialCommunityIconsName | FontistoName | OcticonsName | AntDesignName;
  color: string;
}

const TabBarIcon: React.FC<TabBarIconProps> = ({ type, name, color }) => {
  switch (type) {
    case 'Ionicons':
      return <Ionicons name={name as IoniconsName} size={24} color={color} />;
    case 'MaterialCommunityIcons':
      return <MaterialCommunityIcons name={name as MaterialCommunityIconsName} size={24} color={color} />;
    case 'Fontisto':
      return <Fontisto name={name as FontistoName} size={24} color={color} />;
      case 'Octicons':
        return <Octicons name={name as OcticonsName} size={24} color={color} />;
        case 'AntDesign':
          return <AntDesign name={name as AntDesignName} size={24} color={color} />;
    default:
      return null;
  }
};

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
  const handleNavigateToAccount = () => {
    router.push('/account'); // Upewnij się, że masz skonfigurowany ekran /account
  };

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerTitle: () => (
          <Pressable
            onPress={handleNavigateToAccount}
            style={styles.headerTitleContainer}
          >
            {/* Wybierz jedną z poniższych opcji ikon */}
            
            {/* Opcja 1: Ionicons */}
            {/* <Ionicons
              name="person-outline" // Możesz zmienić na 'earth' jeśli używasz Ionicons dla home
              size={20}
              color={theme.colors.onSurface}
              style={styles.userIcon}
            /> */}
            
            {/* Opcja 2: MaterialCommunityIcons */}
            {/* <MaterialCommunityIcons
              name="account-outline"
              size={20}
              color={theme.colors.onSurface}
              style={styles.userIcon}
            /> */}
            
           {/* Opcja 3: AntDesign */}
            <AntDesign
              name="user" // Możesz zmienić na 'earth' jeśli używasz Ionicons dla home
              size={20}
              color={theme.colors.onSurface}
              style={styles.userIcon}
            />
            <Text style={[styles.headerTitleText, { color: theme.colors.onSurface }]}>
              {nickname ? nickname : 'Welcome'}
            </Text>
          </Pressable>
        ),
        headerRight: () => (
          <Pressable onPress={handleLogout}>
            
            {/* Opcja 1: Ionicons */}
            {/* <Ionicons
              name="exit-outline" // 'exit-outline' z Ionicons
              size={23}
              color={theme.colors.onSurface}
              style={{ marginRight: 15 }}
            /> */}
            
            {/* Opcja 2: MaterialCommunityIcons */}
            {/* <MaterialCommunityIcons
              name="location-exit"
              size={21}
              color={theme.colors.onSurface}
              style={{ marginRight: 15 }}
            /> */}
            {/* Opcja 3: Octicons */}
            {/* <Octicons
              name="sign-out"
              size={21}
              color={theme.colors.onSurface}
              style={{ marginRight: 15 }}
            /> */}
           {/* Opcja 3: AntDesign */}
            <AntDesign
              name="logout" // Możesz zmienić na 'earth' jeśli używasz Ionicons dla home
              size={17}
              color={theme.colors.onSurface}
              style={styles.logoutIcon}
            />
          </Pressable>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '',
          tabBarIcon: ({ color }) => (

            // Opcja 1: Fontisto
            // <TabBarIcon type="Fontisto" name="world-o" color={color} />
            
            // Opcja 2: Ionicons
            <TabBarIcon type="Ionicons" name="earth" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="two"
        options={{
          title: '',
          tabBarIcon: ({ color }) => (
            // Wybierz jedną z poniższych opcji ikon
            
            // Opcja 1: MaterialCommunityIcons
            <TabBarIcon type="MaterialCommunityIcons" name="map-marker-circle" color={color} />
            
            // Opcja 2: MaterialCommunityIcons
            // <TabBarIcon type="MaterialCommunityIcons" name="airplane-check" color={color} />
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
  },
  userIcon: {
    marginRight: 8,
  },
  logoutIcon: {
    marginRight: 17,
  },
  headerTitleText: {
    fontSize: 16,
  },
});