import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, Pressable } from 'react-native';
import { TextInput } from 'react-native-paper';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth'; // Import sendEmailVerification
import { auth } from '../config/firebaseConfig';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState(''); // State for password confirmation
  const [showPassword, setShowPassword] = useState(false); 
  const [showConfirmPassword, setShowConfirmPassword] = useState(false); 
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const router = useRouter();

  const [passwordRequirements, setPasswordRequirements] = useState({
    length: false,
    specialChar: false,
    upperCase: false,
    number: false,
  });

  // Live email validation
  useEffect(() => {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && !emailPattern.test(email)) {
      setEmailError('Niepoprawny adres e-mail.');
    } else {
      setEmailError(null);
    }
  }, [email]);

  // Live password validation
  useEffect(() => {
    setPasswordRequirements({
      length: password.length >= 6,
      specialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
      upperCase: /[A-Z]/.test(password),
      number: /[0-9]/.test(password),
    });
  }, [password]);

  const handleRegister = async () => {
    if (!email) {
      setErrorMessage('Proszę uzupełnić adres e-mail.');
      return;
    }

    if (!password) {
      setErrorMessage('Proszę uzupełnić hasło.');
      return;
    }

    // Check if passwords match
    if (password !== confirmPassword) {
      setErrorMessage('Hasła nie są zgodne.');
      return;
    }

    // Check if password requirements are met
    if (!passwordRequirements.length || !passwordRequirements.specialChar || !passwordRequirements.upperCase || !passwordRequirements.number) {
      setErrorMessage('Hasło musi spełniać wszystkie wymagania.');
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Send email verification
      await sendEmailVerification(user); // Sending verification email
      setErrorMessage(null);
      alert('Wysłano link do weryfikacji konta. Sprawdź swoją skrzynkę odbiorczą.');

      router.push('/login');  // Redirect to login after registration
    } catch (error: any) {
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

  const renderValidationIcon = (isValid: boolean) => (
    <FontAwesome
      name={isValid ? 'check-circle' : 'times-circle'}
      size={20}
      color={isValid ? 'green' : 'red'}
      style={styles.icon}
    />
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Załóż konto w Tripify</Text>

      {emailError && <Text style={styles.error}>{emailError}</Text>}

      <TextInput
        label="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        style={styles.input}
        error={!!emailError}
      />

      <TextInput
        label="Hasło"
        value={password}
        onChangeText={setPassword}
        secureTextEntry={!showPassword}
        style={styles.input}
        right={
          <TextInput.Icon
            icon={showPassword ? 'eye-off' : 'eye'}
            onPress={() => setShowPassword(!showPassword)}
          />
        }
      />

      <TextInput
        label="Potwierdź hasło"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry={!showConfirmPassword}
        style={styles.input}
        right={
          <TextInput.Icon
            icon={showConfirmPassword ? 'eye-off' : 'eye'}
            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
          />
        }
      />

      <View style={styles.requirementsContainer}>
        <View style={styles.requirementRow}>
          {renderValidationIcon(passwordRequirements.length)}
          <Text style={[styles.requirementText, passwordRequirements.length ? styles.valid : styles.invalid]}>
            Hasło musi mieć przynajmniej 6 znaków
          </Text>
        </View>
        <View style={styles.requirementRow}>
          {renderValidationIcon(passwordRequirements.specialChar)}
          <Text style={[styles.requirementText, passwordRequirements.specialChar ? styles.valid : styles.invalid]}>
            Hasło musi zawierać co najmniej jeden znak specjalny
          </Text>
        </View>
        <View style={styles.requirementRow}>
          {renderValidationIcon(passwordRequirements.upperCase)}
          <Text style={[styles.requirementText, passwordRequirements.upperCase ? styles.valid : styles.invalid]}>
            Hasło musi zawierać co najmniej jedną wielką literę
          </Text>
        </View>
        <View style={styles.requirementRow}>
          {renderValidationIcon(passwordRequirements.number)}
          <Text style={[styles.requirementText, passwordRequirements.number ? styles.valid : styles.invalid]}>
            Hasło musi zawierać co najmniej jedną cyfrę
          </Text>
        </View>
      </View>

      {errorMessage && <Text style={styles.error}>{errorMessage}</Text>}

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
  requirementsContainer: {
    marginBottom: 20,
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  icon: {
    marginRight: 10,
  },
  requirementText: {
    fontSize: 14,
  },
  valid: {
    color: 'green',
  },
  invalid: {
    color: 'red',
  },
});
