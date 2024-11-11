import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { auth, db } from '../config/firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { doc, getDoc } from 'firebase/firestore';

export default function RegistrationSuccessScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isVerified, setIsVerified] = useState(false);
  const [countdown, setCountdown] = useState(7);
  const [showSuccessScreen, setShowSuccessScreen] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Sprawdzenie, czy użytkownik zweryfikował e-mail
        await user.reload();
        const emailVerified = user.emailVerified;
        setIsVerified(emailVerified);

        if (emailVerified) {
          // Sprawdzenie w Firestore czy użytkownik przeszedł ekran wyboru krajów
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            const userData = userDoc.data();
            const firstLoginComplete = userData?.firstLoginComplete;

            // Jeśli użytkownik nie przeszedł wyboru krajów, ustaw przekierowanie
            if (!firstLoginComplete) {
              setTimeout(() => {
                router.replace('/chooseCountries');
              }, 7000);
              return;
            }
          }
          // Jeśli wszystko jest poprawne, przekieruj do strony głównej po odliczaniu
          setTimeout(() => {
            router.replace('/');
          }, 7000);
        } else {
          // Jeśli e-mail nie jest zweryfikowany, przekieruj do welcome po odliczaniu
          setTimeout(() => {
            router.replace('/welcome');
          }, 7000);
        }
      } else {
        setTimeout(() => {
          router.replace('/welcome');
        }, 7000);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  // Timer do odliczania przed przekierowaniem
  useEffect(() => {
    if (!loading) {
      const interval = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);

      if (countdown === 0) {
        setShowSuccessScreen(false);
      }

      return () => clearInterval(interval);
    }
  }, [loading, countdown]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="green" />
      </View>
    );
  }

  if (showSuccessScreen) {
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

  return null;
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
