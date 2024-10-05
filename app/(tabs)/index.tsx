// app/home/index.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { auth } from '../config/firebaseConfig';
import { onAuthStateChanged, signOut } from 'firebase/auth';

export default function HomeScreen() {
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserEmail(user.email);
      }
    });

    return unsubscribe;
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUserEmail(null);
    } catch (error) {
      console.error('Błąd wylogowania', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Witamy w aplikacji Tripify!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
    position: 'relative',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  userInfo: {
    position: 'absolute',
    top: 40,
    right: 10,
    alignItems: 'flex-end',
  },
  userEmail: {
    fontSize: 16,
    color: 'green',
  },
  logout: {
    fontSize: 16,
    color: 'red',
    marginTop: 5,
    textDecorationLine: 'underline',
    cursor: 'pointer',
  },
});
