import React, { useState } from 'react';
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
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth, db } from '../config/firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useRouter } from 'expo-router';

const { width, height } = Dimensions.get('window');

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState({ email: false });
  const router = useRouter();

  const handlePasswordReset = async () => {
    setMessage(null);
    setError(null);

    if (!email) {
      setError('Please enter your email address.');
      return;
    }

    try {
      // Sprawdzanie, czy email istnieje w Firestore
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', email));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setError('No account found with this email.');
        return;
      }

      // Sprawdzenie, czy konto jest zweryfikowane
      const userData = querySnapshot.docs[0].data();
      if (!userData.isVerified) {
        setError('This account has not been verified.');
        return;
      }

      // Wysłanie linku resetu hasła
      await sendPasswordResetEmail(auth, email);
      setMessage('A password reset link has been sent to your email.');
    } catch (error: any) {
      console.log("Password reset error:", error.code, error.message);
      if (error.code === 'permission-denied') {
        setError("Permission denied. Please check your Firestore rules.");
      } else {
        setError("An error occurred. Please try again later.");
      }
    }
  };

  return (
    <ImageBackground 
      source={require('../../assets/images/gradient2.jpg')}
      style={styles.background}
      imageStyle={{ 
        resizeMode: 'cover', 
        width: '140%', 
        height: '150%', 
        left: -80, 
        top: -150, 
        transform: [{ rotate: '-10deg' }] 
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
            <Text style={styles.title}>Forgot your password?</Text>
            <Text style={styles.subtitle}>Please enter your email address to receive a password reset link.</Text>

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
                        size={20}  // Adjusted size
                        color={isFocused.email ? '#6a1b9a' : '#606060'} 
                      />
                    )}
                    style={styles.iconLeft}
                  />
                }
                autoCapitalize="none" 
              />
            </View>

            {/* Komunikaty */}
            {message && <Text style={styles.successMessage}>{message}</Text>}
            {error && <Text style={styles.errorMessage}>{error}</Text>}

          </ScrollView>
          
          {/* Stopka z przyciskami */}
          <View style={styles.footer}>
            <Pressable onPress={handlePasswordReset} style={styles.sendButton}>
              <Text style={styles.sendButtonText}>Send reset link</Text>
            </Pressable>

            <Pressable onPress={() => router.replace('/welcome')} style={styles.backButton}>
              <Text style={styles.backButtonText}>Back to login</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

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
    justifyContent: 'space-between', // Distribute content from top to bottom
    alignItems: 'center',
    padding: 16,
    paddingBottom: 10, // Smaller bottom padding, controlled by footer
  },
  scrollView: {
    width: '100%', // Ensure ScrollView takes full width
  },
  scrollViewContent: {
    flexGrow: 1,
    justifyContent: 'center', // Adjust as needed
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
    marginTop: 20, // Reduced top margin for better placement
  },
  title: {
    fontSize: width * 0.06, // Proportional size
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10, // Reduced bottom margin to accommodate subtitle
    color: '#FFEEFCFF',
  },
  subtitle: {
    fontSize: width * 0.04, // Slightly smaller than title
    textAlign: 'center',
    marginBottom: 20,
    color: '#FFE3F9D1',
    marginTop: 5,
  },
  inputContainer: {
    borderRadius: 28, // Increased borderRadius for better aesthetics
    overflow: 'hidden',
    marginBottom: 13,
    width: width * 0.89,
    backgroundColor: '#f0ed8f5',
    borderWidth: 2,
    borderColor: 'transparent', // Default border color
  },
  input: {
    paddingLeft: 1,
    height: 52,
    fontSize: 15,
  },
  inputFocused: {
    borderColor: '#6a1b9a', // Border color when focused
  },
  inputUnfocusedText: {
    // Additional styles for unfocused state text if needed
  },
  iconLeft: {
    marginLeft: 10,
  },
  successMessage: {
    color: '#50baa1',
    textAlign: 'center',
    marginBottom: 16,
    fontSize: 12,
  },
  errorMessage: {
    color: 'violet',
    textAlign: 'center',
    marginBottom: 16,
    fontSize: 12,
  },
  footer: {
    width: '100%', // Ensure footer takes full width
    alignItems: 'center',
    paddingVertical: 10,
  },
  sendButton: {
    backgroundColor: '#7511b5',
    paddingVertical: 12,
    paddingHorizontal: 30,
    alignItems: 'center',
    borderRadius: 25,
    width: '90%',
    marginBottom: 10,
    elevation: 2, // Shadow effect for Android
    shadowColor: '#000', // Shadow effect for iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButton: {
    paddingVertical: 10,
    marginBottom: -5,
  },
  backButtonText: {
    color: '#4a136c',
    fontSize: 14,
    textAlign: 'center',
  },
});
