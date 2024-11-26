// app/notes/index.tsx

import React, { useContext, useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  FlatList,
  ActivityIndicator,
  Pressable,
  Animated,
  KeyboardAvoidingView,
  SafeAreaView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ThemeContext } from '../config/ThemeContext';
import { useTheme, TextInput as PaperTextInput } from 'react-native-paper';
import { collection, getDocs, deleteDoc, addDoc, doc } from 'firebase/firestore';
import { db, auth } from '../config/firebaseConfig';
import { Ionicons, FontAwesome, MaterialIcons } from '@expo/vector-icons';
import CountryFlag from 'react-native-country-flag';
import filteredCountriesData from '../../components/filteredCountries.json';
import NoteItem from '@/components/NoteItem';
import CountryItem from '@/components/CountryItem';
import { Animated as AnimatedRN } from 'react-native';

// Interface definitions
interface Note {
  id: string;
  countryCca2: string;
  noteText: string;
  createdAt: any;
}

type Country = {
  id: string;
  name: string;
  officialName: string;
  cca2: string;
  cca3: string;
  region: string;
  subregion: string;
  class: string | null;
  path: string;
};

export default function NotesScreen() {
  const { isDarkTheme, toggleTheme } = useContext(ThemeContext);
  const theme = useTheme();
  const router = useRouter();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [noteText, setNoteText] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const [filteredCountries, setFilteredCountries] = useState<Country[]>([]);

  const fadeAnim = useRef(new AnimatedRN.Value(1)).current;
  const scaleValue = useRef(new AnimatedRN.Value(1)).current;

  const { height, width } = Dimensions.get('window');

  // Mapowanie krajów z filteredCountries.json
  const mappedCountries: Country[] = useMemo(() => {
    return filteredCountriesData.countries
      .filter((country) => !!country.cca2 && !!country.name)
      .map((country) => ({
        ...country,
      }));
  }, []);

  // Funkcja usuwająca duplikaty notatek
  const removeDuplicateNotes = useCallback((notesArray: Note[]): Note[] => {
    const uniqueNotes = new Map<string, Note>();
    notesArray.forEach((note) => uniqueNotes.set(note.id, note));
    return Array.from(uniqueNotes.values());
  }, []);

  // Pobieranie notatek z Firestore
  const fetchNotes = useCallback(async () => {
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        const notesCollectionRef = collection(db, 'users', currentUser.uid, 'notes');
        const notesSnapshot = await getDocs(notesCollectionRef);
        const notesList: Note[] = notesSnapshot.docs.map((doc) => ({
          id: doc.id,
          countryCca2: doc.data().countryCca2,
          noteText: doc.data().noteText,
          createdAt: doc.data().createdAt,
        }));
        setNotes(removeDuplicateNotes(notesList));
      } else {
        console.log('No current user.');
      }
    } catch (error: any) {
      if (error.code === 'unavailable') {
        Alert.alert('Offline', 'Unable to fetch notes. Check your internet connection.');
      } else {
        console.error('Error fetching notes:', error);
        Alert.alert('Error', 'Unable to fetch notes.');
      }
    } finally {
      setLoading(false);
    }
  }, [removeDuplicateNotes]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  // Funkcja dodająca notatkę
  const handleAddNote = useCallback(async () => {
    if (!selectedCountry) {
      Alert.alert('Error', 'Please select a country.');
      return;
    }
    if (!noteText.trim()) {
      Alert.alert('Error', 'Please enter a note.');
      return;
    }
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        const notesCollectionRef = collection(db, 'users', currentUser.uid, 'notes');
        const newNote = { countryCca2: selectedCountry, noteText: noteText.trim(), createdAt: new Date() };
        const docRef = await addDoc(notesCollectionRef, newNote);
        setNotes((prevNotes) => [...prevNotes, { id: docRef.id, ...newNote }]);
        setSelectedCountry('');
        setNoteText('');
        Alert.alert('Success', 'Note added successfully.');
      }
    } catch (error) {
      console.error('Error adding note:', error);
      Alert.alert('Error', 'Unable to add note.');
    }
  }, [selectedCountry, noteText]);

  // Funkcja usuwająca notatkę
  const handleDeleteNote = useCallback(async (noteId: string) => {
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        const noteDocRef = doc(db, 'users', currentUser.uid, 'notes', noteId);
        await deleteDoc(noteDocRef);
        setNotes((prevNotes) => prevNotes.filter((note) => note.id !== noteId));
        Alert.alert('Success', 'Note deleted successfully.');
      }
    } catch (error) {
      console.error('Error deleting note:', error);
      Alert.alert('Error', 'Unable to delete note.');
    }
  }, []);

  // Funkcja do obsługi wyboru kraju
  const handleSelectCountry = useCallback((countryCode: string) => {
    setSelectedCountry(countryCode);
    setSearchQuery('');
    setFilteredCountries([]);
  }, []);

  // Filtrowanie krajów na podstawie zapytania wyszukiwania
  useEffect(() => {
    console.log('Search Query:', searchQuery); // Debugowanie
    if (searchQuery.length > 1) {
      const filtered = mappedCountries.filter((country) =>
        country.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      console.log('Filtered countries:', filtered); // Debugowanie
      setFilteredCountries(filtered);
    } else {
      setFilteredCountries([]);
    }
  }, [searchQuery, mappedCountries]);

  // Renderowanie elementu CountryItem
  const renderCountryItem = useCallback(
    ({ item }: { item: Country }) => (
      <CountryItem
        item={item}
        onSelect={handleSelectCountry}
        isSelected={selectedCountry === item.cca2}
      />
    ),
    [handleSelectCountry, selectedCountry]
  );

  // Renderowanie elementu Notatki
  const renderNoteItem = useCallback(
    ({ item }: { item: Note }) => {
      const country = mappedCountries.find((c) => c.cca2 === item.countryCca2);
      return (
        <NoteItem
          note={item}
          onDelete={handleDeleteNote}
          country={country}
        />
      );
    },
    [handleDeleteNote, mappedCountries]
  );

  // Funkcja obsługująca przełączanie motywu z animacją
  const handleToggleTheme = useCallback(() => {
    toggleTheme();
    AnimatedRN.sequence([
      AnimatedRN.timing(scaleValue, {
        toValue: 1.2,
        duration: 100,
        useNativeDriver: true,
      }),
      AnimatedRN.timing(scaleValue, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scaleValue, toggleTheme]);

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          {/* Header */}
          <View style={[styles.header, { paddingTop: height * 0.03 }]}>
            <TouchableOpacity onPress={() => router.back()} style={[styles.headerButton, { marginLeft: -17 }]}>
              <Ionicons name="arrow-back" size={28} color={theme.colors.onBackground} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.colors.onBackground }]}>Notes</Text>
            <TouchableOpacity onPress={handleToggleTheme} style={[styles.headerButton, { marginRight: -17 }]}>
              <Ionicons name={isDarkTheme ? "sunny" : "moon"} size={28} color={theme.colors.onBackground} />
            </TouchableOpacity>
          </View>

          {/* Formularz Dodawania Notatki */}
          <View style={[styles.formContainer, { backgroundColor: theme.colors.surface }]}>
            {/* Pasek wyszukiwania kraju */}
            {/* <Text style={[styles.formLabel, { color: theme.colors.onSurface }]}>Search Country:</Text> */}
            <View style={[styles.inputContainer, isFocused && styles.inputFocused]}>
            <PaperTextInput
            label="Search Country"
            value={searchQuery}
            onChangeText={setSearchQuery}
            mode="flat"
            style={{
                flex: 1,
                paddingLeft: 10,
                height: 50,
                fontSize: 14,
                backgroundColor: 'transparent',
                borderRadius: 0,
                color: '#000',
            }}
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
              right={
                searchQuery ? (
                  <PaperTextInput.Icon
                    icon={() => <MaterialIcons name="close" size={17} color={theme.colors.outline} />}
                    onPress={() => setSearchQuery('')}
                  />
                ) : null
            }
            autoCapitalize="none"
            onFocus={() => {
              setIsFocused(true);
              fadeAnim.setValue(0);
            }}
            />
            </View>

            {/* Lista wyników wyszukiwania */}
            {filteredCountries.length > 0 && (
              <View style={[styles.countriesListContainer, { backgroundColor: theme.colors.surface }]}>
                <FlatList
                  data={filteredCountries}
                  keyExtractor={(item) => item.cca2}
                  renderItem={renderCountryItem}
                  keyboardShouldPersistTaps="handled"
                />
                {/* Tymczasowy tekst do debugowania - Usuń po naprawieniu błędu */}
                {/* <Text>Lista krajów jest wyświetlana</Text> */}
              </View>
            )}

            {/* Wybrany kraj */}
            <Text style={[styles.formLabel, { color: theme.colors.onSurface }]}>Selected Country:</Text>
            <View style={styles.selectedCountryContainer}>
              {selectedCountry ? (
                <>
                  <CountryFlag isoCode={selectedCountry} size={25} style={styles.selectedCountryFlag} />
                  <Text style={{ color: theme.colors.onSurface, marginLeft: 5 }}>
                    {mappedCountries.find(c => c.cca2 === selectedCountry)?.name || 'Unknown Country'}
                  </Text>
                </>
              ) : (
                <Text style={{ color: 'gray' }}>No country selected.</Text>
              )}
            </View>

            {/* Pole tekstowe na notatkę */}
            <Text style={[styles.formLabel, { color: theme.colors.onSurface }]}>Note:</Text>
            <TextInput
              style={[
                styles.textInput,
                { color: theme.colors.onSurface, borderColor: theme.colors.onSurface },
              ]}
              placeholder="Enter your note"
              placeholderTextColor="gray"
              value={noteText}
              onChangeText={setNoteText}
              multiline
            />

            {/* Przycisk dodawania notatki */}
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
              onPress={handleAddNote}
            >
              <Text style={styles.addButtonText}>Add Note</Text>
            </TouchableOpacity>
          </View>

          {/* Lista Notatek */}
          {loading ? (
            <ActivityIndicator size="large" color={theme.colors.primary} />
          ) : notes.length > 0 ? (
            <FlatList
              data={notes}
              keyExtractor={(item) => item.id}
              renderItem={renderNoteItem}
              contentContainerStyle={styles.notesList}
            />
          ) : (
            <View style={styles.noNotesContainer}>
              <Text style={[styles.noNotesText, { color: theme.colors.onSurface }]}>
                You haven't created any notes yet.
              </Text>
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    marginBottom: 20, // Dodany margines poniżej nagłówka
  },
  headerButton: {
    padding: 8,
    width: 40,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  formContainer: {
    padding: 16,
    borderRadius: 10,
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    // marginTop: 17,
  },
  inputContainer: {
    width: '100%',
    // backgroundColor: '#f0f0f0',
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#ccc',
    flexDirection: 'row',
    alignItems: 'center',
    height: 50, // Użyj jawnej liczby
    paddingHorizontal: 10, // Opcjonalnie, aby dodać przestrzeń wewnętrzną
    marginBottom: 17,   
  },
  inputFocused: {
    borderColor: '#6a1b9a',
  },
  input: {
    flex: 1,
    fontSize: 16,
    backgroundColor: 'transparent',
    color: '#000',
    height: '100%', // Dopasowanie do kontenera
  },
  iconLeft: {
    marginLeft: 10,
  },
  countriesListContainer: {
    maxHeight: 200,
    marginBottom: 10,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: '#ccc',
    marginTop: -6
  },
  selectedCountryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 17,
  },
  selectedCountryFlag: {
    marginRight: 5,
  },
  textInput: {
    height: 80,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    textAlignVertical: 'top',
    marginBottom: 10,
  },
  addButton: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25, // Większe zaokrąglenie
    alignItems: 'center',
    backgroundColor: '#6200ee',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    alignSelf: 'center', // Wyśrodkowanie
    width: '80%', // Szerokość przycisku
    marginTop: 10, // Margines górny
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold', // Spójność z innymi przyciskami
  },
  notesList: {
    paddingBottom: 20,
  },
  noteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  noteFlag: {
    marginRight: 10,
  },
  noteTextContainer: {
    flex: 1,
  },
  noteCountryName: {
    fontSize: 16,
    fontWeight: '600',
  },
  noteText: {
    flex: 1,
    fontSize: 14,
    marginRight: 10,
  },
  noNotesContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  noNotesText: {
    fontSize: 16,
    fontStyle: 'italic',
  },
});
