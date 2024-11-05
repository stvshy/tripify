import React from 'react';
import { View, Button, Alert } from 'react-native';
import { LoginManager, AccessToken, GraphRequest, GraphRequestManager } from 'react-native-fbsdk-next';
import { getAuth, FacebookAuthProvider, signInWithCredential, fetchSignInMethodsForEmail, linkWithCredential } from 'firebase/auth';

export default function FacebookLogin() {
  const auth = getAuth();

  // Funkcja do pobierania e-maila użytkownika z Facebooka
  const getFacebookEmail = (): Promise<string | null> => {
    return new Promise((resolve) => {
      const request = new GraphRequest(
        '/me?fields=email',
        {},  // Zamiast `null`, użyj pustego obiektu `{}`, co naprawia błąd
        (error, result) => {
          if (error) {
            console.log('Błąd pobierania e-maila z Facebooka:', error);
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

  const handleFacebookLogin = async () => {
    try {
      // Logowanie użytkownika przez Facebook SDK
      const result = await LoginManager.logInWithPermissions(['public_profile', 'email']);
      if (result.isCancelled) {
        Alert.alert('Logowanie zostało anulowane');
        return;
      }

      const data = await AccessToken.getCurrentAccessToken();
      if (!data) {
        Alert.alert('Błąd', 'Nie udało się uzyskać tokenu dostępu.');
        return;
      }

      const facebookCredential = FacebookAuthProvider.credential(data.accessToken);

      // Pobieramy e-mail użytkownika przez Graph API
      const email = await getFacebookEmail();
      if (!email) {
        Alert.alert('Błąd', 'Nie udało się pobrać adresu e-mail z Facebooka.');
        return;
      }

      // Sprawdzamy istniejące metody logowania dla tego e-maila
      const signInMethods = await fetchSignInMethodsForEmail(auth, email);
      if (signInMethods.length > 0 && !signInMethods.includes('facebook.com')) {
        // Konto istnieje, ale z innym dostawcą logowania
        Alert.alert(
          'Konto istnieje',
          `Konto z tym e-mailem jest już powiązane z innym dostawcą logowania (${signInMethods[0]}). Zaloguj się tą metodą, a potem połącz konto z Facebookiem.`
        );
      } else {
        // Jeśli nie ma konfliktu, logujemy się przy użyciu poświadczeń Facebooka
        const resultAuth = await signInWithCredential(auth, facebookCredential);
        if (resultAuth.user) {
          Alert.alert('Sukces', 'Zalogowano pomyślnie przez Facebooka!');
          // Tutaj można dodać dodatkowe kroki po udanym logowaniu, np. nawigację
        }
      }
    } catch (error: any) {
      if (error.code === 'auth/account-exists-with-different-credential') {
        Alert.alert(
          'Konto istnieje',
          'Konto z tym e-mailem jest już powiązane z innym dostawcą logowania. Zaloguj się tą metodą, a potem połącz konto z Facebookiem.'
        );
      } else {
        console.error('Błąd logowania przez Facebooka:', error);
        Alert.alert('Błąd logowania', 'Wystąpił błąd podczas logowania przez Facebooka.');
      }
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Button title="Zaloguj się przez Facebook" onPress={handleFacebookLogin} />
    </View>
  );
}
