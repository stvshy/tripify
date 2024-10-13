import React, { useEffect, useState } from 'react';
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
  const [isResendDisabled, setIsResendDisabled] = useState(false); // Stan blokady przycisku
  const [resendTimer, setResendTimer] = useState(0); // [1] Licznik w sekundach
  const router = useRouter();

    // Odliczanie co sekundę
    useEffect(() => {
        if (resendTimer > 0) {
          const timerId = setInterval(() => setResendTimer(prev => prev - 1), 1000);
          return () => clearInterval(timerId);
        }
      }, [resendTimer]);

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
        // Konwersja `identifier` na małe litery tuż przed sprawdzeniem
        let email = identifier.toLowerCase();
  
        if (!isEmail(email)) {
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('nickname', '==', email));
            const querySnapshot = await getDocs(q);
  
            if (querySnapshot.empty) {
                setErrorMessage('No account found with this nickname.');
                return;
            }
  
            const userData = querySnapshot.docs[0].data();
            email = userData.email;


            // Sprawdzenie, ile sekund zostało do odblokowania
            const emailSentAt = userData.emailSentAt;
            if (emailSentAt) {
                const elapsedSeconds = Math.floor((Date.now() - emailSentAt) / 1000);
                const remainingTime = 60 - elapsedSeconds;
                if (remainingTime > 0) {
                setResendTimer(remainingTime); // Uruchom licznik z pozostałym czasem
                }
            }
        }
  
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
  
        if (!user.emailVerified) {
            if (!verificationMessage) {
                try {
                    await sendEmailVerification(user);
                } catch (emailError) {
                    console.error("Failed to send verification email:", emailError);
                }
            }
            setErrorMessage("Please verify your email to log in.");
            setVerificationMessage("Your account has not yet been verified. Please check your email inbox for the verification link.");
            // setIsResendDisabled(false); // Umożliwia ponowne wysłanie wiadomości
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
            setErrorMessage('The password you entered is incorrect.');
        }
    }
  };
    // Funkcja ponownego wysyłania maila
    const resendVerificationEmail = async () => {
        const user = auth.currentUser;
        if (user && !user.emailVerified && resendTimer === 0) {
          try {
            await sendEmailVerification(user);
            setVerificationMessage("Verification email resent. Please check your inbox.");
            setResendTimer(60);
          } catch (error) {
            console.error("Error resending email verification:", error);
          }
        }
      };

return (
  <View style={styles.container}>
    <Text style={styles.title}>Log In</Text>

    <TextInput
        label="Email or nickname"
        value={identifier}
        onChangeText={setIdentifier}
        keyboardType="default"
        style={[styles.input, { fontSize: 14 }]} // Zastosowanie mniejszej czcionki
        error={!!errorMessage && errorMessage.includes('email')}
        autoCapitalize="none"
    />

    <TextInput
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry={!showPassword}
        style={[styles.input, { fontSize: 14 }]}
        error={!!errorMessage && errorMessage.includes('password')}
        right={
            <TextInput.Icon
            icon={showPassword ? 'eye-off' : 'eye'}
            onPress={() => setShowPassword(!showPassword)}
            />
        }
    />
    <Button
        mode="text"
        onPress={() => router.push('/forgotPassword')}
        style={styles.forgotPasswordButton}
        labelStyle={styles.forgotPasswordLabel} // Styl tekstu przycisku
        >
        Forgot password?
    </Button>


    {/* Wyświetlanie komunikatów */}
    {errorMessage && <Text style={styles.error}>{errorMessage}</Text>}
    {verificationMessage && (
      <>
        <Text style={styles.verificationMessage}>{verificationMessage}</Text>
        <Button
          mode="text"
          onPress={resendVerificationEmail}
          disabled={resendTimer > 0}
          style={styles.resendButton}
        >
          {resendTimer > 0 ? `Resend Verification Email (${resendTimer}s)` : 'Resend Verification Email'}
        </Button>
      </>
    )}

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
      marginBottom: 10, // Zmniejszony odstęp poniżej pola tekstowego
      fontSize: 15, // Mniejsza czcionka dla wpisywania danych
    },
    error: {
      color: 'red',
      fontSize: 14,
      fontWeight: 'bold',
      marginBottom: 3,
      marginTop: 2,
      textAlign: 'center',
    },
    verificationMessage: {
      color: '#555555',
      fontSize: 12,
      textAlign: 'center',
    },
    resendButton: {
      marginTop: 8,
    },
    button: {
      marginTop: 12,
    },
    forgotPasswordButton: {
      marginTop: -13, // Zmniejszenie odstępu między polem hasła a przyciskiem
      paddingHorizontal: 0,
      alignSelf: 'flex-start',
      marginLeft: -8,
    },
    forgotPasswordLabel: {
      fontSize: 11.5, // Mniejsza czcionka dla tekstu przycisku
    },
  });
  
  