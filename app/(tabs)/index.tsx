import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { auth, db } from '../config/firebaseConfig';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { router } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';

export default function HomeScreen() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [user, setUser] = useState(auth.currentUser);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setUserEmail(currentUser?.email || null);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const checkUserStatus = async () => {
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
  
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const isVerified = user.emailVerified;
          const nickname = userData?.nickname;
          const firstLoginComplete = userData?.firstLoginComplete;

          if (!isVerified) {
            router.replace('/welcome');
            return;
          }
          if (!nickname) {
            router.replace('/setNickname');
            return;
          }
          if (!firstLoginComplete) {
            router.replace('/chooseCountries');
            return;
          }
        }
      } else {
        router.replace('/welcome');
      }
    };

    if (user) {
      checkUserStatus();
    }
  }, [user]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUserEmail(null);
      setUser(null);
      router.replace('/welcome');
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
