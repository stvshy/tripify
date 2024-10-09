import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { auth } from '../config/firebaseConfig';
import { useRouter } from 'expo-router';

const db = getFirestore();

export default function SetNicknameScreen() {
  const [nickname, setNickname] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const router = useRouter();

  const handleSetNickname = async () => {
    if (!nickname.trim()) {
      setErrorMessage('Please enter a nickname.');
      return;
    }

    try {
      const user = auth.currentUser;
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        await setDoc(userDocRef, { nickname }, { merge: true });
        router.replace('/login'); // Redirect directly to home without logout
      }
    } catch (error) {
      setErrorMessage('An error occurred while setting your nickname. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Choose a Nickname</Text>
      <TextInput
        placeholder="Nickname"
        value={nickname}
        onChangeText={setNickname}
        style={styles.input}
      />
      {errorMessage && <Text style={styles.error}>{errorMessage}</Text>}
      <Button title="Save Nickname" onPress={handleSetNickname} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 10, borderRadius: 8, marginBottom: 10 },
  error: { color: 'red', marginBottom: 10, textAlign: 'center' },
});
