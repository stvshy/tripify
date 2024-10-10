import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Button } from 'react-native-paper';
import { getFirestore, doc, setDoc, getDocs, collection, query, where } from 'firebase/firestore';
import { sendEmailVerification } from 'firebase/auth';
import { auth } from '../config/firebaseConfig';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';

const db = getFirestore();

export default function SetNicknameScreen() {
  const [nickname, setNickname] = useState('');
  const [isNicknameValid, setIsNicknameValid] = useState<null | boolean>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [verificationMessage, setVerificationMessage] = useState<string | null>(null);
  const router = useRouter();

  const validateNickname = async (nickname: string) => {
    const trimmedNickname = nickname.trim();

    if (!/^[a-zA-Z0-9]*$/.test(trimmedNickname)) {
      setErrorMessage('Nickname can only contain letters and numbers.');
      setIsNicknameValid(false);
      return;
    }
    if (trimmedNickname.length > 24) {
      setErrorMessage('Nickname cannot exceed 24 characters.');
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
        setErrorMessage('This nickname is already taken.');
        setIsNicknameValid(false);
      } else {
        setErrorMessage(null);
        setIsNicknameValid(true);
      }
    } catch (error) {
      console.error("Firestore Query Error:", error);
      setErrorMessage('An error occurred while validating the nickname.');
      setIsNicknameValid(false);
    }
  };

  const handleSetNickname = async () => {
    if (!nickname.trim()) {
      setErrorMessage('Please enter a nickname.');
      return;
    }

    if (!isNicknameValid) {
      return;
    }

    try {
      const user = auth.currentUser;
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        await setDoc(userDocRef, { nickname: nickname.toLowerCase() }, { merge: true });
        
        // Send verification email once after setting the nickname
        await sendEmailVerification(user);
        setVerificationMessage("A verification link has been sent to your email. Please verify to continue.");
        router.replace('/success');
      }
    } catch (error) {
      setErrorMessage('An error occurred while setting your nickname. Please try again.');
    }
  };

  const handleNicknameChange = (text: string) => {
    setNickname(text);
    setIsNicknameValid(null);
    validateNickname(text);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Choose a Nickname</Text>
      <View style={[
        styles.inputContainer,
        isNicknameValid === true ? styles.inputValid : isNicknameValid === false ? styles.inputInvalid : {},
      ]}>
        <TextInput
          placeholder="Nickname"
          value={nickname}
          onChangeText={handleNicknameChange}
          style={styles.input}
          maxLength={24}
        />
        {isNicknameValid === true && (
          <FontAwesome name="check-circle" size={20} color="green" style={styles.icon} />
        )}
        {isNicknameValid === false && (
          <FontAwesome name="times-circle" size={20} color="red" style={styles.icon} />
        )}
      </View>
      {errorMessage && <Text style={styles.error}>{errorMessage}</Text>}
      {verificationMessage && <Text style={styles.verificationMessage}>{verificationMessage}</Text>}
      <Button mode="contained" onPress={handleSetNickname}>
        Save Nickname
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
  verificationMessage: { color: '#555', fontSize: 12 },
});
