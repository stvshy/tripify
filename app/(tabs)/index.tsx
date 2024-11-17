// screens/IndexScreen.tsx
import React, { useState, useEffect, useCallback, useContext } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import InteractiveMap, { InteractiveMapRef } from '../../components/InteractiveMap';
import { useFocusEffect } from '@react-navigation/native';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebaseConfig';
import { ThemeContext } from '../config/ThemeContext';
import { useRef } from 'react';

export default function IndexScreen() {
  const { isDarkTheme } = useContext(ThemeContext);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const mapRef = useRef<InteractiveMapRef>(null);

  const fetchSelectedCountries = async () => {
    const user = auth.currentUser;
    if (user) {
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const data = userDoc.data();
          const countriesVisited: string[] = data.countriesVisited || [];
          setSelectedCountries(countriesVisited);
        } else {
          console.log('No such document!');
          setSelectedCountries([]);
        }
      } catch (error) {
        console.error('Error fetching countries:', error);
        setSelectedCountries([]);
      }
    } else {
      console.log('User not authenticated');
      setSelectedCountries([]);
    }
    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchSelectedCountries();
    }, [])
  );

  const handleCountryPress = (countryCode: string) => {
    // Możesz tutaj obsłużyć kliknięcie na kraj, np. nawigację do szczegółów
    console.log(`Country pressed: ${countryCode}`);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7511b5" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <InteractiveMap
        ref={mapRef}
        selectedCountries={selectedCountries}
        onCountryPress={handleCountryPress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
