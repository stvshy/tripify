import React, { useEffect, useState } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs, useRouter } from 'expo-router';
import { Pressable, View, ActivityIndicator, Text } from 'react-native';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { auth } from '../config/firebaseConfig';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

const db = getFirestore();

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={28} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [nickname, setNickname] = useState<string | null>(null); // Store nickname
  const [userData, setUserData] = useState<any>(null);
  const router = useRouter();

  const fetchUserData = async (userId: string) => {
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) {
      return userDoc.data();
    }
    return null;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true);
      if (currentUser) {
        setUser(currentUser);
        const data = await fetchUserData(currentUser.uid);
        setUserData(data);
      } else {
        setUser(null);
        setUserData(null);
        router.replace('/welcome');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);
  
  useEffect(() => {
    if (!loading && user && userData) {
      const {  nickname, firstLoginComplete } = userData;

      // Sprawdź status weryfikacji użytkownika
      if (!user.emailVerified) {
        router.replace('/welcome');
        return;
      }

      // Sprawdź, czy użytkownik ustawił nick
      if (!nickname) {
        router.replace('/setNickname');
        return;
      }

      // Sprawdź, czy użytkownik wybrał kraje
      if (!firstLoginComplete) {
        router.replace('/chooseCountries');
        return;
      }
    }
  }, [user, userData, loading, router]);

  useEffect(() => {
    const fetchNickname = async () => {
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setNickname(data.nickname || null);
        }
      }
    };
    fetchNickname();
  }, [user]);
  

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={Colors[colorScheme ?? 'light'].tint} />
      </View>
    );
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
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: true,
        headerTitle: () => (
          <Text style={{ fontSize: 17 }}>
              {nickname ? nickname : 'Welcome'}
          </Text>
        ),
        headerRight: () => (
          <Pressable onPress={handleLogout}>
            <FontAwesome
              name="sign-out"
              size={26}
              color="black"
              style={{ marginRight: 15 }}
            />
          </Pressable>
        ),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: '',
          tabBarIcon: ({ color }) => <TabBarIcon name="code" color={color} />,
        }}
      />
      <Tabs.Screen
        name="two"
        options={{
          title: '',
          tabBarIcon: ({ color }) => <TabBarIcon name="code" color={color} />,
        }}
      />
    </Tabs>
  );
}
