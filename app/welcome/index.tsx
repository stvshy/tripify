// app/welcome/index.tsx
import React from 'react';
import { View, Text, StyleSheet, Button, Alert, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { LoginManager, AccessToken, GraphRequest, GraphRequestManager } from 'react-native-fbsdk-next';
import { getAuth, FacebookAuthProvider, signInWithCredential, fetchSignInMethodsForEmail } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';

export default function WelcomeScreen() {
  const router = useRouter();
  const auth = getAuth();

  const handleFacebookLogin = async () => {
    try {
      // Start the Facebook login process
      const result = await LoginManager.logInWithPermissions(['public_profile', 'email']);
      if (result.isCancelled) {
        Alert.alert('Login canceled');
        return;
      }
  
      // Retrieve the access token
      const data = await AccessToken.getCurrentAccessToken();
      if (!data) {
        Alert.alert('Error', 'Failed to obtain access token.');
        return;
      }
  
      const facebookCredential = FacebookAuthProvider.credential(data.accessToken);
  
      // Check if email already exists in Firebase
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
  
      // Log in or create an account with Facebook credentials
      const userCredential = await signInWithCredential(auth, facebookCredential);
      const user = userCredential.user;
  
      // Check if the user has a nickname set
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists() && userDoc.data()?.nickname) {
        // Redirect to the main screen if nickname is set
        router.replace('/');
      } else {
        // Redirect to SetNicknameFacebook if nickname is not set
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

      {/* Regular login button */}
      <Button title="Log In" onPress={() => router.push('/login')} />

      {/* Button to register with email */}
      <Button title="Sign Up" onPress={() => router.push('/registerChoice')} />

      {/* Facebook login button */}
      <Pressable style={styles.facebookButton} onPress={handleFacebookLogin}>
        <FontAwesome name="facebook" size={24} color="#FFF" />
        <Text style={styles.facebookButtonText}>Continue with Facebook</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 30,
    textAlign: 'center',
  },
  facebookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4267B2',
    padding: 10,
    borderRadius: 8,
    marginTop: 20,
  },
  facebookButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    marginLeft: 8,
  },
});
