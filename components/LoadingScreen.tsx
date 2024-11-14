// LoadingScreen.tsx
import React from 'react';
import { View, ImageBackground, Image, ActivityIndicator, StyleSheet } from 'react-native';

const LoadingScreen = ({ showLogo = true }) => {
  return (
    <ImageBackground
      source={require('../assets/images/gradient5.png')} // Adjust the path as needed
      style={styles.background}
    >
      <View style={styles.centerContainer}>
        {showLogo && (
          <Image
            source={require('../assets/images/tripify-icon.png')} // Adjust the path as needed
            style={styles.logo}
          />
        )}
        <ActivityIndicator size="large" color="#FFF" style={styles.loader} />
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  loader: {
    marginTop: 20,
  },
});

export default LoadingScreen;
