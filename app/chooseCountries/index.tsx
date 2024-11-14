// app/chooseCountries/index.tsx

import React, { useState, useMemo } from 'react';
import { 
  View, 
  Text, 
  SectionList, 
  Pressable, 
  StyleSheet, 
  Alert, 
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  Dimensions,
} from 'react-native';
import { TextInput, Button, Checkbox } from 'react-native-paper';
import { doc, updateDoc } from 'firebase/firestore';
import { useRouter } from 'expo-router';
import { auth, db } from '../config/firebaseConfig';
import CountryFlag from 'react-native-country-flag';
import countries from 'world-countries';
import { FontAwesome } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

type Continent = 'Africa' | 'Americas (North)' | 'Americas (South)' | 'Asia' | 'Europe' | 'Oceania' | 'Antarctica';

const continentsMap: Record<string, Continent> = {
  Africa: 'Africa',
  Americas: 'Americas (North)', // Initial mapping, will adjust below
  Asia: 'Asia',
  Europe: 'Europe',
  Oceania: 'Oceania',
  Antarctic: 'Antarctica',
};

// Funkcja do mapowania regionów na kontynenty, z podziałem Ameryk
const getContinent = (region: string, subregion: string): Continent => {
  switch (region) {
    case 'Africa':
      return 'Africa';
    case 'Americas':
      if (subregion.includes('South')) {
        return 'Americas (South)';
      } else {
        return 'Americas (North)';
      }
    case 'Asia':
      return 'Asia';
    case 'Europe':
      return 'Europe';
    case 'Oceania':
      return 'Oceania';
    case 'Antarctic':
      return 'Antarctica';
    default:
      return 'Africa'; // Domyślnie Africa, można zmienić na 'Other'
  }
};

