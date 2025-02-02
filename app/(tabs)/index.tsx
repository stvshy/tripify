// screens/IndexScreen.tsx
import React, { useState, useEffect, useCallback, useContext, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import InteractiveMap, { InteractiveMapRef } from '../../components/InteractiveMap';
import { useFocusEffect } from '@react-navigation/native';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebaseConfig';
import { ThemeContext } from '../config/ThemeContext';
import { useTheme } from 'react-native-paper'; // Importowanie useTheme
import filteredCountriesData from '../../components/filteredCountries.json'; // Zmień ścieżkę na właściwą

const totalCountries = filteredCountriesData.countries.length;

export default function IndexScreen() {
  const { isDarkTheme } = useContext(ThemeContext);
  const theme = useTheme(); // Używanie hooka useTheme
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
    // Obsługa kliknięcia na kraj, np. nawigacja do szczegółów
    console.log(`Country pressed: ${countryCode}`);
    // Możesz dodać nawigację do innego ekranu z detalami kraju
    // router.push(`/countryDetails/${countryCode}`);
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <InteractiveMap
        ref={mapRef}
        selectedCountries={selectedCountries}
        totalCountries={totalCountries} // Przekazanie nowego prop
        onCountryPress={handleCountryPress}
        style={styles.map} // Przekazanie stylu do InteractiveMap
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%', // Zapewnia pełną szerokość
    height: '100%', // Zapewnia pełną wysokość
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  map: {
    flex: 1,
    width: '100%', // Zapewnia, że mapa zajmuje pełną szerokość kontenera
    height: '100%', // Zapewnia, że mapa zajmuje pełną wysokość kontenera
  },
});