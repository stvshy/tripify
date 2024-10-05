// (tabs)/_layout.tsx (zmodyfikowany)
import React, { useEffect, useState } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs, useRouter } from 'expo-router';
import { Pressable, View, ActivityIndicator, Text } from 'react-native';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { auth } from '../config/firebaseConfig'; // Import Firebase
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={28} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const [user, setUser] = useState<User | null>(null);  // Przechowywanie stanu użytkownika
  const [loading, setLoading] = useState(true);  // Dodanie stanu ładowania
  const router = useRouter();  // Używamy routera do nawigacji

  // Nasłuchiwanie zmian autoryzacji
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      console.log("Current user:", currentUser);  // Logowanie użytkownika
  
      if (currentUser) {
        setUser(currentUser);  // Użytkownik zalogowany
      } else {
        setUser(null);         // Użytkownik niezalogowany
        router.replace('/welcome');  // Przekierowanie na ekran powitalny
      }
      setLoading(false);  // Koniec ładowania po sprawdzeniu stanu zalogowania
    });
  
    return () => unsubscribe();
  }, [router]);
  
  // Sprawdzanie statusu zalogowania, zanim pokażemy zakładki
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={Colors[colorScheme ?? 'light'].tint} />
      </View>
    );
  }

  if (!user) {
    return null;  // Jeśli użytkownik nie jest zalogowany, nic nie pokazujemy (przekierowanie już nastąpiło)
  }

  // Funkcja wylogowania
  const handleLogout = async () => {
    try {
      await signOut(auth);  // Wylogowanie użytkownika z Firebase
      router.replace('/welcome');  // Po wylogowaniu przekierowanie na ekran powitalny
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: true,  // Przywrócenie nagłówka
        headerTitle: () => (
          <Text style={{ fontSize: 16 }}>
            {user?.email}  {/* Wyświetlanie e-maila zalogowanego użytkownika */}
          </Text>
        ),
        headerRight: () => (
          <Pressable onPress={handleLogout}>
            <FontAwesome
              name="sign-out"
              size={25}
              color={Colors[colorScheme ?? 'light'].text}
              style={{ marginRight: 15 }}
            />
          </Pressable>
        ),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: '',  // Usunięcie napisu "index" z zakładki
          tabBarIcon: ({ color }) => <TabBarIcon name="code" color={color} />,
        }}
      />
      <Tabs.Screen
        name="two"
        options={{
          title: '',  // Usunięcie napisu "two" z zakładki
          tabBarIcon: ({ color }) => <TabBarIcon name="code" color={color} />,
        }}
      />
    </Tabs>
  );
}
