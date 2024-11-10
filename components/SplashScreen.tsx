import React, { useEffect, useState } from 'react';
import { View, Image, ActivityIndicator, StyleSheet, Dimensions, ImageBackground, Animated } from 'react-native';

const { height, width } = Dimensions.get('window');

export default function SplashScreen() {
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    // Animacja zanikania
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  return (
    <ImageBackground 
      source={require('../../assets/images/gradient5.png')}
      style={styles.background}
      imageStyle={{ resizeMode: 'cover', width: '110%', height: '110%' }}
    >
      <View style={styles.container}>
        {/* Logo aplikacji */}
        <Image 
          source={require('../../assets/images/tripify-icon.png')} 
          style={styles.logo} 
          resizeMode="contain" 
        />
        {/* Animacja ładowania */}
        <ActivityIndicator size="large" color="#6a1b9a" style={styles.loadingIndicator} />
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: height * 0.1,
  },
  logo: {
    width: width * 0.5,
    height: height * 0.25,
    marginBottom: height * 0.05,
  },
  loadingIndicator: {
    marginTop: height * 0.03,
  },
});
