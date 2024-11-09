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
  Pressable,
  BackHandler
} from 'react-native';
import { TextInput } from 'react-native-paper';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { getFirestore, doc, setDoc, getDocs, collection, query, where, getDoc } from 'firebase/firestore';
import { auth } from '../config/firebaseConfig';
import { useRouter } from 'expo-router';

const { width, height } = Dimensions.get('window');
const db = getFirestore();

export default function SetNicknameFacebookScreen() {
  const [nickname, setNickname] = useState('');
  const [isNicknameValid, setIsNicknameValid] = useState<null | boolean>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState({ nickname: false });
  const router = useRouter();

  // Obsługa przycisku "Back" na Androidzie
  useEffect(() => {
    const backAction = () => {
      setErrorMessage("You must set your nickname to continue.");
      return true; // Zatrzymuje akcję cofania
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );

    return () => backHandler.remove();
  }, []);

  // Sprawdzenie, czy użytkownik ma już ustawiony nickname
  useEffect(() => {
    const checkUserNickname = async () => {
      const user = auth.currentUser;
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists() && userDoc.data()?.nickname) {
          router.replace('/'); // Przekieruj na stronę główną, jeśli nick jest już ustawiony
        }
      }
    };
    checkUserNickname();
  }, [router]);

  // Funkcja walidująca nick
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

  // Funkcja obsługująca zapis nicku
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
        setNickname(nickname);
        router.replace('/'); // Przekierowanie na stronę główną
      }
    } catch (error) {
      setErrorMessage('An error occurred while setting your nickname.');
    }
  };

  // Obsługa zmiany nicku
  const handleNicknameChange = (text: string) => {
    setNickname(text);
    setIsNicknameValid(null);
    validateNickname(text);
  };

  return (
    <ImageBackground 
      source={require('../../assets/images/gradient2.jpg')}
      style={styles.background}
    >
      <View style={styles.overlay} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <SafeAreaView style={styles.container}>
          <ScrollView contentContainerStyle={styles.scrollViewContent} keyboardShouldPersistTaps="handled">
            <View style={styles.logoContainer}>
              <Image 
                source={require('../../assets/images/tripify-icon.png')} 
                style={styles.logo} 
                resizeMode="contain"
              />
            </View>
            <Text style={styles.title}>Choose a Nickname</Text>
            <Text style={styles.subtitle}>Please enter a unique nickname to continue.</Text>

            <View style={[styles.inputContainer, isFocused.nickname && styles.inputFocused]}>
              <TextInput
                label="Nickname"
                value={nickname}
                onChangeText={handleNicknameChange}
                onFocus={() => setIsFocused({ ...isFocused, nickname: true })}
                onBlur={() => setIsFocused({ ...isFocused, nickname: false })}
                style={styles.input}
                theme={{ colors: { primary: '#6a1b9a' } }}
                autoCapitalize="none"
                underlineColor="transparent"
                left={
                  <TextInput.Icon 
                    icon={() => <FontAwesome name="user" size={20} color={isFocused.nickname ? '#6a1b9a' : '#606060'} />} 
                  />
                }
                right={
                  isNicknameValid !== null && (
                    <TextInput.Icon 
                      icon={() => <FontAwesome name={isNicknameValid ? "check-circle" : "times-circle"} size={20} color={isNicknameValid ? "#0ab958" : "#b41151"} />}
                    />
                  )
                }
              />
            </View>

            {errorMessage && <Text style={styles.errorMessage}>{errorMessage}</Text>}

            <Pressable onPress={handleSetNickname} style={styles.sendButton} disabled={!isNicknameValid}>
              <Text style={styles.sendButtonText}>Save Nickname</Text>
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, resizeMode: 'cover' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255, 255, 255, 0.1)' },
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollViewContent: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  logoContainer: { marginBottom: 20, marginTop: 20 },
  logo: { width: width * 0.5, height: height * 0.2 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  subtitle: { fontSize: 16, marginBottom: 20 },
  inputContainer: { 
    width: width * 0.9, 
    marginBottom: 20, 
    borderRadius: 10, 
    overflow: 'hidden',
    backgroundColor: '#f0ed8f',
  },
  input: { 
    height: 50, 
    borderRadius: 10, 
    backgroundColor: '#f0ed8f', 
    paddingLeft: 10,
  },
  inputFocused: { 
    borderColor: '#6a1b9a', 
    borderWidth: 2 
  },
  errorMessage: { color: 'red', textAlign: 'center', marginBottom: 10 },
  sendButton: { backgroundColor: '#6a1b9a', padding: 15, borderRadius: 10, alignItems: 'center' },
  sendButtonText: { color: '#fff', fontWeight: 'bold' }
});
