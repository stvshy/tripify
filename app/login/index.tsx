import React, { useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { TextInput, Button } from 'react-native-paper';
import { signInWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { auth } from '../config/firebaseConfig';
import { useRouter } from 'expo-router';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [verificationMessage, setVerificationMessage] = useState<string | null>(null);
  const router = useRouter();

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

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

  const handleLogin = async () => {
    setErrorMessage(null);
    setVerificationMessage(null);

    if (!validateEmail(email)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    if (!validatePassword()) {
      return;
    }

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
    
        if (!user.emailVerified) {
            await sendEmailVerification(user);
    
            // Ustawienie komunikatów
            setErrorMessage("Please verify your email to log in."); // Czerwony komunikat
            setVerificationMessage("Your account has not yet been verified. Please check your email inbox for the verification link."); // Szary komunikat
    
            // Wylogowanie użytkownika w tle, bez zmiany ekranu
            await auth.signOut();
    
            return; // Zatrzymujemy akcję bez przekierowania
        }

      router.replace('/');
    } catch (error: any) {
      console.log("Login error:", error.code, error.message);

      if (error.code === 'auth/too-many-requests') {
        setErrorMessage('Too many login attempts or your account has not yet been verified via email.');
      } else {
        switch (error.code) {
          case 'auth/user-not-found':
            setErrorMessage('No account was found with this email address.');
            break;
          case 'auth/wrong-password':
            setErrorMessage('The password you entered is incorrect.');
            break;
          default:
            setErrorMessage('The login credentials you entered are invalid.');
        }
      }
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Log In</Text>

      <TextInput
        label="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
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

      <Button mode="contained" onPress={handleLogin}style={styles.button}>
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
    marginTop: 2
  },
  verificationMessage: {
    color: '#555555', // ciemny szary
    fontSize: 12,
  },
  button: {
    marginTop: 18,        // Zwiększony margines nad przyciskiem
    // paddingVertical: 10,  // Dodane wyśrodkowanie pionowe
    // width: '100%',        // Przyciski na całą szerokość
  },
});

