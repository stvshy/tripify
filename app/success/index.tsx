// RegistrationSuccessScreen.tsx

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { auth } from '../config/firebaseConfig';
import FontAwesome from '@expo/vector-icons/FontAwesome';

export default function RegistrationSuccessScreen() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(async () => {
      // Log out the user after 7 seconds
      await auth.signOut();
      router.replace('/login');
    }, 7000);

    // Clear the timer on unmount
    return () => clearTimeout(timer);
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