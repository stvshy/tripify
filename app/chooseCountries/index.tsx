import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';
import { useRouter } from 'expo-router';
import { auth, db } from '../config/firebaseConfig';

const countriesList = ["Poland", "Germany", "France", "Spain", "Italy", "USA", "Canada", "Australia", "Japan", "China", "Brazil", "India"]; // Przykładowa lista krajów

export default function ChooseCountriesScreen() {
  const router = useRouter();
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);

  const handleSelectCountry = (country: string) => {
    if (selectedCountries.includes(country)) {
      setSelectedCountries(selectedCountries.filter((c) => c !== country));
    } else {
      setSelectedCountries([...selectedCountries, country]);
    }
  };

  const handleSaveCountries = async () => {
    const user = auth.currentUser;
    if (user) {
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        countriesVisited: selectedCountries,
        firstLoginComplete: true,
      });
      router.replace('(tabs)');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select countries you have visited</Text>
      <FlatList
        data={countriesList}
        keyExtractor={(item) => item}
        renderItem={({ item }) => (
          <Pressable
            style={[
              styles.countryItem,
              selectedCountries.includes(item) && styles.selected,
            ]}
            onPress={() => handleSelectCountry(item)}
          >
            <Text style={styles.countryText}>{item}</Text>
          </Pressable>
        )}
      />
      <Pressable onPress={handleSaveCountries} style={styles.saveButton}>
        <Text style={styles.saveButtonText}>Save and Continue</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, alignItems: 'center' },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 20 },
  countryItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#ccc' },
  selected: { backgroundColor: '#d3f9d8' },
  countryText: { fontSize: 16 },
  saveButton: { backgroundColor: '#7511b5', padding: 15, borderRadius: 10, marginTop: 20 },
  saveButtonText: { color: '#fff', fontSize: 16 },
});
