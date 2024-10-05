import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { TextInput, Button } from 'react-native-paper';
import { signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebaseConfig';
import { useRouter } from 'expo-router'; // Importowanie routera

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loggedInEmail, setLoggedInEmail] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const router = useRouter(); // Inicjalizacja routera do przekierowań

  // Nasłuchuj zmian autoryzacji i ustaw e-mail zalogowanego użytkownika
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setLoggedInEmail(user.email); // Użytkownik zalogowany
        router.replace('/'); // Przekierowanie na stronę główną
      } else {
        setLoggedInEmail(null);
      }
    });

    return unsubscribe;
  }, [router]);

  const handleLogin = async () => {
    try {
      if (password.length < 6) {
        setErrorMessage('Hasło musi mieć przynajmniej 6 znaków.');
        return;
      }

      // Sprawdzenie, czy hasło zawiera znak specjalny
      if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        setErrorMessage('Hasło musi zawierać co najmniej jeden znak specjalny.');
        return;
      }

      await signInWithEmailAndPassword(auth, email, password);
      setErrorMessage(null);  // Reset błędu po udanym logowaniu
    } catch (error: any) {
      // Obsługa różnych błędów Firebase
      switch (error.code) {
        case 'auth/invalid-email':
          setErrorMessage('Niepoprawny adres e-mail.');
          break;
        case 'auth/user-not-found':
          setErrorMessage('Nie znaleziono użytkownika z tym adresem e-mail.');
          break;
        case 'auth/wrong-password':
          setErrorMessage('Niepoprawne hasło.');
          break;
        case 'auth/too-many-requests':
          setErrorMessage('Zbyt wiele prób logowania. Spróbuj później.');
          break;
        default:
          setErrorMessage('Wystąpił nieznany błąd. Spróbuj ponownie.');
      }
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>

      {/* Pokazywanie e-maila zalogowanego użytkownika */}
      {loggedInEmail && <Text style={styles.loggedInEmail}>Zalogowany jako: {loggedInEmail}</Text>}

      <TextInput
        label="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        style={styles.input}
      />

      <TextInput
        label="Hasło"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
      />

      {/* Pokazywanie błędów */}
      {errorMessage && <Text style={styles.error}>{errorMessage}</Text>}

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
  loggedInEmail: {
    marginBottom: 20,
    fontSize: 16,
    color: 'green',
    textAlign: 'center',
  },
});
