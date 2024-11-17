import React, { useEffect, useState, useContext, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { auth, db } from '../config/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import InteractiveMap, { InteractiveMapRef } from '../../components/InteractiveMap';
import { ThemeContext } from '../config/ThemeContext';
import { useTheme } from 'react-native-paper';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';

export default function HomeScreen() {
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const { isDarkTheme } = useContext(ThemeContext);
  const theme = useTheme();
  const mapRef = useRef<InteractiveMapRef>(null);

  useEffect(() => {
    const fetchSelectedCountries = async () => {
      try {
        const user = auth.currentUser;
        if (user) {
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const data = userDoc.data();
            console.log('Pobrane dane użytkownika:', data); // Sprawdzenie, jakie dane są pobierane
            setSelectedCountries(data.countriesVisited || []);
          } else {
            console.log('Brak dokumentu dla tego użytkownika.');
          }
        }
      } catch (error) {
        console.error('Błąd podczas pobierania danych:', error);
      } finally {
        setLoading(false);
      }
    };
  
    fetchSelectedCountries();
  }, []);

  const handleShareMap = async () => {
    if (mapRef.current) {
      const uri = await mapRef.current.capture();
      if (uri) {
        await Sharing.shareAsync(uri);
      }
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text style={[styles.title, { color: theme.colors.primary }]}>Welcome to Tripify!</Text>
      <InteractiveMap 
        ref={mapRef}
        selectedCountries={selectedCountries} 
        onCountryPress={(code) => console.log(`Country pressed: ${code}`)} 
      />
      <Pressable onPress={handleShareMap} style={styles.shareButton}>
        <Text style={styles.shareButtonText}>Share Map</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  shareButton: {
    marginTop: 20,
    backgroundColor: '#7511b5',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
  },
  shareButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
