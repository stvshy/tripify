// app/(tabs)/_layout.tsx
import React, { useEffect, useState, useContext } from 'react';
import { 
  View, 
  Text, 
  Pressable, 
  StyleSheet, 
  useWindowDimensions, 
  SafeAreaView,
  Alert,
} from 'react-native';
import { Tabs, useRouter, usePathname } from 'expo-router';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { getFirestore, doc, getDoc, collection, query, where, onSnapshot, QuerySnapshot } from 'firebase/firestore';
import { auth } from '../config/firebaseConfig';
import { ThemeContext } from '../config/ThemeContext';
import { useTheme } from 'react-native-paper';
import LoadingScreen from '@/components/LoadingScreen';
import { AntDesign, Ionicons, FontAwesome6 } from '@expo/vector-icons';
import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';

// Initialize Firestore
const db = getFirestore();

// Custom TabBarButton component
const CustomTabBarButton: React.FC<BottomTabBarButtonProps> = ({ children, onPress }) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [
      styles.customTabButton,
      pressed && styles.pressedTabButton, // Add pressed effect
    ]}
  >
    {children}
  </Pressable>
);

// DynamicHeaderRight Component to handle dynamic header based on active tab
interface DynamicHeaderRightProps {
  activeRoute: string;
  friendRequestsCount: number;
  handleNavigateToFriendRequests: () => void;
}

const DynamicHeaderRight: React.FC<DynamicHeaderRightProps> = ({
  activeRoute,
  friendRequestsCount,
  handleNavigateToFriendRequests,
}) => {
  const theme = useTheme();

  if (activeRoute === 'index') {
    // Search icon, no action yet
    return (
      <Pressable
        onPress={() => {}}
        style={({ pressed }) => [
          styles.headerRightContainer,
          pressed && styles.pressedHeaderRight, // Add pressed effect
        ]}
      >
        <AntDesign
          name="search1"
          size={20}
          color={theme.colors.onSurface}
          style={styles.headerIcon}
        />
      </Pressable>
    );
  } else if (activeRoute === 'two') {
    // Countries visited counter
    // Since the counter is displayed in the tab icon, no additional header content is needed
    return null;
  } else if (activeRoute === 'three') {
    // Mail icon with badge
    return (
      <Pressable
        onPress={handleNavigateToFriendRequests}
        style={({ pressed }) => [
          styles.headerRightContainer,
          pressed && styles.pressedHeaderRight, // Add pressed effect
        ]}
      >
        <Ionicons
          name="mail-outline"
          size={24}
          color={theme.colors.onSurface}
          style={styles.headerIcon}
        />
        {friendRequestsCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{friendRequestsCount}</Text>
          </View>
        )}
      </Pressable>
    );
  } else {
    return null;
  }
};

