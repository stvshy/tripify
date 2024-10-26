import React from 'react';
import { View, Button, StyleSheet, Alert } from 'react-native';
import { LoginManager, AccessToken } from 'react-native-fbsdk-next';
import { getAuth, FacebookAuthProvider, signInWithCredential } from 'firebase/auth';
import { useRouter } from 'expo-router';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { AppEventsLogger } from 'react-native-fbsdk-next';  // Import AppEventsLogger

export default function RegisterFacebookScreen() {
  const router = useRouter();
  const auth = getAuth();
  const db = getFirestore();

  const handleFacebookLogin = async () => {
    try {
      // Logowanie próby logowania
      AppEventsLogger.logEvent('loginAttempt');

      // Użycie Facebook LoginManager
      const result = await LoginManager.logInWithPermissions(['public_profile', 'email']);
      if (result.isCancelled) {
        Alert.alert('Anulowano logowanie');
        
        // Logowanie anulowania logowania
        AppEventsLogger.logEvent('loginCancelled');
        return;
      }

      // Pobranie AccessToken
      const data = await AccessToken.getCurrentAccessToken();
      if (!data) {
        throw new Error('Brak dostępu do tokenu');
      }

      const accessToken = data.accessToken.toString();
      const credential = FacebookAuthProvider.credential(accessToken);
      const resultAuth = await signInWithCredential(auth, credential);

      // Logowanie pomyślnego logowania
      AppEventsLogger.logEvent('loginSuccess');

      // Dodanie użytkownika do Firestore
      const userRef = doc(db, 'users', resultAuth.user.uid);
      await setDoc(userRef, {
        uid: resultAuth.user.uid,
        email: resultAuth.user.email,
        name: resultAuth.user.displayName,
        profilePicture: resultAuth.user.photoURL,
        authProvider: 'facebook'
      }, { merge: true });

      router.replace('./setNicknameFacebook');
    } catch (error) {
      console.error('Błąd logowania przez Facebook:', error);
      Alert.alert('Błąd logowania', 'Nie udało się zalogować przez Facebooka.');

      // Logowanie błędu logowania
      AppEventsLogger.logEvent('loginError');
    }
  };

  return (
    <View style={styles.container}>
      <Button title="Zaloguj się przez Facebook" onPress={handleFacebookLogin} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
