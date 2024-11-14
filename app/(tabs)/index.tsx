import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Tripify!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
    position: 'relative',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  userInfo: {
    position: 'absolute',
    top: 40,
    right: 10,
    alignItems: 'flex-end',
  },
  userEmail: {
    fontSize: 16,
    color: 'green',
  },
  logout: {
    fontSize: 16,
    color: 'red',
    marginTop: 5,
    textDecorationLine: 'underline',
    cursor: 'pointer',
  },
});