export default function ChooseCountriesScreen() {
  const router = useRouter();
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Przetwarzanie danych krajów
  const processedCountries = useMemo(() => {
    // Filtracja na podstawie wyszukiwania
    const filtered = countries.filter((country) =>
      country.name.common.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Grupowanie według kontynentów
    const grouped = filtered.reduce((acc, country) => {
      const continent = getContinent(country.region, country.subregion);
      if (!acc[continent]) {
        acc[continent] = [];
      }
      acc[continent].push(country);
      return acc;
    }, {} as { [key in Continent]?: typeof countries[0][] });

    // Konwersja do formatu SectionList
    const sections: { title: string; data: typeof countries[0][] }[] = Object.keys(grouped)
      .map((continent) => ({
        title: continent,
        data: grouped[continent as Continent]!.sort((a, b) =>
          a.name.common.localeCompare(b.name.common)
        ),
      }))
      .sort((a, b) => a.title.localeCompare(b.title));

    return sections;
  }, [searchQuery]);

  const handleSelectCountry = (countryName: string) => {
    if (selectedCountries.includes(countryName)) {
      setSelectedCountries(selectedCountries.filter((c) => c !== countryName));
    } else {
      setSelectedCountries([...selectedCountries, countryName]);
    }
  };

  const handleSaveCountries = async () => {
    const user = auth.currentUser;
    if (user) {
      if (selectedCountries.length === 0) {
        Alert.alert('No Selection', 'Please select at least one country.');
        return;
      }

      try {
        const userDocRef = doc(db, 'users', user.uid);
        await updateDoc(userDocRef, {
          countriesVisited: selectedCountries,
          firstLoginComplete: true,
        });
        router.replace('/');
      } catch (error) {
        console.error('Error saving countries:', error);
        Alert.alert('Error', 'Failed to save selected countries. Please try again.');
      }
    } else {
      Alert.alert('Not Logged In', 'User is not authenticated.');
      router.replace('/welcome');
    }
  };

  const renderCountryItem = ({ item }: { item: typeof countries[0] }) => (
    <Pressable
      onPress={() => handleSelectCountry(item.name.common)}
      style={styles.countryItem}
    >
      <View style={styles.flagContainer}>
        <CountryFlag isoCode={item.cca2} size={25} />
      </View>
      <Text style={styles.countryText}>{item.name.common}</Text>
      <Checkbox
        status={selectedCountries.includes(item.name.common) ? 'checked' : 'unchecked'}
        onPress={() => handleSelectCountry(item.name.common)}
      />
    </Pressable>
  );

  const renderSectionHeader = ({ section }: { section: { title: string } }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{section.title}</Text>
    </View>
  );

  return (
    <ImageBackground 
      source={require('../../assets/images/gradient2.jpg')}
      style={styles.background}
      imageStyle={{ 
        resizeMode: 'cover', 
        width: '140%', 
        height: '150%', 
        left: -80, 
        top: -150, 
        transform: [{ rotate: '-10deg' }] 
      }}
    >
      <View style={styles.overlay} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <SafeAreaView style={styles.container}>
          <ScrollView
            contentContainerStyle={styles.scrollViewContent}
            keyboardShouldPersistTaps="handled"
            style={styles.scrollView}
          >

            <Text style={styles.title}>Select Countries You Have Visited</Text>
            
            {/* Pasek Wyszukiwania */}
            <View style={[styles.inputContainer, searchQuery.length > 0 && styles.inputFocused]}>
              <TextInput
                label="Search Country"
                value={searchQuery}
                onChangeText={setSearchQuery}
                onFocus={() => {}}
                onBlur={() => {}}
                mode="outlined"
                style={[styles.input, !searchQuery.length && styles.inputUnfocusedText]}
                theme={{
                  colors: {
                    primary: '#6a1b9a',
                    placeholder: '#6a1b9a',
                    background: '#f0ed8f5',
                    text: '#000',
                    error: 'red',
                  },
                }}
                underlineColor="transparent" 
                left={
                  <TextInput.Icon 
                    icon="magnify" // Poprawione z 'name' na 'icon'
                    style={styles.iconLeft}
                  />
                }
                autoCapitalize="none" 
              />
            </View>

            {/* Lista Krajów */}
            <SectionList
              sections={processedCountries}
              keyExtractor={(item) => item.cca3}
              renderItem={renderCountryItem}
              renderSectionHeader={renderSectionHeader}
              stickySectionHeadersEnabled
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No countries found.</Text>
                </View>
              }
              style={styles.sectionList}
            />

          </ScrollView>
          
          {/* Przycisk Zapisz i Kontynuuj */}
          <View style={styles.footer}>
            <Pressable 
              onPress={handleSaveCountries} 
              style={[
                styles.saveButton, 
                selectedCountries.length === 0 && styles.saveButtonDisabled
              ]}
              disabled={selectedCountries.length === 0}
            >
              <Text style={styles.saveButtonText}>Save and Continue</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    resizeMode: 'cover',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  container: {
    flex: 1,
    justifyContent: 'space-between', // Rozłożenie treści od góry do dołu
    alignItems: 'center',
    padding: 16,
    paddingBottom: 10, // Mniejsze paddingi na dole, kontrolowane przez footer
  },
  scrollView: {
    width: '100%', // Upewnij się, że ScrollView zajmuje pełną szerokość
  },
  scrollViewContent: {
    flexGrow: 1,
    justifyContent: 'center', // Dostosuj według potrzeb
    alignItems: 'center',
  },
  logoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 20, // Zmniejszony margines górny dla lepszego rozmieszczenia
  },
  logo: {
    width: width * 0.5,
    height: height * 0.2,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
    color: '#FFEEFCFF',
  },
  inputContainer: {
    borderRadius: 28, // Zwiększony borderRadius dla lepszej estetyki
    overflow: 'hidden',
    marginBottom: 13,
    width: width * 0.89,
    backgroundColor: '#f0ed8f5',
    borderWidth: 2,
    borderColor: 'transparent', // Domyślny kolor obramowania
  },
  input: {
    paddingLeft: 1,
    height: 52,
    fontSize: 15,
  },
  inputFocused: {
    borderColor: '#6a1b9a', // Kolor obramowania po skupieniu
  },
  inputUnfocusedText: {
    // Dodatkowe style dla tekstu w stanie nieaktywnym, jeśli potrzebne
  },
  iconLeft: {
    marginLeft: 10,
  },
  sectionHeader: {
    backgroundColor: '#f2f2f2',
    paddingVertical: 4,
    paddingHorizontal: 8,
    width: '100%',
  },
  sectionHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6a1b9a',
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#ccc',
    width: '100%',
  },
  flagContainer: {
    marginRight: 12,
    width: 30,
    alignItems: 'center',
  },
  countryText: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  saveButton: {
    backgroundColor: '#7511b5',
    paddingVertical: 12,
    paddingHorizontal: 30,
    alignItems: 'center',
    borderRadius: 25,
    width: '90%',
    marginBottom: 10,
    elevation: 2, // Efekt cienia dla Android
    shadowColor: '#000', // Efekt cienia dla iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  saveButtonDisabled: {
    backgroundColor: '#a68eac',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    width: '100%', // Upewnij się, że footer zajmuje pełną szerokość
    alignItems: 'center',
    paddingVertical: 10,
  },
  emptyContainer: {
    padding: 16,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  sectionList: {
    width: '100%',
    marginBottom: 20,
  },
});
