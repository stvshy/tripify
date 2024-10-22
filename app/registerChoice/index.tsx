import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

export default function SignupChoiceScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign Up with</Text>
      <Pressable
        onPress={() => router.push('/register')}
        style={[styles.button, styles.emailButton]}
      >
        <Text style={styles.buttonText}>Email</Text>
      </Pressable>
      <Pressable
        onPress={() => router.push('/registerFacebook')}
        style={[styles.button, styles.facebookButton]}
      >
        <Text style={styles.buttonText}>Facebook</Text>
      </Pressable>
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 10,
  },
  emailButton: {
    backgroundColor: '#007AFF',
  },
  facebookButton: {
    backgroundColor: '#4267B2',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
