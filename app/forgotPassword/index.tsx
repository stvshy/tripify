import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TextInput, Button } from 'react-native-paper';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth, db } from '../config/firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useRouter } from 'expo-router';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handlePasswordReset = async () => {
    setMessage(null);
    setError(null);

    if (!email) {
      setError('Please enter your email address.');
      return;
    }

    try {
      // Sprawdzanie, czy email istnieje w Firestore
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', email));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setError('No account found with this email.');
        return;
      }

      // Sprawdzenie, czy konto jest zweryfikowane
      const userData = querySnapshot.docs[0].data();
      if (!userData.isVerified) {
        setError('This account has not been verified.');
        return;
      }

      // Wysłanie linku resetu hasła
      await sendPasswordResetEmail(auth, email);
      setMessage('A password reset link has been sent to your email.');
    } catch (error: any) {
        console.log("Password reset error:", error.code, error.message);
        if (error.code === 'permission-denied') {
            setError("Permission denied. Please check your Firestore rules.");
        } else {
            setError("An error occurred. Please try again later.");
        }
    }
    
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reset Password</Text>
      <TextInput
        label="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        style={styles.input}
        autoCapitalize="none"
      />
      {message && <Text style={styles.successMessage}>{message}</Text>}
      {error && <Text style={styles.errorMessage}>{error}</Text>}
      <Button mode="contained" onPress={handlePasswordReset} style={styles.button}>
        Send Reset Link
      </Button>
      <Button
        mode="text"
        onPress={() => router.replace('/login')}
        style={styles.backButton}
      >
        Back to Login
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  input: { marginBottom: 16 },
  successMessage: { color: 'green', textAlign: 'center', marginBottom: 16 },
  errorMessage: { color: 'red', textAlign: 'center', marginBottom: 16 },
  button: { marginTop: 20 },
  backButton: { marginTop: 10 },
});
