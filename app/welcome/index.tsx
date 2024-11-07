import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, Image } from 'react-native';
import { TextInput, Button } from 'react-native-paper';
import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
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

  // Dodano `resendTimer` i `setResendTimer`
  const [resendTimer, setResendTimer] = useState<number>(0);
  const [isFocused, setIsFocused] = useState({ identifier: false, password: false });

  useEffect(() => {
    if (resendTimer > 0) {
      const timerId = setInterval(() => setResendTimer((prev: number) => prev - 1), 1000); // Typowanie `prev` jako `number`
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
        {/* Kontener dla logo */}
        <View style={styles.logoContainer}>
        <Image 
          source={require('../../assets/images/tripify-icon.png')}           style={styles.logo} 
          resizeMode="contain" // Ustawienie, aby obraz nie był przycięty
        />
      </View>
      {/* Tytuł powitalny */}
      <Text style={styles.title}>Welcome to Tripify!</Text>
      <Text style={styles.subtitle}>Log in or create an account to start your journey!</Text>

      {/* Email Input */}
      <View style={[styles.inputContainer, isFocused.identifier && styles.inputFocused]}>
        <TextInput
          label="Email or nickname"
          value={identifier}
          onChangeText={setIdentifier}
          onFocus={() => setIsFocused({ ...isFocused, identifier: true })}
          onBlur={() => setIsFocused({ ...isFocused, identifier: false })}
          keyboardType="default"
          style={[styles.input, !isFocused.identifier && styles.inputUnfocusedText]}
          autoCapitalize="none"
          theme={{
            colors: {
              primary: isFocused.identifier ? '#6a1b9a' : 'transparent', // 4) Usunięcie fioletowej linii w trybie nieaktywnym
              placeholder: '#6a1b9a',
            }
          }}
          underlineColor="transparent" 
          left={
            <TextInput.Icon 
              icon="account" 
              size={27} 
              style={styles.icon}
              color={isFocused.identifier ? '#6a1b9a' : '#606060'} // Fioletowy, gdy focused, szary w trybie unfocused
            />
          }
        />
      </View>

      {/* Password Input */}
      <View style={[styles.inputContainer, isFocused.password && styles.inputFocused]}>
        <TextInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          onFocus={() => setIsFocused({ ...isFocused, password: true })}
          onBlur={() => setIsFocused({ ...isFocused, password: false })}
          secureTextEntry={!showPassword}
          style={[styles.input, !isFocused.password && styles.inputUnfocusedText]}
          theme={{
            colors: {
              primary: isFocused.password ? '#6a1b9a' : 'transparent', // 4) Usunięcie fioletowej linii w trybie nieaktywnym
              placeholder: '#6a1b9a',
            }
          }}
          underlineColor="transparent"
          left={
            <TextInput.Icon 
              icon="lock" 
              size={27} 
              style={styles.icon}
              color={isFocused.password ? '#6a1b9a' : '#606060'} // Fioletowy, gdy focused, szary w trybie unfocused
            />
          }
          right={
            <TextInput.Icon
              icon={showPassword ? 'eye-off' : 'eye'}
              onPress={() => setShowPassword(!showPassword)}
              color={isFocused.password ? '#6a1b9a' : '#606060'} // Fioletowy, gdy focused, szary w trybie unfocused
            />
          }
        />
      </View>

      {errorMessage && <Text style={styles.error}>{errorMessage}</Text>}



      <Button mode="contained" onPress={handleLogin} style={styles.loginButton}>
        Log In
      </Button>
      <Button mode="contained" onPress={() => router.push('/registerChoice')} style={styles.registerButton}>
        Create your account
      </Button>

      {/* Separator with 'or' */}
      <View style={styles.separatorContainer}>
        <View style={styles.line} />
        <Text style={styles.orText}>or</Text>
        <View style={styles.line} />
      </View>

      <Button
        mode="text"
        onPress={() => {}}
        style={styles.facebookButton}
        icon={() => <FontAwesome name="facebook" size={24} color="#FFF" />}
        labelStyle={styles.facebookButtonText}
      >
        Continue with Facebook
      </Button>

      <View style={styles.bottomContainer}>
        <Button
          mode="text"
          onPress={() => router.push('/forgotPassword')}
          style={styles.forgotPasswordButton}
          labelStyle={styles.forgotPasswordLabel}
        >
          Forgot password?
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  
    padding: 16,
  },
  logo: {
    width: 200, // Ustaw szerokość logo
    height: 200, // Ustaw wysokość logo
    // marginBottom: 24, // Odstęp między logo a tytułem
  },
  logoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20, // Odstęp między logo a tytułem
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
    borderRadius: 25,
    overflow: 'hidden',
    marginBottom: 15,
  },
  input: {
    paddingLeft: 1, //  Zapewnia miejsce dla ikony, bez przesuwania tekstu na prawo
    backgroundColor: '#E0E0E0',
    height: 55, // Stała wysokość pola tekstowego
  },
  inputFocused: {
    borderColor: '#6a1b9a',
    borderWidth: 2,
  },
  inputUnfocusedText: {
    fontSize: 15, // 1) Mniejsza czcionka dla etykiety w trybie nieaktywnym
  },
  icon: {
    marginLeft: 10, // Przesunięcie ikony w prawo
  },
  error: {
    color: 'red',
    fontSize: 14,
    textAlign: 'center',
  },
  loginButton: {
    marginTop: 8,
    backgroundColor: '#6a1b9a',
  },
  registerButton: {
    marginTop: 11,
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
  bottomContainer: {
    position: 'absolute',
    bottom: 10, // Odległość od dołu ekranu
    alignSelf: 'center',
  },
  forgotPasswordButton: {
    marginTop: 10,
  },
  forgotPasswordLabel: {
    fontSize: 13,
    color: '#6a1b9a',
  },
  
});