// app/welcome/index.tsx
import React from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import { useRouter } from 'expo-router';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Witaj w Tripify!</Text>
      <Text style={styles.subtitle}>Zaloguj się lub załóż konto, aby rozpocząć swoją podróż!</Text>
      <Button title="Zaloguj się" onPress={() => router.push('/login')} />
      <Button title="Załóż konto" onPress={() => router.push('/register')} />
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
});
