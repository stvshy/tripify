// app/(tabs)/_layout.tsx
import React, { useEffect, useState, useContext } from 'react';
import { View, Text, StyleSheet, useWindowDimensions, SafeAreaView, Pressable } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { getFirestore, doc, getDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { auth } from '../config/firebaseConfig';
import { ThemeContext } from '../config/ThemeContext';
import { useTheme } from 'react-native-paper';
import LoadingScreen from '@/components/LoadingScreen';
import AntDesign from '@expo/vector-icons/AntDesign';
import Ionicons from '@expo/vector-icons/Ionicons';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { CountriesProvider, useCountries } from '../config/CountryContext';
import { FontAwesome } from '@expo/vector-icons';

const db = getFirestore();

// Custom TabBarButton component
const CustomTabBarButton: React.FC<BottomTabBarButtonProps> = ({ children, onPress }) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [
      styles.customTabButton,
      pressed && styles.pressedTabButton,
    ]}
  >
    {children}
  </Pressable>
);

// Badge component for displaying counts
const Badge: React.FC<{ count: number }> = ({ count }) => {
  if (count <= 0) return null;
  return (
    <View style={styles.badgeContainer}>
      <Text style={styles.badgeText}>{count}</Text>
    </View>
  );
};

export default function TabLayout() {
  return (
    <CountriesProvider>
      <TabLayoutContent />
    </CountriesProvider>
  );
}

const TabLayoutContent: React.FC = () => {
  const { isDarkTheme } = useContext(ThemeContext);
  const theme = useTheme();
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [loading, setLoading] = useState(true);
  const [nickname, setNickname] = useState<string | null>(null);
  const router = useRouter();
  const window = useWindowDimensions();
  const { visitedCountriesCount } = useCountries();
  const [friendRequestsCount, setFriendRequestsCount] = useState<number>(0);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        if (!currentUser.emailVerified) {
          router.replace('/welcome');
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
          console.log(`User data loaded: ${nickname}`);
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

  useEffect(() => {
    if (user) {
      // Listener for friend requests count (where receiverUid == user.uid and status == 'pending')
      const friendRequestsQuery = query(
        collection(db, 'friendRequests'),
        where('receiverUid', '==', user.uid),
        where('status', '==', 'pending')
      );
      const unsubscribeFriendRequests = onSnapshot(friendRequestsQuery, (snapshot) => {
        setFriendRequestsCount(snapshot.size);
        console.log(`Friend requests count updated: ${snapshot.size}`);
      });

      return () => {
        unsubscribeFriendRequests();
      };
    }
  }, [user]);

  if (loading) {
    return <LoadingScreen showLogo={true} />;
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
    router.push('/account');
  };

  return (
    <Tabs
      screenOptions={{
        tabBarIconStyle: {
          marginTop: window.height * 0.014,
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          height: window.height * 0.067,
          borderTopWidth: 0,
          justifyContent: 'center',
        },
        tabBarItemStyle: {
          justifyContent: 'center',
          alignItems: 'center',
          marginTop: window.height * 0.014,
        },
        headerStyle: {
          backgroundColor: theme.colors.surface,
          height: window.height * 0.105,
          shadowOpacity: 0,
          elevation: 0,
        },
        headerTitle: () => (
          <SafeAreaView>
            <Pressable
              onPress={handleNavigateToAccount}
              style={({ pressed }) => [
                styles.headerTitleContainer,
                pressed && styles.pressedHeader,
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
        // Remove global headerRight
      }}
    >
      {/* Three Tab (Community) */}
      <Tabs.Screen
        name="three"
        options={{
          title: '',
          tabBarButton: (props) => (
            <CustomTabBarButton onPress={props.onPress}>
              {props.children}
            </CustomTabBarButton>
          ),
          tabBarIcon: ({ color }) => (
            <Ionicons name="people" size={26} color={color} />
          ),
          headerRight: () => (
            <Pressable
              onPress={() => router.push('/community/friendRequests')}
              style={({ pressed }) => [
                styles.headerRightContainer,
                pressed && styles.pressedHeaderRight,
              ]}
            >
              <View style={{ position: 'relative' }}>
                <Ionicons name="mail-outline" size={24} color={theme.colors.onSurface} />
                <Badge count={friendRequestsCount} />
              </View>
            </Pressable>
          ),
        }}
      />

      {/* Index Tab (Main) */}
      <Tabs.Screen
        name="index"
        options={{
          title: '',
          tabBarButton: (props) => (
            <CustomTabBarButton onPress={props.onPress}>
              {props.children}
            </CustomTabBarButton>
          ),
          tabBarIcon: ({ color }) => (
            <Ionicons name="earth" size={26} color={color} />
          ),
          headerRight: () => (
            <Pressable
              onPress={() => {}}
              style={({ pressed }) => [
                styles.headerRightContainer,
                pressed && styles.pressedHeaderRight,
              ]}
            >
              <FontAwesome name="search" size={24} color={theme.colors.onSurface} />
            </Pressable>
          ),
        }}
      />

      {/* Two Tab (ChooseCountries) */}
      <Tabs.Screen
        name="two"
        options={{
          title: '',
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
          headerRight: () => (
            <View style={styles.visitedCountriesContainer}>
              <Text style={[styles.visitedCountriesText, { color: theme.colors.onSurface }]}>
                {visitedCountriesCount}/195
              </Text>
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
    opacity: 0.6,
  },
  headerRightContainer: {
    marginRight: 16,
  },
  pressedHeaderRight: {
    opacity: 0.6,
  },
  pressedTabButton: {
    opacity: 0.6,
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
    marginLeft: -4,
  },
  headerTitleText: {
    fontSize: 16,
  },
  badgeContainer: {
    position: 'absolute',
    right: -6,
    top: -3,
    backgroundColor: '#8A2BE2', // Purple color
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
    minWidth: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  visitedCountriesContainer: {
    marginRight: 16,
    backgroundColor: '#8A2BE2', // Purple color
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  visitedCountriesText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
