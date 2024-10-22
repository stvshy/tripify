import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Button } from 'react-native-paper';
import { getFirestore, doc, setDoc, getDocs, collection, query, where } from 'firebase/firestore';
import { auth } from '../config/firebaseConfig';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';

const db = getFirestore();

export default function SetNicknameFacebookScreen() {
  const [nickname, setNickname] = useState('');
  const [isNicknameValid, setIsNicknameValid] = useState<null | boolean>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const router = useRouter();

  // Funkcja walidująca nick
  const validateNickname = async (nickname: string) => {
    const trimmedNickname = nickname.trim();
    if (!/^[a-zA-Z0-9]*$/.test(trimmedNickname)) {
      setErrorMessage('Nickname może zawierać tylko litery i cyfry.');
      setIsNicknameValid(false);
      return;
    }
    if (trimmedNickname.length > 24) {
      setErrorMessage('Nickname nie może mieć więcej niż 24 znaki.');
      setIsNicknameValid(false);
      return;
    }

    try {
      const lowerCaseNickname = trimmedNickname.toLowerCase();
      const nicknameQuery = query(
        collection(db, 'users'),
        where('nickname', '==', lowerCaseNickname)
      );
      const querySnapshot = await getDocs(nicknameQuery);

      if (!querySnapshot.empty) {
        setErrorMessage('Ten nickname jest już zajęty.');
        setIsNicknameValid(false);
      } else {
        setErrorMessage(null);
        setIsNicknameValid(true);
      }
    } catch (error) {
      console.error('Błąd podczas sprawdzania nicku:', error);
      setErrorMessage('Wystąpił błąd podczas sprawdzania nicku.');
      setIsNicknameValid(false);
    }
  };

  // Funkcja obsługująca zapis nicku i zalogowanie użytkownika
  const handleSetNickname = async () => {
    if (!nickname.trim() || !isNicknameValid) return;

    try {
      const user = auth.currentUser;
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        await setDoc(userDocRef, { nickname: nickname.toLowerCase() }, { merge: true });

        // Po ustawieniu nicku przekierowujemy użytkownika do głównej strony
        router.replace('/');
      }
    } catch (error) {
      setErrorMessage('Wystąpił błąd podczas ustawiania nicku.');
    }
  };

  // Obsługa zmiany nicku
  const handleNicknameChange = (text: string) => {
    setNickname(text);
    setIsNicknameValid(null);
    validateNickname(text);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Wybierz nickname</Text>
      <View
        style={[
          styles.inputContainer,
          isNicknameValid === true ? styles.inputValid : isNicknameValid === false ? styles.inputInvalid : {},
        ]}
      >
        <TextInput
          placeholder="Nickname"
          value={nickname}
          onChangeText={handleNicknameChange}
          style={styles.input}
          maxLength={24}
          autoCapitalize="none"
        />
        {isNicknameValid === true && <FontAwesome name="check-circle" size={20} color="green" style={styles.icon} />}
        {isNicknameValid === false && <FontAwesome name="times-circle" size={20} color="red" style={styles.icon} />}
      </View>
      {errorMessage && <Text style={styles.error}>{errorMessage}</Text>}

      <Button mode="contained" onPress={handleSetNickname} disabled={!isNicknameValid}>
        Zapisz nickname
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 16,
  },
  inputValid: { borderColor: 'green' },
  inputInvalid: { borderColor: 'red' },
  icon: { marginLeft: 8 },
  error: { color: 'red', marginBottom: 10, textAlign: 'center' },
});
