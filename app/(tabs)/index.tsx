// tabs/index.tsx

import React, { useEffect, useState, useContext } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { auth, db } from '../config/firebaseConfig'; // Upewnij się, że ścieżka jest poprawna
import { doc, getDoc } from 'firebase/firestore';
import InteractiveMap from '../../components/InteractiveMap'; // Upewnij się, że ścieżka jest poprawna
import { ThemeContext } from '../config/ThemeContext';
import { useTheme } from 'react-native-paper';

export default function HomeScreen() {
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const { isDarkTheme } = useContext(ThemeContext);
  const theme = useTheme();

  useEffect(() => {
    const fetchSelectedCountries = async () => {
      try {
        const user = auth.currentUser;
        if (user) {
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const data = userDoc.data();
            setSelectedCountries(data.countriesVisited || []);
          }
        }
      } catch (error) {
        console.error('Error fetching selected countries:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSelectedCountries();
  }, []);

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
      
      {/* Opcjonalnie: Wyświetlanie informacji o użytkowniku */}
      <View style={styles.userInfo}>
        {auth.currentUser && (
          <>
            <Text style={styles.userEmail}>{auth.currentUser.email}</Text>
            {/* Możesz dodać funkcję wylogowania tutaj */}
          </>
        )}
      </View>

      {/* Interaktywna Mapa */}
      <InteractiveMap 
        selectedCountries={selectedCountries} 
        onCountryPress={(code) => {
          // Opcjonalnie: Możesz dodać logikę, np. nawigację do szczegółów kraju
          console.log(`Country pressed: ${code}`);
        }} 
      />
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
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center', // Środek mapy
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
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