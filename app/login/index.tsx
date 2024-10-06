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
      setErrorMessage('Hasło musi mieć przynajmniej 6 znaków.');
      return false;
    }
    if (!/[A-Z]/.test(password)) {
      setErrorMessage('Hasło musi zawierać co najmniej jedną wielką literę.');
      return false;
    }
    if (!/[0-9]/.test(password)) {
      setErrorMessage('Hasło musi zawierać co najmniej jedną cyfrę.');
      return false;
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      setErrorMessage('Hasło musi zawierać co najmniej jeden znak specjalny.');
      return false;
    }
    return true;
  };

  const handleLogin = async () => {
    setErrorMessage(null);
    setVerificationMessage(null);

    if (!validateEmail(email)) {
      setErrorMessage('Niepoprawny format adresu e-mail.');
      return;
    }

    if (!password) {
      setErrorMessage('Proszę uzupełnić hasło.');
      return;
    }

    if (!validatePassword()) {
      return;
    }

    try {
      // Próba logowania użytkownika
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Sprawdzenie, czy e-mail użytkownika został zweryfikowany
      if (!user.emailVerified) {
        // Jeśli e-mail nie jest zweryfikowany, wyślij e-mail weryfikacyjny
        await sendEmailVerification(user);
        setVerificationMessage('Twoje konto nie zostało jeszcze zweryfikowane. Wysłaliśmy Ci e-mail z linkiem do weryfikacji.');

        // Wylogowanie użytkownika, aby zapobiec dalszym próbom logowania
        await auth.signOut();
        return;
      }

      // Jeśli e-mail jest zweryfikowany, przekierowanie do aplikacji
      console.log("Logowanie udane");
      router.replace('/');
    } catch (error: any) {
      console.log("Błąd logowania:", error.code, error.message);

      // Rozróżnianie błędów Firebase
      if (error.code === 'auth/too-many-requests') {
        setErrorMessage('Zbyt wiele prób logowania. Spróbuj ponownie później.');
      } else {
        switch (error.code) {
          case 'auth/user-not-found':
            setErrorMessage('Użytkownik z tym adresem e-mail nie istnieje.');
            break;
          case 'auth/wrong-password':
            setErrorMessage('Niepoprawne hasło.');
            break;
          default:
            setErrorMessage('Wystąpił nieznany błąd. Spróbuj ponownie później.');
        }
      }
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>

      <TextInput
        label="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        style={styles.input}
        error={!!errorMessage && errorMessage.includes('e-mail')}
      />

      <TextInput
        label="Hasło"
        value={password}
        onChangeText={setPassword}
        secureTextEntry={!showPassword}
        style={styles.input}
        error={!!errorMessage && errorMessage.includes('hasło')}
        right={
          <TextInput.Icon
            icon={showPassword ? 'eye-off' : 'eye'}
            onPress={() => setShowPassword(!showPassword)}
          />
        }
      />

      {errorMessage && <Text style={styles.error}>{errorMessage}</Text>}
      {verificationMessage && <Text style={styles.verificationMessage}>{verificationMessage}</Text>}

      <Button mode="contained" onPress={handleLogin}>
        Zaloguj się
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
    marginBottom: 10,
  },
  verificationMessage: {
    color: 'green',
    marginBottom: 10,
  },
});
