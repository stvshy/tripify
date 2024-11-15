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
  UIManager,
  LayoutAnimation,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { TextInput as PaperTextInput, useTheme } from 'react-native-paper';
import { FontAwesome, MaterialIcons } from '@expo/vector-icons'; 
import { doc, updateDoc } from 'firebase/firestore';
import { useRouter } from 'expo-router';
import { auth, db } from '../config/firebaseConfig';
import CountryFlag from 'react-native-country-flag';
import countries from 'world-countries';
import { ThemeContext } from '../config/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage'; // Opcjonalnie, jeśli chcesz użyć AsyncStorage

const { width, height } = Dimensions.get('window');

type Continent = 'Africa' | 'North America' | 'South America' | 'Asia' | 'Europe' | 'Oceania' | 'Antarctica';

// Funkcja do określania kontynentu
const getContinent = (region: string, subregion: string): Continent => {
  switch (region) {
    case 'Africa': return 'Africa';
    case 'Americas': return subregion.includes('South') ? 'South America' : 'North America';
    case 'Asia': return 'Asia';
    case 'Europe': return 'Europe';
    case 'Oceania': return 'Oceania';
    case 'Antarctic': return 'Antarctica';
    default: return 'Africa';
  }
};

const CountryItem = React.memo(function CountryItem({
  item,
  onSelect,
  isSelected,
}: {
  item: typeof countries[0];
  onSelect: (name: string) => void;
  isSelected: boolean;
}) {
  const theme = useTheme();
  const scaleValue = useState(new Animated.Value(1))[0];

  const handleCheckboxPress = () => {
    Animated.sequence([
      Animated.timing(scaleValue, { toValue: 0.8, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleValue, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();
    onSelect(item.name.common);
  };

  const handlePress = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    handleCheckboxPress();
  };

  // Kolory dynamiczne na podstawie motywu
  const selectedBackgroundColor = isSelected
    ? theme.colors.surfaceVariant
    : theme.colors.surface;

  const flagBorderColor = theme.colors.outline;

  const checkboxBackgroundColor = isSelected
    ? theme.colors.primary
    : 'transparent';

  const checkboxBorderColor = isSelected
    ? theme.colors.primary
    : theme.colors.outline;

  const checkboxIconColor = isSelected
    ? theme.colors.onPrimary
    : 'transparent';

  return (
    <Pressable onPress={handlePress}>
      <View style={[styles.countryItemContainer, { backgroundColor: theme.colors.surface }]}>
        <View
          style={[
            styles.countryItem,
            isSelected && { backgroundColor: selectedBackgroundColor },
            { borderBottomColor: theme.colors.outline },
          ]}
        >
          <View style={[styles.flagContainer, styles.flagWithBorder, { borderColor: flagBorderColor }]}>
            <CountryFlag isoCode={item.cca2} size={25} />
          </View>

          <Text style={[styles.countryText, { color: theme.colors.onSurface }]}>{item.name.common}</Text>

          <Animated.View
            style={[
              styles.roundCheckbox,
              {
                backgroundColor: checkboxBackgroundColor,
                borderColor: checkboxBorderColor,
                transform: [{ scale: scaleValue }],
              },
            ]}
          >
            {isSelected && <FontAwesome name="check" size={12} color={checkboxIconColor} />}
          </Animated.View>
        </View>
      </View>
    </Pressable>
  );
});

export default function ChooseCountriesScreen() {
  const router = useRouter();
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const { toggleTheme, isDarkTheme } = useContext(ThemeContext);
  const theme = useTheme(); // Hook z react-native-paper
  const [isFocused, setIsFocused] = useState(false); // Boolean for search input focus
  const fadeAnim = useState(new Animated.Value(1))[0]; // Domyślnie widoczny
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [scaleValue] = useState(new Animated.Value(1));

  // State for popup visibility
  const [isPopupVisible, setIsPopupVisible] = useState(true);

  useEffect(() => {
    const checkPopup = async () => {
      try {
        const value = await AsyncStorage.getItem('hasShownPopup');
        if (value !== null) {
          setIsPopupVisible(false);
        }
      } catch (e) {
        console.error('Failed to load popup status.');
      }
    };

    checkPopup();
  }, []);

  const handleClosePopup = async () => {
    setIsPopupVisible(false);
    try {
      await AsyncStorage.setItem('hasShownPopup', 'true');
    } catch (e) {
      console.error('Failed to save popup status.');
    }
  };

  const handleToggleTheme = () => {
    Animated.sequence([
      Animated.timing(scaleValue, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleValue, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(() => {
      toggleTheme();
    });
  };

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
    const keyboardShowListener = Keyboard.addListener(showEvent, () => {
      if (isInputFocused) {
        fadeAnim.setValue(0);
      }
    });

    const keyboardHideListener = Keyboard.addListener(hideEvent, () => {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    });

    return () => {
      keyboardShowListener.remove();
      keyboardHideListener.remove();
    };
  }, [fadeAnim, isInputFocused]);

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
    setSelectedCountries((prevSelected) => {
      if (prevSelected.includes(countryName)) {
        return prevSelected.filter((c) => c !== countryName);
      } else {
        return [...prevSelected, countryName];
      }
    });
  };

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
    [selectedCountries]
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
      {/* Popup Informacyjny */}
      <Modal
        transparent={true}
        visible={isPopupVisible}
        animationType="slide"
        onRequestClose={handleClosePopup}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.primary }]}>
              Hey Traveller!
            </Text>
            <Text style={[styles.modalText, { color: theme.colors.onSurface }]}>
              Please choose the countries you have visited from the list below.
            </Text>
            <TouchableOpacity
              onPress={handleClosePopup}
              style={[styles.modalButton, { backgroundColor: theme.colors.primary }]}
            >
              <Text style={[styles.modalButtonText, { color: theme.colors.onPrimary }]}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 20}
      >
        <View style={{ flex: 1 }}>
          {/* Nagłówek */}
          <View style={styles.header}>
            {/* Usunięty tekst nagłówka */}
            {/* Możesz dodać tutaj logo lub inne elementy, jeśli potrzebujesz */}
          </View>

          {/* Pasek wyszukiwania i przycisk przełączania motywu */}
          <View style={styles.searchAndToggleContainer}>
            <View style={[
                styles.inputContainer, 
                isFocused && styles.inputFocused
              ]}>
              <PaperTextInput
                label="Search Country"
                value={searchQuery}
                onChangeText={setSearchQuery}
                mode="flat"
                style={styles.input}
                theme={{
                  colors: {
                    primary: isFocused ? theme.colors.primary : theme.colors.outline,
                    background: 'transparent',
                    text: theme.colors.onSurface,
                  },
                }}
                underlineColor="transparent"
                left={
                  <PaperTextInput.Icon
                    icon={() => <FontAwesome name="search" size={20} color={isFocused ? theme.colors.primary : theme.colors.outline} />}
                    style={styles.iconLeft}
                  />
                }
                autoCapitalize="none"
                onFocus={() => {
                  setIsInputFocused(true);
                  setIsFocused(true);
                  fadeAnim.setValue(0);
                }}
                onBlur={() => {
                  setIsInputFocused(false);
                  setIsFocused(false);
                  Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                  }).start();
                }}
              />
            </View>

            {/* Okrągły przycisk do przełączania motywu */}
            <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
              <Pressable
                onPress={handleToggleTheme}
                style={[
                  styles.toggleButton,
                  { backgroundColor: theme.colors.primary },
                ]}
              >
                {isDarkTheme ? (
                  <MaterialIcons name="dark-mode" size={24} color={theme.colors.onPrimary} />
                ) : (
                  <MaterialIcons name="light-mode" size={24} color={theme.colors.onPrimary} />
                )}
              </Pressable>
            </Animated.View>
          </View>

          {/* Lista krajów */}
          <View style={{ flex: 1, marginBottom: -20 }}>
            <SectionList
              sections={processedCountries}
              keyExtractor={(item) => item.cca3}
              renderItem={renderCountryItem}
              renderSectionHeader={renderSectionHeader}
              stickySectionHeadersEnabled={false}
              contentContainerStyle={{ paddingBottom: 80 }}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No countries found.</Text>
                </View>
              }
              style={{ flex: 1 }}
            />
          </View>

          {/* Przycisk "Save and Continue" */}
          <Animated.View
            style={[
              styles.footer,
              {
                opacity: fadeAnim,
                transform: [
                  {
                    translateY: fadeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [50, 0],
                    }),
                  },
                ],
                bottom: isInputFocused ? -styles.saveButton.marginBottom - 2 : 0,
              },
            ]}
          >
            <Pressable
              onPress={handleSaveCountries}
              style={[
                styles.saveButton,
                selectedCountries.length === 0 && styles.saveButtonDisabled,
                selectedCountries.length > 0 ? { backgroundColor: theme.colors.primary } : {},
              ]}
              disabled={selectedCountries.length === 0}
            >
              <Text style={[styles.saveButtonText, { color: theme.colors.onPrimary }]}>Save and Continue</Text>
            </Pressable>
          </Animated.View>
        </View>
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
    padding: 0,
    paddingTop: 20,
  },
  header: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 13,
  },
  searchAndToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center', // Wyśrodkowanie w poziomie
    marginHorizontal: 13,
    marginBottom: 13,
    marginTop: 10
  },
  inputContainer: {
    width: width * 0.80, // Dostosowane do miejsca na przycisk
    backgroundColor: '#f0ed8f5',
    borderRadius: 28, // Zwiększony borderRadius dla lepszej estetyki
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#ccc', // Domyślny kolor obramowania
    flexDirection: 'row',
    alignItems: 'center',
    height: height * 0.06, // 6% wysokości ekranu
    flex: 1, // Rozciągnięcie na dostępne miejsce
  },
  toggleButton: {
    width: height * 0.06, // Dostosowane do wysokości pola wyszukiwania
    height: height * 0.06, // Dostosowane do wysokości pola wyszukiwania
    borderRadius: height * 0.06 / 2, // Okrągły
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10, // Odstęp między polem a przyciskiem
  },
  inputFocused: {
    borderColor: '#6a1b9a', // Kolor obramowania w stanie fokusu
  },
  input: {
    flex: 1,
    paddingLeft: 10,
    height: 50, // Stała wysokość
    fontSize: 14,
    backgroundColor: 'transparent', // Usuń tło z TextInput
    borderRadius: 0, // Usuń wewnętrzny borderRadius
    color: '#000', // Upewnij się, że tekst jest widoczny
  },
  iconLeft: {
    marginLeft: 10,
  },
  countryItemContainer: {
    width: '100%',
    backgroundColor: '#fff', // Domyślne tło (możesz dostosować)
  },
  sectionHeader: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    width: '100%',
    backgroundColor: '#f0f0f0',
    marginLeft: 7,
    marginTop: 7,
  },
  sectionHeaderText: {
    fontSize: 16,
    fontWeight: '600',
  },
  flagWithBorder: {
    borderWidth: 1,
    borderRadius: 5,
    overflow: 'hidden',
  },
  highlightedItem: {
    backgroundColor: '#f5f5f5', // Szary kolor dla zaznaczonych krajów
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50, // Stała wysokość
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
  },
  flagContainer: {
    marginRight: 10,
    width: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 7,
  },
  countryText: {
    flex: 1,
    fontSize: 16,
    marginLeft: 5,
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
    backgroundColor: 'transparent', // Transparent footer
    zIndex: 100, // Upewnij się, że przycisk jest nad innymi elementami
  },
  saveButton: {
    backgroundColor: '#7511b5',
    paddingVertical: 11,
    paddingHorizontal: 30,
    alignItems: 'center',
    borderRadius: 25,
    width: '80%',
    elevation: 2, // Dodanie cienia dla efektu uniesienia (Android)
    shadowColor: '#000', // Dodanie cienia dla efektu uniesienia (iOS)
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    marginBottom: 17,
  },
  saveButtonDisabled: { // rgba(117, 17, 181, 0.5)
    backgroundColor: 'rgba(117, 17, 181, 0.25)', // 25% przezroczystości
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  sectionList: {
    flex: 1,
  },
  roundedFlag: {
    borderRadius: 5, // Połowa rozmiaru flagi, aby uzyskać zaokrąglenie
    overflow: 'hidden',
  },
  roundCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 7,
  },
  roundCheckboxChecked: {
    backgroundColor: '#6a1b9a',
    borderColor: '#6a1b9a',
  },
  roundCheckboxUnchecked: {
    borderColor: '#ccc',
    backgroundColor: 'transparent',
  },
  // Styles for Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)', // Przyciemnione tło
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: width * 0.8,
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  modalText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
