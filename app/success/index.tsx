import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { auth } from '../config/firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import FontAwesome from '@expo/vector-icons/FontAwesome';

export default function RegistrationSuccessScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isVerified, setIsVerified] = useState(false);
  const [countdown, setCountdown] = useState(7);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Sprawdzamy, czy e-mail użytkownika jest zweryfikowany
        await user.reload();
        setIsVerified(user.emailVerified);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Odliczanie czasu przed przekierowaniem
  useEffect(() => {
    if (!loading) {
      const interval = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);

      // Po zakończeniu odliczania przekieruj użytkownika
      const timer = setTimeout(() => {
        if (isVerified) {
          router.replace('/');
        } else {
          router.replace('/welcome');
        }
      }, 7000);

      return () => {
        clearInterval(interval);
        clearTimeout(timer);
      };
    }
  }, [loading, isVerified, router]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="green" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FontAwesome name="check-circle" size={100} color="green" />
      {isVerified ? (
        <Text style={styles.message}>Account Created and Verified Successfully!</Text>
      ) : (
        <>
          <Text style={styles.message}>Account Created Successfully!</Text>
          <Text style={styles.subMessage}>Please verify your email to log in.</Text>
        </>
      )}
      <Text style={styles.countdown}>Redirecting in {countdown} seconds...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFF',
  },
  message: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'green',
    textAlign: 'center',
    marginVertical: 20,
  },
  subMessage: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    marginTop: 10,
  },
  countdown: {
    fontSize: 16,
    color: '#888',
    marginTop: 20,
  },
});
