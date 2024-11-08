import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, Image, ImageBackground, SafeAreaView, Dimensions, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { TextInput, Button } from 'react-native-paper';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LoginManager, AccessToken, GraphRequest, GraphRequestManager } from 'react-native-fbsdk-next';
import { getAuth, FacebookAuthProvider, signInWithCredential, fetchSignInMethodsForEmail, signInWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen() {
  const router = useRouter();
  const auth = getAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [verificationMessage, setVerificationMessage] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState<number>(0);
  const [isFocused, setIsFocused] = useState({ identifier: false, password: false });

  useEffect(() => {
    if (resendTimer > 0) {
      const timerId = setInterval(() => setResendTimer((prev: number) => prev - 1), 1000);
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
    <ImageBackground 
      source={require('../../assets/images/gradient5.png')}
      style={styles.background}
      imageStyle={{ resizeMode: 'cover'}}
    >
      <View style={styles.overlay} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <SafeAreaView style={styles.container}>
          <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            style={styles.scrollView}
          >
            <View style={styles.logoContainer}>
              <Image 
                source={require('../../assets/images/tripify-icon.png')} 
                style={styles.logo} 
                resizeMode="contain"
              />
            </View>
            <Text style={styles.title}>Welcome to Tripify!</Text>
            <Text style={styles.subtitle}>Log in or create an account to start your journey!</Text>

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
                    primary: isFocused.identifier ? '#6a1b9a' : 'transparent',
                    placeholder: '#6a1b9a',
                  }
                }}
                underlineColor="transparent" 
                left={
                  <TextInput.Icon 
                    icon="account" 
                    size={25} 
                    style={styles.icon}
                    color={isFocused.identifier ? '#6a1b9a' : '#606060'}
                  />
                }
              />
            </View>

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
                    primary: isFocused.password ? '#6a1b9a' : 'transparent',
                    placeholder: '#6a1b9a',
                  }
                }}
                underlineColor="transparent"
                left={
                  <TextInput.Icon 
                    icon="lock" 
                    size={25} 
                    style={styles.icon}
                    color={isFocused.password ? '#6a1b9a' : '#606060'}
                  />
                }
                right={
                  <TextInput.Icon
                    icon={showPassword ? 'eye-off' : 'eye'}
                    onPress={() => setShowPassword(!showPassword)}
                    color={isFocused.password ? '#6a1b9a' : '#606060'}
                  />
                }
              />
            </View>

            {errorMessage && <Text style={styles.error}>{errorMessage}</Text>}

            <Button
              mode="contained"
              onPress={handleLogin}
              style={styles.loginButton}
              labelStyle={styles.buttonLabel}
            >
              Log In
            </Button>

            <Button
              mode="contained"
              onPress={() => router.push('/register')}
              style={styles.registerButton}
              labelStyle={styles.buttonLabel}
            >
              Create your account
            </Button>

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
          </ScrollView>
          
          <View style={styles.footer}>
            <Button
              mode="text"
              onPress={() => router.push('/forgotPassword')}
              style={styles.forgotPasswordButton}
              labelStyle={styles.forgotPasswordLabel}
            >
              Forgot password?
            </Button>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 253, 0.11)',
  },
  container: {
    flex: 1,
    justifyContent: 'space-between', 
    alignItems: 'center',
    padding: 16,
    paddingBottom: 10,
  },
  scrollView: {
    width: '100%', 
  },
  logo: {
    width: width * 0.5,
    height: height * 0.2,
  },
  logoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 63,
  },
  title: {
    fontSize: width * 0.06,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#FFEEFCFF',
  },
  subtitle: {
    fontSize: width * 0.037,
    textAlign: 'center',
    marginBottom: 20,
    color: '#FFE3F9D1',
    marginTop: 7
  },
  inputContainer: {
    borderRadius: 25,
    overflow: 'hidden',
    marginBottom: 13,
    width: width * 0.89,
    backgroundColor: '#f0ed8f5',
  },
  input: {
    paddingLeft: 1,
    height: 52,
  },
  inputFocused: {
    borderColor: '#6a1b9a',
    borderWidth: 2,
  },
  inputUnfocusedText: {
    fontSize: 14,
  },
  icon: {
    marginLeft: 10,
  },
  error: {
    color: 'violet',
    fontSize: 12,
    textAlign: 'center',
    marginTop: -5,
    marginBottom: 15,
  },
  loginButton: {
    width: width * 0.89,
    height: 40,
    backgroundColor: '#7511b5',
    justifyContent: 'center',
    borderRadius: 25,
    marginTop: 8,
  },
  registerButton: {
    width: width * 0.89,
    height: 40,
    backgroundColor: '#5b0d8d',
    justifyContent: 'center',
    borderRadius: 25,
    marginTop: 11,
    borderWidth: 1.1,
    borderColor: '#340850',
  },
  buttonLabel: {
    fontSize: 12,
    lineHeight: 14,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  facebookButton: {
    backgroundColor: '#4267B2',
    width: width * 0.89,
    height: height * 0.05,
    justifyContent: 'center',
    borderRadius: 25,
    // marginTop: 10, 
  },
  facebookButtonText: {
    color: '#FFF',
    fontSize: 12,
    lineHeight: 18,
  },
  separatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 9,
    width: '100%', 
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#d3d3d3',
  },
  orText: {
    marginHorizontal: 10,
    color: '#bebebe',
    fontSize: 14,
  },
  footer: {
    width: '100%', 
    alignItems: 'center',
    paddingVertical: 10,
  },
  forgotPasswordButton: {
   
  },
  forgotPasswordLabel: {
    fontSize: 13,
    color: '#4a136c',
  },
  background: {
    flex: 1,
    resizeMode: 'cover',
  },
});
