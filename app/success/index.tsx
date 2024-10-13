import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { auth, db } from '../config/firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import FontAwesome from '@expo/vector-icons/FontAwesome';

export default function RegistrationSuccessScreen() {
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        const intervalId = setInterval(async () => {
          await user.reload(); // Refreshes user data to get the latest emailVerified status
          if (user.emailVerified) {
            const userDocRef = doc(db, 'users', user.uid);
            try {
              await updateDoc(userDocRef, { isVerified: true });
              console.log("User verification status updated to true in Firestore.");
              clearInterval(intervalId); // Clear interval once verified
            } catch (error) {
              console.error("Error updating verification status:", error);
            }
          }
        }, 2000); // Check every 2 seconds

        // Clear interval and unsubscribe on unmount
        return () => {
          clearInterval(intervalId);
          unsubscribe();
        };
      }
    });

    const timer = setTimeout(async () => {
      await auth.signOut();
      router.replace('/login');
    }, 7000);

    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  return (
    <View style={styles.container}>
      <FontAwesome name="check-circle" size={100} color="green" />
      <Text style={styles.message}>Account Created Successfully!</Text>
      <Text style={styles.subMessage}>Please verify your email to log in.</Text>
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
