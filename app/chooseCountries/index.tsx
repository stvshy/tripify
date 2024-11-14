// app/chooseCountries/index.tsx

import React, { useState, useMemo, useCallback, useContext } from 'react';
import { 
  View, 
  Text, 
  SectionList, 
  Pressable, 
  StyleSheet, 
  Alert, 
  Dimensions, 
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from 'react-native';
import { TextInput as PaperTextInput, Checkbox, Switch, useTheme } from 'react-native-paper';
import { doc, updateDoc } from 'firebase/firestore';
import { useRouter } from 'expo-router';
import { auth, db } from '../config/firebaseConfig';
import CountryFlag from 'react-native-country-flag';
import countries from 'world-countries';
import { FontAwesome } from '@expo/vector-icons';
import { ThemeContext } from '../config/ThemeContext';

const { width, height } = Dimensions.get('window');

type Continent = 'Africa' | 'Americas (North)' | 'Americas (South)' | 'Asia' | 'Europe' | 'Oceania' | 'Antarctica';

interface ChooseCountriesScreenProps {
  // Usuń toggleTheme i currentTheme z propsów
}

// Funkcja do określania kontynentu na podstawie regionu i subregionu
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
      return 'Africa'; // Możesz zmienić na 'Other' jeśli potrzebujesz
  }
};

// Memoizowany komponent dla pojedynczego kraju
const CountryItem = React.memo(({ item, onSelect, isSelected }: { item: typeof countries[0], onSelect: (name: string) => void, isSelected: boolean }) => (
  <Pressable onPress={() => onSelect(item.name.common)} style={styles.countryItem}>
    <View style={styles.flagContainer}>
      <CountryFlag isoCode={item.cca2} size={25} />
    </View>
    <Text style={styles.countryText}>{item.name.common}</Text>
    <Checkbox
      status={isSelected ? 'checked' : 'unchecked'}
      onPress={() => onSelect(item.name.common)}
      color="#6a1b9a"
    />
  </Pressable>
));

export default function ChooseCountriesScreen() {
  const router = useRouter();
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const { toggleTheme, isDarkTheme } = useContext(ThemeContext);
  const theme = useTheme(); // Hook z react-native-paper

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

  const handleSelectCountry = useCallback((countryName: string) => {
    setSelectedCountries((prevSelected) => {
      if (prevSelected.includes(countryName)) {
        return prevSelected.filter((c) => c !== countryName);
      } else {
        return [...prevSelected, countryName];
      }
    });
  }, []);

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

  const renderCountryItem = useCallback(({ item }: { item: typeof countries[0] }) => (
    <CountryItem 
      item={item} 
      onSelect={handleSelectCountry} 
      isSelected={selectedCountries.includes(item.name.common)} 
    />
  ), [handleSelectCountry, selectedCountries]);

  const renderSectionHeader = useCallback(({ section }: { section: { title: string } }) => (
    <View style={[styles.sectionHeader, { backgroundColor: theme.colors.surface }]}>
      <Text style={[styles.sectionHeaderText, { color: theme.colors.primary }]}>{section.title}</Text>
    </View>
  ), [theme.colors.surface, theme.colors.primary]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.keyboardAvoidingView}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Nagłówek z tytułem i przełącznikiem motywu */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.primary }]}>Select Countries You Have Visited</Text>
          <View style={styles.themeSwitchContainer}>
            <Text style={styles.themeIcon}>
              {isDarkTheme ? '🌙' : '☀️'}
            </Text>
            <Switch
              value={isDarkTheme}
              onValueChange={() => {
                console.log('Switch toggled');
                toggleTheme();
              }}
              color="#6a1b9a"
            />
          </View>
        </View>

        {/* Pasek Wyszukiwania */}
        <PaperTextInput
          label="Search Country"
          value={searchQuery}
          onChangeText={setSearchQuery}
          mode="outlined"
          style={styles.searchBar}
          theme={{
            colors: {
              primary: '#6a1b9a',
              placeholder: '#6a1b9a',
              background: theme.colors.surface,
              onSurface: theme.colors.onSurface, // Poprawka: 'text' na 'onSurface'
              error: 'red',
            },
          }}
          underlineColor="transparent" 
          left={
            <PaperTextInput.Icon 
              icon={() => (
                <FontAwesome 
                  name="search" 
                  size={20}  
                  color="#6a1b9a" 
                />
              )}
              style={styles.iconLeft}
            />
          }
          autoCapitalize="none" 
        />

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
          contentContainerStyle={{ paddingBottom: 20 }} // Dodaje odstęp na dole listy
          initialNumToRender={20} // Optymalizacja początkowej liczby renderowanych elementów
          maxToRenderPerBatch={20}
          windowSize={21}
          getItemLayout={(data, index) => ({
            length: 50, // Przykładowa wysokość elementu; dostosuj w razie potrzeby
            offset: 50 * index,
            index,
          })}
        />
        
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
  );
}

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 16,
    paddingTop: 20, // Dodaj padding na górze, aby obniżyć tytuł
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  themeSwitchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  themeIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  title: {
    fontSize: 20, // Zwiększony rozmiar fontu dla lepszej widoczności
    fontWeight: 'bold',
    textAlign: 'left',
    flex: 1,
    marginRight: 10, // Dodaj odstęp między tytułem a przełącznikiem
  },
  searchBar: {
    width: '100%',
    marginBottom: 12,
    backgroundColor: 'transparent', // Ustawiono na transparent, ponieważ background kolor jest ustawiany w theme
    borderRadius: 28, // Zwiększony borderRadius dla lepszej estetyki
    borderWidth: 2,
    borderColor: 'transparent', // Domyślny kolor obramowania
    height: 52, // Ustawienie wysokości dla spójności z innymi polami
    fontSize: 15, // Ustawienie rozmiaru czcionki dla spójności
  },
  iconLeft: {
    marginLeft: 10,
  },
  sectionHeader: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    width: '100%',
  },
  sectionHeaderText: {
    fontSize: 16,
    fontWeight: '600',
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
    flex: 1,
    width: '100%',
  },
});
