import React, { useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { TextInput, Button } from 'react-native-paper';
import { signInWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import { auth } from '../config/firebaseConfig';
import { useRouter } from 'expo-router';

const db = getFirestore();

export default function LoginScreen() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [verificationMessage, setVerificationMessage] = useState<string | null>(null);
  const router = useRouter();

  const validatePassword = () => {
    if (password.length < 6) {
      setErrorMessage('Your password must contain at least 6 characters.');
      return false;
    }
    if (!/[A-Z]/.test(password)) {
      setErrorMessage('Your password must include at least one uppercase letter.');
      return false;
    }
    if (!/[0-9]/.test(password)) {
      setErrorMessage('Your password must include at least one numeric character.');
      return false;
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      setErrorMessage('Your password must include at least one special character.');
      return false;
    }
    return true;
  };

  const isEmail = (input: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);

  const handleLogin = async () => {
    setErrorMessage(null);
    setVerificationMessage(null);

    if (!password || !validatePassword()) return;

    try {
        let email = identifier;

        if (!isEmail(identifier)) {
            const lowerCaseNickname = identifier.toLowerCase();
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('nickname', '==', lowerCaseNickname));
            const querySnapshot = await getDocs(q);
            console.log("Snapshot size:", querySnapshot.size); // Sprawdzamy, czy mamy wynik
            if (querySnapshot.empty) {
                setErrorMessage('No account found with this nickname.');
                return;
            }
            const userData = querySnapshot.docs[0].data();
            email = userData.email;
            console.log("Mapped email from nickname:", email);
        }

        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        if (!user.emailVerified) {
            console.log("User's email is not verified. Checking if re-sending is allowed.");
            if (!verificationMessage) { // Jeśli nie wysłaliśmy jeszcze wiadomości
                try {
                    await sendEmailVerification(user);
                } catch (emailError) {
                    console.error("Failed to send verification email:", emailError);
                }
            }
            setErrorMessage("Please verify your email to log in.");
            setVerificationMessage("Your account has not yet been verified. Please check your email inbox for the verification link.");
            return;
        }
        

        router.replace('/');
    } catch (error: any) {
        console.log("Login error:", error.code, error.message);

        if (error.code === 'auth/too-many-requests') {
            setErrorMessage('Too many login attempts. Try again later.');
        } else if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-email') {
            setErrorMessage('No account was found with this email or nickname.');
        } else if (error.code === 'auth/wrong-password') {
            setErrorMessage('The password you entered is incorrect.');
        } else {
            setErrorMessage('The login credentials you entered are invalid.');
        }
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Log In</Text>

      <TextInput
        label="Email or Nickname"
        value={identifier}
        onChangeText={setIdentifier}
        keyboardType="default"
        style={styles.input}
        error={!!errorMessage && errorMessage.includes('email')}
      />

      <TextInput
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry={!showPassword}
        style={styles.input}
        error={!!errorMessage && errorMessage.includes('password')}
        right={
          <TextInput.Icon
            icon={showPassword ? 'eye-off' : 'eye'}
            onPress={() => setShowPassword(!showPassword)}
          />
        }
      />

      {errorMessage && <Text style={styles.error}>{errorMessage}</Text>}
      {verificationMessage && <Text style={styles.verificationMessage}>{verificationMessage}</Text>}

      <Button mode="contained" onPress={handleLogin} style={styles.button}>
        Log In
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  title: {
    marginBottom: 20,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  input: {
    marginBottom: 16,
  },
  error: {
    color: 'red',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 3,
    marginTop: 2,
  },
  verificationMessage: {
    color: '#555555',
    fontSize: 12,
  },
  button: {
    marginTop: 18,
  },
});