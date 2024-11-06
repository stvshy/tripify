import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { TextInput, Button } from 'react-native-paper';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LoginManager, AccessToken, GraphRequest, GraphRequestManager } from 'react-native-fbsdk-next';
import { getAuth, FacebookAuthProvider, signInWithCredential, fetchSignInMethodsForEmail, signInWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { doc, getDoc, getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';

export default function WelcomeScreen() {
  const router = useRouter();
  const auth = getAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [verificationMessage, setVerificationMessage] = useState<string | null>(null);
  const [isResendDisabled, setIsResendDisabled] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  // New state to track focus
  const [isFocused, setIsFocused] = useState({ identifier: false, password: false });

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
        setVerificationMessage("Check your email inbox for the verification link.");
        return;
      }
  
      router.replace('/');
    } catch (error: any) {
      console.error("Login error:", error.code, error.message);
      if (error.code === 'auth/too-many-requests') {
        setErrorMessage('Too many login attempts. Try again later.');
      } else if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-email') {
        setErrorMessage('No account was found with this email or nickname.');
      } else if (error.code === 'auth/wrong-password') {
        setErrorMessage('The password you entered is incorrect.');
      } else {
        setErrorMessage('Login failed. Please try again.');
      }
    }
  };

  const handleFacebookLogin = async () => {
    try {
      const result = await LoginManager.logInWithPermissions(['public_profile', 'email']);
      if (result.isCancelled) {
        Alert.alert('Login canceled');
        return;
      }
  
      const data = await AccessToken.getCurrentAccessToken();
      if (!data) {
        Alert.alert('Error', 'Failed to obtain access token.');
        return;
      }
  
      const facebookCredential = FacebookAuthProvider.credential(data.accessToken);
  
      const getFacebookEmail = async () => {
        return new Promise<string | null>((resolve) => {
          const request = new GraphRequest(
            '/me?fields=email',
            {},
            (error, result) => {
              if (error) {
                console.log('Error fetching Facebook email:', error);
                resolve(null);
              } else if (result && result.email) {
                resolve(result.email as string);
              } else {
                resolve(null);
              }
            }
          );
          new GraphRequestManager().addRequest(request).start();
        });
      };
  
      const email = await getFacebookEmail();
      if (email) {
        const signInMethods = await fetchSignInMethodsForEmail(auth, email);
        if (signInMethods.length > 0 && !signInMethods.includes('facebook.com')) {
          Alert.alert(
            'Account exists',
            `An account with this email is already associated with another login method. Please log in with: ${signInMethods[0]}.`
          );
          return;
        }
      }
  
      const userCredential = await signInWithCredential(auth, facebookCredential);
      const user = userCredential.user;
  
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists() && userDoc.data()?.nickname) {
        router.replace('/');
      } else {
        router.replace('/setNicknameFacebook');
      }
    } catch (error: any) {
      console.error('Facebook login error:', error);
      Alert.alert('Login error', 'An error occurred during Facebook login.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Tripify!</Text>
      <Text style={styles.subtitle}>Log in or create an account to start your journey!</Text>

      {/* Email Input */}
      <View style={[
        styles.inputContainer, 
        isFocused.identifier && styles.inputFocused // Conditional styling for focus
      ]}>
        <TextInput
          label="Email or nickname"
          value={identifier}
          onChangeText={setIdentifier}
          onFocus={() => setIsFocused({ ...isFocused, identifier: true })}
          onBlur={() => setIsFocused({ ...isFocused, identifier: false })}
          keyboardType="default"
          style={styles.input}
          autoCapitalize="none"
          theme={{
            colors: {
              placeholder: isFocused.identifier ? '#6a1b9a' : '#999', // Placeholder color based on focus
            }
          }}
        />
      </View>

      {/* Password Input */}
      <View style={[
        styles.inputContainer, 
        isFocused.password && styles.inputFocused // Conditional styling for focus
      ]}>
        <TextInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          onFocus={() => setIsFocused({ ...isFocused, password: true })}
          onBlur={() => setIsFocused({ ...isFocused, password: false })}
          secureTextEntry={!showPassword}
          style={styles.input}
          theme={{
            colors: {
              placeholder: isFocused.password ? '#6a1b9a' : '#999', // Placeholder color based on focus
            }
          }}
          right={
            <TextInput.Icon
              icon={showPassword ? 'eye-off' : 'eye'}
              onPress={() => setShowPassword(!showPassword)}
            />
          }
        />
      </View>

      {errorMessage && <Text style={styles.error}>{errorMessage}</Text>}
      {verificationMessage && <Text style={styles.verificationMessage}>{verificationMessage}</Text>}

      <Button mode="contained" onPress={handleLogin} style={styles.loginButton}>
        Log In
      </Button>
      <Button mode="contained" onPress={() => router.push('/registerChoice')} style={styles.registerButton}>
        Sign Up
      </Button>

      {/* Separator with 'or' */}
      <View style={styles.separatorContainer}>
        <View style={styles.line} />
        <Text style={styles.orText}>or</Text>
        <View style={styles.line} />
      </View>

      <Button
        mode="text"
        onPress={handleFacebookLogin}
        style={styles.facebookButton}
        icon={() => <FontAwesome name="facebook" size={24} color="#FFF" />}
        labelStyle={styles.facebookButtonText}
      >
        Continue with Facebook
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
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  inputContainer: {
    borderRadius: 25, // Adjust full border radius here
    overflow: 'hidden',
    marginBottom: 15,
  },
  input: {
    paddingHorizontal: 15, // Increase padding for left spacing
    backgroundColor: '#E0E0E0',
    height: 55, // Adjust height for vertical alignment of text
  },
  inputFocused: {
    borderColor: '#6a1b9a', // Border color when focused
    borderWidth: 1,
  },
  error: {
    color: 'red',
    fontSize: 14,
    textAlign: 'center',
  },
  verificationMessage: {
    color: '#555',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 10,
  },
  loginButton: {
    marginTop: 20,
    backgroundColor: '#6a1b9a',
  },
  registerButton: {
    marginTop: 10,
    backgroundColor: '#5a189a',
  },
  facebookButton: {
    backgroundColor: '#4267B2',
    marginTop: 15,
  },
  facebookButtonText: {
    color: '#FFF',
  },
  separatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 15,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#d3d3d3',
  },
  orText: {
    marginHorizontal: 10,
    color: '#555',
    fontSize: 14,
  },
});
