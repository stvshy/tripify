import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, Button, Image, StyleSheet } from 'react-native';
import { getAuth, FacebookAuthProvider, signInWithCredential } from 'firebase/auth';
import * as Facebook from 'expo-auth-session/providers/facebook';
import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import {getDoc, doc, setDoc, getFirestore } from 'firebase/firestore';

WebBrowser.maybeCompleteAuthSession();

export default function RegisterFacebookScreen() {
  const [request, response, promptAsync] = Facebook.useAuthRequest({
    clientId: '517197711280428', // Twoje Facebook App ID
  });
  const auth = getAuth();
  const router = useRouter();
  const db = getFirestore();

  useEffect(() => {
    if (response && response.type === 'success' && response.authentication) {
      const { accessToken } = response.authentication;
      handleFacebookLogin(accessToken);
    }
  }, [response]);

  const handleFacebookLogin = async (accessToken: string) => {
    try {
      const credential = FacebookAuthProvider.credential(accessToken);
      const result = await signInWithCredential(auth, credential);
      const user = result.user;

      // Sprawdź, czy użytkownik istnieje w Firestore
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists) {
        // Jeśli użytkownik nie istnieje, dodaj dane do Firestore
        await setDoc(userDocRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          profilePicture: user.photoURL,
          authProvider: 'facebook',
          isVerified: true, // Automatyczne oznaczenie jako zweryfikowane
        });

        // Przekieruj do ekranu ustawienia nicku
        router.replace('/setNicknameFacebook');
      } else {
        // Jeśli użytkownik istnieje, od razu przekieruj na ekran główny
        router.replace('/');
      }
    } catch (error) {
      console.error('Facebook login error:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Button
        disabled={!request}
        title="Zaloguj się przez Facebook"
        onPress={() => promptAsync()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
});
