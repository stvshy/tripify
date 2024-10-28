import React, { useEffect } from 'react';
import { View, Button, Alert, StyleSheet } from 'react-native';
import { LoginManager, AccessToken, GraphRequest, GraphRequestManager } from 'react-native-fbsdk-next';
import { getAuth, FacebookAuthProvider, signInWithCredential, fetchSignInMethodsForEmail } from 'firebase/auth';
import { useRouter } from 'expo-router';

const auth = getAuth();

export default function RegisterFacebookScreen() {
  const router = useRouter();

  useEffect(() => {
    // Inicjalizacja SDK Facebooka, jeśli potrzeba
  }, []);

  const getFacebookEmail = (): Promise<string | null> => {
    return new Promise((resolve) => {
      const request = new GraphRequest(
        '/me?fields=email',
        {}, // Usuwamy typowanie GraphRequestConfig i przekazujemy pusty obiekt
        (error, result) => {
          if (error) {
            console.log('Error fetching email: ', error);
            resolve(null);
          } else if (result && result.email) {
            resolve(result.email as string); // Rzutowanie 'result.email' na string
          } else {
            resolve(null);
          }
        }
      );
      new GraphRequestManager().addRequest(request).start();
    });
  };

  const handleFacebookLogin = async () => {
    try {
      const result = await LoginManager.logInWithPermissions(['public_profile', 'email']);
      if (result?.isCancelled) { // Sprawdzamy, czy 'result' istnieje
        Alert.alert('Logowanie zostało anulowane');
        return;
      }

      const data = await AccessToken.getCurrentAccessToken();
      if (!data) {
        throw new Error('Błąd uzyskiwania tokenu dostępu');
      }

      const credential = FacebookAuthProvider.credential(data.accessToken);

      // Pobieranie adresu e-mail z Facebooka, aby sprawdzić, czy konto już istnieje
      const email = await getFacebookEmail();
      if (!email) {
        Alert.alert('Błąd', 'Nie udało się pobrać adresu e-mail z Facebooka.');
        return;
      }

      // Sprawdzenie, czy konto z tym adresem e-mail już istnieje
      const signInMethods = await fetchSignInMethodsForEmail(auth, email);
      if (signInMethods.length > 0 && !signInMethods.includes('facebook.com')) {
        // Konto istnieje, ale nie jest powiązane z Facebookiem
        Alert.alert(
          'Konto istnieje',
          `Konto z e-mailem ${email} jest już powiązane z innym dostawcą logowania (${signInMethods[0]}). Zaloguj się za pomocą tej metody, a następnie połącz konto z Facebookiem w ustawieniach.`
        );
        return;
      }

      // Próba logowania przez Facebooka
      const resultAuth = await signInWithCredential(auth, credential);
      if (resultAuth.user) {
        Alert.alert('Sukces', 'Zalogowano pomyślnie przez Facebooka!');
        router.replace('./setNicknameFacebook'); // Przekierowanie do ekranu ustawiania pseudonimu
      }
    } catch (error: any) {
      if (error.code === 'auth/account-exists-with-different-credential') {
        // Jeśli występuje konflikt poświadczeń, to oznacza, że konto istnieje z innym dostawcą
        Alert.alert(
          'Konto istnieje',
          `Konto z tym e-mailem jest już powiązane z innym dostawcą logowania. Zaloguj się tą metodą, a potem połącz konto z Facebookiem.`
        );
      } else {
        console.error('Błąd logowania przez Facebooka:', error);
        Alert.alert('Błąd logowania', 'Wystąpił błąd podczas logowania przez Facebooka.');
      }
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
