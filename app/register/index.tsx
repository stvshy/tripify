import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  ImageBackground, 
  SafeAreaView, 
  Dimensions, 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView, 
  Pressable 
} from 'react-native';
import { TextInput } from 'react-native-paper';
import FontAwesome from '@expo/vector-icons/FontAwesome'; // Możesz usunąć, jeśli nie jest potrzebny gdzie indziej
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../config/firebaseConfig';
import { useRouter } from 'expo-router';
import { getFirestore, setDoc, doc, serverTimestamp } from 'firebase/firestore';

const { width, height } = Dimensions.get('window');
const db = getFirestore();

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

  const [isFocused, setIsFocused] = useState({
    email: false,
    password: false,
    confirmPassword: false,
  });

  useEffect(() => {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    setEmailError(email && !emailPattern.test(email) ? 'Please enter a valid email address.' : null);
  }, [email]);

  useEffect(() => {
    setPasswordRequirements({
      length: password.length >= 6,
      specialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
      upperCase: /[A-Z]/.test(password),
      number: /[0-9]/.test(password),
    });
  }, [password]);

  const handleRegister = async () => {
    setErrorMessage(null);

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

    if (!passwordRequirements.length || 
        !passwordRequirements.specialChar || 
        !passwordRequirements.upperCase || 
        !passwordRequirements.number) {
      setErrorMessage('Password does not meet all requirements.');
      return;
    }

    try {
      // Create user account in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Add user data to Firestore without sending verification email yet
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        nickname: null,
        isVerified: false,
        createdAt: serverTimestamp(),
        authProvider: 'email'
      });

      setErrorMessage(null);
      router.replace('/setNickname'); // Proceed to nickname screen
    } catch (error: any) {
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
      color={isValid ? '#059c78' : '#a43267'}
      style={styles.iconRequirement}
    />
  );

  return (
    <ImageBackground 
      source={require('../../assets/images/gradient4.png')}
      style={styles.background}
      imageStyle={{ 
        resizeMode: 'cover', 
        // width: '140%', 
        // height: '120%', 
        // left: 20, 
        // top: -130, 
        // transform: [{ rotate: '28deg' }] 
      }}
    >
      <View style={styles.overlay} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <SafeAreaView style={styles.container}>
          <ScrollView
            contentContainerStyle={styles.scrollViewContent}
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
            <Text style={styles.title}>Create an account in Tripify</Text>

            {emailError && <Text style={styles.error}>{emailError}</Text>}

            {/* Email Input */}
            <View style={[styles.inputContainer, isFocused.email && styles.inputFocused]}>
              <TextInput
                label="Email"
                value={email}
                onChangeText={setEmail}
                onFocus={() => setIsFocused({ ...isFocused, email: true })}
                onBlur={() => setIsFocused({ ...isFocused, email: false })}
                keyboardType="email-address"
                style={[styles.input, !isFocused.email && styles.inputUnfocusedText]}
                theme={{
                  colors: {
                    primary: isFocused.email ? '#6a1b9a' : 'transparent',
                    placeholder: '#6a1b9a',
                    background: '#f0ed8f5',
                    text: '#000',
                    error: 'red',
                  },
                }}
                underlineColor="transparent" 
                left={
                  <TextInput.Icon 
                    icon={() => (
                      <FontAwesome 
                        name="envelope" 
                        size={20}  // Dostosowany rozmiar
                        color={isFocused.email ? '#6a1b9a' : '#606060'} 
                      />
                    )}
                    style={styles.iconLeft}
                  />
                }
                autoCapitalize="none" 
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
                    primary: isFocused.password ? '#6a1b9a' : 'transparent',
                    placeholder: '#6a1b9a',
                    background: '#f0ed8f5',
                    text: '#000',
                  },
                }}
                underlineColor="transparent"
                left={
                  <TextInput.Icon 
                    icon={() => (
                      <FontAwesome 
                        name="lock" 
                        size={23}  // Dostosowany rozmiar
                        color={isFocused.password ? '#6a1b9a' : '#606060'} 
                      />
                    )}
                    style={styles.iconLeft}
                  />
                }
                right={
                  <TextInput.Icon
                    icon={showPassword ? 'eye-off' : 'eye'}
                    size={23}
                    onPress={() => setShowPassword(!showPassword)}
                    color={isFocused.password ? '#6a1b9a' : '#606060'}
                  />
                }
              />
            </View>

            {/* Confirm Password Input */}
            <View style={[styles.inputContainer, isFocused.confirmPassword && styles.inputFocused]}>
              <TextInput
                label="Confirm Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                onFocus={() => setIsFocused({ ...isFocused, confirmPassword: true })}
                onBlur={() => setIsFocused({ ...isFocused, confirmPassword: false })}
                secureTextEntry={!showConfirmPassword}
                style={[styles.input, !isFocused.confirmPassword && styles.inputUnfocusedText]}
                theme={{
                  colors: {
                    primary: isFocused.confirmPassword ? '#6a1b9a' : 'transparent',
                    placeholder: '#6a1b9a',
                    background: '#f0ed8f5',
                    text: '#000',
                  },
                }}
                underlineColor="transparent"
                left={
                  <TextInput.Icon 
                    icon={() => (
                      <FontAwesome 
                        name="lock" 
                        size={23}  // Dostosowany rozmiar
                        color={isFocused.confirmPassword ? '#6a1b9a' : '#606060'} 
                      />
                    )}
                    style={styles.iconLeft}
                  />
                }
                right={
                  <TextInput.Icon
                    icon={showConfirmPassword ? 'eye-off' : 'eye'}
                    size={23}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    color={isFocused.confirmPassword ? '#6a1b9a' : '#606060'}
                  />
                }
              />
            </View>

            {/* Password Requirements */}
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

            {/* Error Message */}
            {errorMessage && <Text style={styles.error}>{errorMessage}</Text>}
          </ScrollView>
          
          {/* Footer with Buttons */}
          <View style={styles.footer}>
            <Pressable onPress={handleRegister} style={styles.registerButton}>
              <Text style={styles.registerButtonText}>Create account</Text>
            </Pressable>

            <Pressable onPress={() => router.push('/welcome')} style={styles.loginRedirectButton}>
              <Text style={styles.loginRedirectText}>Already have an account? Log in</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </ImageBackground>
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
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  background: {
    flex: 1,
    resizeMode: 'cover',
  },
  container: {
    flex: 1,
    justifyContent: 'space-between', // Rozmieszczenie zawartości od góry do dołu
    alignItems: 'center',
    padding: 16,
    paddingBottom: 10, // Mniejszy padding na dole, kontrola przez footer
  },
  scrollView: {
    width: '100%', // Upewnij się, że ScrollView zajmuje całą szerokość
  },
  scrollViewContent: {
    flexGrow: 1,
    justifyContent: 'center', // Możesz dostosować w razie potrzeby
    alignItems: 'center',
  },
  logo: {
    width: width * 0.5,
    height: height * 0.2,
  },
  logoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 40, // Zmniejszony margines górny dla lepszego rozmieszczenia
  },
  title: {
    fontSize: width * 0.06, // Zastosowanie proporcjonalnej wielkości
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 23,
    color: '#FFEEFCFF',
    marginTop: 5,
  },
  inputContainer: {
    borderRadius: 28, // Zwiększony borderRadius dla lepszej estetyki
    overflow: 'hidden',
    marginBottom: 13,
    width: width * 0.89,
    backgroundColor: '#f0ed8f5',
    borderWidth: 2,
    borderColor: 'transparent', // Domyślny kolor obramowania
  },
  input: {
    paddingLeft: 1,
    height: 52,
    fontSize: 14,
  },
  inputFocused: {
    borderColor: '#6a1b9a', // Kolor obramowania w stanie fokusu
  },
  inputUnfocusedText: {
    // Możesz dodać dodatkowe style dla tekstu w unfocused state, jeśli potrzebujesz
  },
  iconLeft: {
    marginLeft: 10,
  },
  iconRight: {
    marginRight: 10,
  },
  iconRequirement: {
    marginRight: 8,
    fontSize: 16,
  },
  error: {
    color: 'violet', // Upewnij się, że kolor pasuje do reszty aplikacji
    marginBottom: 10,
    fontSize: 12,
    textAlign: 'center',
  },
  requirementsContainer: {
    marginTop: 13,
    marginBottom: 20,
    marginLeft: -14,
    width: '90%',
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  requirementText: {
    fontSize: 12,
  },
  valid: {
    color: '#50baa1',
  },
  invalid: {
    color: 'violet',
  },
  footer: {
    width: '100%', // Upewnij się, że footer zajmuje całą szerokość
    alignItems: 'center',
    paddingVertical: 10,
  },
  registerButton: {
    backgroundColor: '#7511b5',
    paddingVertical: 12,
    paddingHorizontal: 30,
    alignItems: 'center',
    borderRadius: 25,
    width: '90%',
    marginBottom: 10,
    elevation: 2, // Dodanie cienia dla efektu uniesienia (Android)
    shadowColor: '#000', // Dodanie cienia dla efektu uniesienia (iOS)
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  registerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loginRedirectButton: {
    paddingVertical: 10,
    marginBottom: -5,
  },
  loginRedirectText: {
    color: '#4a136c',
    fontSize: 14,
    textAlign: 'center',
  },
});
