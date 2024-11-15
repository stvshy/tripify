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
  TouchableOpacity,
  UIManager,
  LayoutAnimation,
} from 'react-native';
import { TextInput as PaperTextInput, Checkbox, Switch, useTheme } from 'react-native-paper';
import { doc, updateDoc } from 'firebase/firestore';
import { useRouter } from 'expo-router';
import { auth, db } from '../config/firebaseConfig';
import CountryFlag from 'react-native-country-flag';
import countries from 'world-countries';
import { ThemeContext } from '../config/ThemeContext';
import { FontAwesome, MaterialIcons } from '@expo/vector-icons'; 
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
  const [isKeyboardVisible, setKeyboardVisible] = useState(true); // State to track keyboard visibility
  const [highlightedItem, setHighlightedItem] = useState<string | null>(null);
 // Animacja dla przycisku
  const fadeAnim = useState(new Animated.Value(1))[0]; // Domyślnie widoczny
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [scaleValue] = useState(new Animated.Value(1));
 // Nasłuchiwanie stanu klawiatury
 useEffect(() => {
  const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
  const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

  if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
  const keyboardShowListener = Keyboard.addListener(showEvent, () => {
    // Natychmiast ukrywamy przycisk, gdy klawiatura się wysuwa
    if (isInputFocused) {
      fadeAnim.setValue(0);
    }
  });

  const keyboardHideListener = Keyboard.addListener(hideEvent, () => {
    // Animowane pojawienie się przycisku po schowaniu klawiatury
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
 // Definiowanie dynamicznych kolorów separatorów
 return (
  <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.keyboardAvoidingView}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 20}
    >
      <View style={{ flex: 1 }}>
        {/* Nagłówek */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.primary }]}>
            Select countries you've visited
          </Text>
          {/* Możesz tutaj pozostawić przełącznik motywu lub usunąć, jeśli umieszczasz go obok input */}
        </View>

        <View style={styles.searchAndToggleContainer}>
  <PaperTextInput
    label="Select countries you've visied"
    value={searchQuery}
    onChangeText={setSearchQuery}
    mode="flat"
    style={styles.input}
    theme={{
      colors: {
        primary: theme.colors.primary,
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
    // flexDirection: 'column',
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: -5,
    marginTop: 10,
    paddingHorizontal: 13, // Przeniesienie paddingu tutaj
  },
  searchAndToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center', // Wyśrodkowanie w poziomie
    marginHorizontal: 13,
    marginBottom: 13,
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
  flagWithBorder: {
    borderWidth: 1,
    // borderColor: '#ccc',
    borderRadius: 5,
    overflow: 'hidden',
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
    // marginBottom: 13,
    borderWidth: 2,
    borderColor: '#ccc', // Domyślny kolor obramowania
    flexDirection: 'row',
    alignItems: 'center',
    height: height * 0.075,
    flex: 1, // Rozciągnięcie na dostępne miejsce
  },
  toggleButton: {
    width: 40,
    height: 40,
    borderRadius: 20, // Okrągły
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
    height: 50, // Stała wysokość, musi odpowiadać getItemLayout
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
    marginTop: 7
  },
  sectionHeaderText: {
    fontSize: 16,
    fontWeight: '600',
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
    // borderBottomColor: '#ccc',
  },
  flagContainer: {
    marginRight: 10,
    width: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 7

  },
  countryText: {
    flex: 1,
    fontSize: 16,
    marginLeft: 5
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
    // paddingVertical: -10,
    marginBottom: -6,
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
    marginBottom: 17
  },
  saveButtonDisabled: { //    rgba(117, 17, 181, 0.5)
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
    marginRight: 7
  },
  roundCheckboxChecked: {
    backgroundColor: '#6a1b9a',
    borderColor: '#6a1b9a',
  },
  roundCheckboxUnchecked: {
    borderColor: '#ccc',
    backgroundColor: 'transparent',
  },
});