export default function TabLayout() {
  const { isDarkTheme } = useContext(ThemeContext);
  const theme = useTheme(); // Using useTheme hook
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [loading, setLoading] = useState(true);
  const [nickname, setNickname] = useState<string | null>(null);
  const [countriesVisitedCount, setCountriesVisitedCount] = useState<number>(0);
  const [totalCountries, setTotalCountries] = useState<number>(0);
  const [friendRequestsCount, setFriendRequestsCount] = useState<number>(0);
  const router = useRouter();
  const pathname = usePathname(); // Get current path
  const window = useWindowDimensions();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
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
            const countriesVisited = userData?.countriesVisited || [];

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
            setCountriesVisitedCount(countriesVisited.length);

            // Fetch total number of countries with error handling
            try {
              const totalCountriesSnapshot = await getDoc(doc(db, 'metadata', 'countries'));
              if (totalCountriesSnapshot.exists()) {
                const data = totalCountriesSnapshot.data();
                if (data && typeof data.total === 'number') {
                  setTotalCountries(data.total);
                } else {
                  console.warn('Total countries field is missing or not a number.');
                  setTotalCountries(0);
                }
              } else {
                console.warn('metadata/countries document does not exist.');
                setTotalCountries(0);
              }
            } catch (error) {
              console.error('Error fetching total countries:', error);
              Alert.alert('Error', 'Failed to fetch total countries.');
              setTotalCountries(0);
            }

            // Fetch friend requests count with error handling
            try {
              const friendRequestsQuery = query(
                collection(db, 'friendRequests'),
                where('receiverUid', '==', currentUser.uid),
                where('status', '==', 'pending')
              );

              const unsubscribeFriendRequests = onSnapshot(
                friendRequestsQuery,
                (snapshot: QuerySnapshot<any>) => {
                  setFriendRequestsCount(snapshot.size);
                },
                (error) => {
                  console.error('Error fetching friend requests:', error);
                  Alert.alert('Error', 'Failed to fetch friend requests.');
                }
              );

              // Optional: Store unsubscribe function if needed
              // For now, it's managed by the onAuthStateChanged cleanup

            } catch (error) {
              console.error('Error setting up friend requests listener:', error);
              Alert.alert('Error', 'Failed to set up friend requests listener.');
            }
          } else {
            router.replace('/welcome');
          }
        } catch (error) {
          console.error('Error during authentication state change:', error);
          Alert.alert('Error', 'An unexpected error occurred.');
        }
      } else {
        router.replace('/welcome');
      }
      setLoading(false);
    });

    // Clean up authentication listener on unmount
    return () => unsubscribe();
  }, [router]);

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
      Alert.alert('Error', 'Failed to log out. Please try again.');
    }
  };

  const handleNavigateToFriendRequests = () => {
    router.push('/community/friendRequests');
  };

  // Determine active route name based on pathname
  let activeRoute = 'index'; // default
  if (pathname.startsWith('/three')) {
    activeRoute = 'three';
  } else if (pathname.startsWith('/two')) {
    activeRoute = 'two';
  } else if (pathname.startsWith('/index')) {
    activeRoute = 'index';
  }

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
          height: window.height * 0.067, // Scaled height of tab bar
          borderTopWidth: 0, // Remove top border of tab bar
          justifyContent: 'center', // Center icons vertically
        },
        tabBarItemStyle: {
          justifyContent: 'center',
          alignItems: 'center', // Center icons horizontally
          marginTop: window.height * 0.014,
        },
        headerStyle: {
          backgroundColor: theme.colors.surface,
          height: window.height * 0.105, // Set header height
          shadowOpacity: 0, // Remove shadow for cleaner look on iOS
          elevation: 0, // Remove shadow for cleaner look on Android
        },
        headerTitle: () => (
          <SafeAreaView>
            <Pressable
              onPress={() => router.push('/account')}
              style={({ pressed }) => [
                styles.headerTitleContainer,
                pressed && styles.pressedHeader, // Add pressed effect
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
          <DynamicHeaderRight 
            activeRoute={activeRoute}
            friendRequestsCount={friendRequestsCount}
            handleNavigateToFriendRequests={handleNavigateToFriendRequests}
          />
        ),
      }}
    >
      <Tabs.Screen
        name="three"
        options={{
          title: '',
          // Adding custom tabBarButton
          tabBarButton: (props) => (
            <CustomTabBarButton onPress={props.onPress}>
              {props.children}
            </CustomTabBarButton>
          ),
          tabBarIcon: ({ color }) => (
            <View style={styles.tabIconContainer}>
              <Ionicons name="mail-outline" size={26} color={color} />
              {friendRequestsCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{friendRequestsCount}</Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: '',
          // Adding custom tabBarButton
          tabBarButton: (props) => (
            <CustomTabBarButton onPress={props.onPress}>
              {props.children}
            </CustomTabBarButton>
          ),
          tabBarIcon: ({ color }) => (
            <Ionicons name="search" size={26} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="two"
        options={{
          title: '',
          // Adding custom tabBarButton
          tabBarButton: (props) => (
            <CustomTabBarButton onPress={props.onPress}>
              {props.children}
            </CustomTabBarButton>
          ),
          tabBarIcon: ({ color }) => (
            <View style={styles.tabIconContainer}>
              <FontAwesome6 name="list-check" size={22} color={color} />
              {totalCountries > 0 && (
                <Text style={[styles.counterText, { color }]}>{`${countriesVisitedCount}/${totalCountries}`}</Text>
              )}
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

// Styles
const styles = StyleSheet.create({
  customTabButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pressedTabButton: {
    opacity: 0.6, // Highlight effect by reducing opacity
  },
  tabIconContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    right: -6,
    top: -3,
    backgroundColor: 'red',
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  counterText: {
    position: 'absolute',
    top: 0,
    right: -10,
    fontSize: 10,
    fontWeight: 'bold',
    backgroundColor: 'transparent', // Or a semi-transparent color if desired
  },
  headerRightContainer: {
    marginRight: 16,
    position: 'relative',
  },
  pressedHeaderRight: {
    opacity: 0.6, // Highlight effect by reducing opacity
  },
  headerIcon: {
    // Adjust icon positioning if needed
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressedHeader: {
    opacity: 0.6, // Highlight effect by reducing opacity
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
