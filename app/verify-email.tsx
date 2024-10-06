import React from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import { useRouter } from 'expo-router';

export default function VerifyEmailScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Weryfikacja konta</Text>
      <Text style={styles.message}>
        Twoje konto nie zostało jeszcze zweryfikowane. Sprawdź swoją skrzynkę
        pocztową i kliknij w link weryfikacyjny.
      </Text>

      <Button
        title="Powrót do logowania"
        onPress={() => router.replace('/login')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
});
