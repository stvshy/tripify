import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { auth, db } from '../config/firebaseConfig'; // Upewnij się, że masz poprawną ścieżkę
import { onAuthStateChanged } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import FontAwesome from '@expo/vector-icons/FontAwesome';

export default function RegistrationSuccessScreen() {
  const router = useRouter();

  useEffect(() => {
    // Sprawdza stan użytkownika i aktualizuje `isVerified` w Firestore
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && user.emailVerified) {
        const userDocRef = doc(db, 'users', user.uid);

        try {
          // Ustawienie pola `isVerified` na `true` w Firestore
          await updateDoc(userDocRef, { isVerified: true });
          console.log("User verification status updated to true in Firestore.");
        } catch (error) {
          console.error("Error updating verification status:", error);
        }
      }
    });

    // Wylogowanie po 7 sekundach i przekierowanie do logowania
    const timer = setTimeout(async () => {
      await auth.signOut();
      router.replace('/login');
    }, 7000);

    // Czyszczenie listenera i timera po zamknięciu komponentu
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  return (
    <View style={styles.container}>
      <FontAwesome name="check-circle" size={100} color="green" />
      <Text style={styles.message}>Account Created Successfully!</Text>
      <Text style={styles.subMessage}>
        Please verify your email to log in.
      </Text>
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
});
