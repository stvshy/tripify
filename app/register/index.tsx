import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, Pressable, Dimensions } from 'react-native';
import { TextInput } from 'react-native-paper';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { auth } from '../config/firebaseConfig';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { getFirestore, setDoc, doc, serverTimestamp } from 'firebase/firestore';

const { width: screenWidth } = Dimensions.get('window');
const db = getFirestore(); // Initialize Firestore

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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

  // Real-time email validation
  useEffect(() => {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    setEmailError(email && !emailPattern.test(email) ? 'Please enter a valid email address.' : null);
  }, [email]);

  // Real-time password validation
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
      setErrorMessage('Please enter your email address.');
      return;
    }

    if (!password) {
      setErrorMessage('Please enter a password.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    if (!passwordRequirements.length || !passwordRequirements.specialChar || !passwordRequirements.upperCase || !passwordRequirements.number) {
      setErrorMessage('Password does not meet all requirements.');
      return;
    }

    try {
      // Register user with Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Create user document in Firestore with isVerified set to false
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        nickname: null, // Nickname to be set later
        isVerified: false, // Field for email verification status
        createdAt: serverTimestamp(),
        authProvider: 'email'
      });

      // Send verification email
      await sendEmailVerification(user);
      setErrorMessage(null);
      alert('A verification link has been sent to your email. Please check your inbox.');

      router.push('/setNickname'); // Redirect to set-nickname screen
    } catch (error: any) {
      // Handle Firebase Authentication errors
      switch (error.code) {
        case 'auth/email-already-in-use':
          setErrorMessage('This email is already registered.');
          break;
        case 'auth/invalid-email':
          setErrorMessage('Please enter a valid email address.');
          break;
        case 'auth/weak-password':
          setErrorMessage('The password is too weak.');
          break;
        default:
          setErrorMessage('An unknown error occurred. Please try again.');
      }
    }
  };

  const renderValidationIcon = (isValid: boolean) => (
    <FontAwesome
      name={isValid ? 'check-circle' : 'times-circle'}
      size={18}
      color={isValid ? 'green' : 'red'}
      style={styles.icon}
    />
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create an Account in Tripify</Text>

      {emailError && <Text style={styles.error}>{emailError}</Text>}

      <TextInput
        label="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        style={[styles.input, styles.roundedInput]}
        underlineColor="transparent"
        error={!!emailError}
        mode="outlined"
      />

      <TextInput
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry={!showPassword}
        style={[styles.input, styles.roundedInput]}
        underlineColor="transparent"
        mode="outlined"
        right={
          <TextInput.Icon
            icon={showPassword ? 'eye-off' : 'eye'}
            onPress={() => setShowPassword(!showPassword)}
          />
        }
      />

      <TextInput
        label="Confirm Password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry={!showConfirmPassword}
        style={[styles.input, styles.roundedInput]}
        underlineColor="transparent"
        mode="outlined"
        right={
          <TextInput.Icon
            icon={showConfirmPassword ? 'eye-off' : 'eye'}
            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
          />
        }
      />

      <View style={styles.requirementsContainer}>
        {Object.entries(passwordRequirements).map(([key, value]) => (
          <View style={styles.requirementRow} key={key}>
            {renderValidationIcon(value)}
            <Text style={[styles.requirementText, value ? styles.valid : styles.invalid]}>
              {getRequirementText(key)}
            </Text>
          </View>
        ))}
      </View>

      {errorMessage && <Text style={styles.error}>{errorMessage}</Text>}

      <Pressable onPress={handleRegister} style={styles.button}>
        <Text style={styles.buttonText}>Create Account</Text>
      </Pressable>

      <Pressable onPress={() => router.push('/login')} style={styles.button}>
        <Text style={styles.buttonText}>Already have an account? Log in</Text>
      </Pressable>
    </View>
  );
}

const getRequirementText = (key: string) => {
  switch (key) {
    case 'length':
      return 'Password must be at least 6 characters';
    case 'specialChar':
      return 'Password must contain at least one special character';
    case 'upperCase':
      return 'Password must contain at least one uppercase letter';
    case 'number':
      return 'Password must contain at least one number';
    default:
      return '';
  }
};

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
    fontSize: 14,
    backgroundColor: '#F3E5F5',
  },
  roundedInput: {
    borderRadius: 20,
  },
  error: {
    color: 'red',
    marginBottom: 10,
    fontSize: 12,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 10,
    alignItems: 'center',
    marginTop: 10,
    borderRadius: 20,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  requirementsContainer: {
    marginBottom: 20,
    maxWidth: '90%',
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  icon: {
    marginRight: 8,
    fontSize: 16,
  },
  requirementText: {
    fontSize: 12,
  },
  valid: {
    color: 'green',
  },
  invalid: {
    color: 'red',
  },
});
