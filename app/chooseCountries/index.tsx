// app/chooseCountries/index.tsx

import React, { useState, useMemo, useCallback, useContext, useEffect } from 'react';
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
  Keyboard,
  Animated,
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

type Continent = 'Africa' | 'North America' | 'South America' | 'Asia' | 'Europe' | 'Oceania' | 'Antarctica';

// Funkcja do określania kontynentu na podstawie regionu i subregionu
const getContinent = (region: string, subregion: string): Continent => {
  switch (region) {
    case 'Africa':
      return 'Africa';
    case 'Americas':
      if (subregion.includes('South')) {
        return 'South America';
      } else {
        return 'North America';
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
  const [isFocused, setIsFocused] = useState(false); // Boolean for search input focus
  const [isKeyboardVisible, setKeyboardVisible] = useState(false); // State to track keyboard visibility

 // Animacja dla przycisku
  // const fadeAnim = useState(new Animated.Value(1))[0]; // Domyślnie widoczny
  
 // Nasłuchiwanie stanu klawiatury
 useEffect(() => {
  const keyboardShowListener = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
  const keyboardHideListener = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));

  return () => {
    keyboardShowListener.remove();
    keyboardHideListener.remove();
  };
}, []);

  //   const keyboardHideListener = Keyboard.addListener(hideEvent, () => {
  //     console.log('Keyboard hidden');
  //     setKeyboardVisible(false);
  //     Animated.timing(fadeAnim, {
  //       toValue: 1,
  //       duration: 100,
  //       useNativeDriver: true,
  //     }).start();
  //   });

  //   // Czyszczenie nasłuchiwaczy przy odmontowaniu komponentu
  //   return () => {
  //     keyboardShowListener.remove();
  //     keyboardHideListener.remove();
  //   };
  // }, [fadeAnim]);

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
    if (selectedCountries.length === 0) {
      Alert.alert('No Selection', 'Please select at least one country.');
      return;
    }
    const user = auth.currentUser;
    if (user) {
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


  const renderCountryItem = useCallback(
    ({ item }: { item: typeof countries[0] }) => (
      <CountryItem 
        item={item} 
        onSelect={handleSelectCountry} 
        isSelected={selectedCountries.includes(item.name.common)} 
      />
    ), 
    [handleSelectCountry, selectedCountries]
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: { title: string } }) => (
      <View style={[styles.sectionHeader, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.sectionHeaderText, { color: theme.colors.primary }]}>{section.title}</Text>
      </View>
    ), 
    [theme.colors.surface, theme.colors.primary]
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 20}
      >
        <View style={{ flex: 1 }}>
          {/* Nagłówek z tytułem i przełącznikiem motywu */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.colors.primary }]}>
              Select countries you've visited
            </Text>
            <View style={styles.themeSwitchContainer}>
              <Text style={styles.themeIcon}>{isDarkTheme ? '🌙' : '☀️'}</Text>
              <Switch
                value={isDarkTheme}
                onValueChange={toggleTheme}
                color="#6a1b9a"
              />
            </View>
          </View>
  
          {/* Pasek wyszukiwania */}
          <View style={[styles.inputContainer, isFocused && styles.inputFocused]}>
            <PaperTextInput
              label="Search Country"
              value={searchQuery}
              onChangeText={setSearchQuery}
              mode="flat"
              style={styles.input}
              theme={{
                colors: {
                  primary: isFocused ? '#6a1b9a' : '#ccc',
                  background: 'transparent',
                  text: '#000',
                },
              }}
              underlineColor="transparent"
              left={
                <PaperTextInput.Icon
                  icon={() => <FontAwesome name="search" size={20} color={isFocused ? '#6a1b9a' : '#606060'} />}
                  style={styles.iconLeft}
                />
              }
              autoCapitalize="none"
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
            />
          </View>
  
          {/* Lista krajów */}
          <SectionList
            sections={processedCountries}
            keyExtractor={(item) => item.cca3}
            renderItem={renderCountryItem}
            renderSectionHeader={renderSectionHeader}
            stickySectionHeadersEnabled={false}
            ListEmptyComponent={<View style={styles.emptyContainer}><Text style={styles.emptyText}>No countries found.</Text></View>}
            style={styles.sectionList}
          />
        </View>
  
        {/* Przycisk Save and Continue */}
        {!isKeyboardVisible && (
          <View style={styles.footer}>
            <Pressable
              onPress={handleSaveCountries}
              style={[styles.saveButton, selectedCountries.length === 0 && styles.saveButtonDisabled]}
              disabled={selectedCountries.length === 0}
            >
              <Text style={styles.saveButtonText}>Save and Continue</Text>
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
  
}

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 13,
    // paddingTop: 20,
    flexDirection: 'column',
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: -5,
    marginTop: 10
  },
  themeSwitchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 18
  },
  themeIcon: {
    fontSize: 20,
    // marginRight: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: 'bold',
    textAlign: 'left',
    flex: 1,
    marginRight: 10,
    marginLeft: 18
  },
  inputContainer: {
    width: width * 0.90,
    backgroundColor: '#f0ed8f5',
    borderRadius: 28, // Zwiększony borderRadius dla lepszej estetyki
    overflow: 'hidden',
    marginBottom: 13,
    borderWidth: 2,
    borderColor: '#ccc', // Domyślny kolor obramowania
    flexDirection: 'row',
    alignItems: 'center',
    height: height * 0.075,
    marginLeft: 4
  },
  inputFocused: {
    borderColor: '#6a1b9a', // Kolor obramowania w stanie fokusu
  },
  input: {
    flex: 1,
    paddingLeft: 10,
    height: 50, // Stała wysokość, musi odpowiadać getItemLayout
    fontSize: 14,
    backgroundColor: 'transparent', // Usuń tło z TextInput
    borderRadius: 0, // Usuń wewnętrzny borderRadius
    color: '#000', // Upewnij się, że tekst jest widoczny
  },
  iconLeft: {
    marginLeft: 10,
  },
  sectionHeader: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    width: '100%',
    backgroundColor: '#f0f0f0',
  },
  sectionHeaderText: {
    fontSize: 16,
    fontWeight: '600',
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50, // Stała wysokość
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#ccc',
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
  emptyContainer: {
    padding: 16,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  footer: {
    position: 'absolute', // Absolutne pozycjonowanie
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: 'transparent', // Transparent footer
    zIndex: 100, // Upewnij się, że przycisk jest nad innymi elementami
  },
  saveButton: {
    backgroundColor: '#7511b5',
    paddingVertical: 12,
    paddingHorizontal: 30,
    alignItems: 'center',
    borderRadius: 25,
    width: '90%',
    elevation: 2, // Dodanie cienia dla efektu uniesienia (Android)
    shadowColor: '#000', // Dodanie cienia dla efektu uniesienia (iOS)
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
  sectionList: {
    flex: 1,
  },
});
