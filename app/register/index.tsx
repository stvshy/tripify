import React, { useState } from 'react';
import { View, StyleSheet, Text, Pressable } from 'react-native';
import { TextInput } from 'react-native-paper';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../config/firebaseConfig';
import { useRouter } from 'expo-router';  // Importujemy router

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const router = useRouter();

  const handleRegister = async () => {
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

      await createUserWithEmailAndPassword(auth, email, password);
      setErrorMessage(null);  // Reset błędu po udanej rejestracji
      router.push('/login');  // Przekierowanie na ekran logowania po rejestracji
    } catch (error: any) {
      // Obsługa błędów Firebase podczas rejestracji
      switch (error.code) {
        case 'auth/email-already-in-use':
          setErrorMessage('Ten e-mail jest już zarejestrowany.');
          break;
        case 'auth/invalid-email':
          setErrorMessage('Niepoprawny adres e-mail.');
          break;
        case 'auth/weak-password':
          setErrorMessage('Hasło jest zbyt słabe.');
          break;
        default:
          setErrorMessage('Wystąpił nieznany błąd. Spróbuj ponownie.');
      }
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Załóż konto w Tripify</Text> 
      
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

      {/* Użycie Pressable z Text w środku */}
      <Pressable onPress={handleRegister} style={styles.button}>
        <Text style={styles.buttonText}>Załóż konto</Text>
      </Pressable>

      <Pressable onPress={() => router.push('/login')} style={styles.button}>
        <Text style={styles.buttonText}>Masz już konto? Zaloguj się</Text>
      </Pressable>
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
  button: {
    backgroundColor: '#007AFF',
    padding: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
