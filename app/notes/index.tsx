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
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ThemeContext } from '../config/ThemeContext';
import { useTheme, TextInput as PaperTextInput } from 'react-native-paper';
import { collection, getDocs, deleteDoc, addDoc, doc } from 'firebase/firestore';
import { db, auth } from '../config/firebaseConfig';
import { Ionicons, FontAwesome, MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import CountryFlag from 'react-native-country-flag';
import filteredCountriesData from '../../components/filteredCountries.json';
import NoteItem from '@/components/NoteItem';
import CountryItem from '@/components/CountryItem';
import { Animated as AnimatedRN } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

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
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const [isModalInputFocused, setIsModalInputFocused] = useState<boolean>(false);
  const fadeAnim = useRef(new AnimatedRN.Value(1)).current;
  const scaleValue = useRef(new AnimatedRN.Value(1)).current;

  const { height, width } = Dimensions.get('window');

  // Stała wysokości elementu listy
  const ITEM_HEIGHT = 50;

  // Obliczanie dynamicznej wysokości listy
  const listHeight = useMemo(() => {
    if (filteredCountries.length === 1) {
      return ITEM_HEIGHT;
    } else if (filteredCountries.length >= 2) {
      return ITEM_HEIGHT * 2; // Wyświetl dwa elementy
    }
    return 0;
  }, [filteredCountries.length]);

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
        setIsModalVisible(false); // Zamknij modal po dodaniu
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

          {/* Plus Button */}
          <View style={styles.plusButtonContainer}>
            <TouchableOpacity onPress={() => setIsModalVisible(true)} style={[styles.plusButton, { backgroundColor: theme.colors.primary }]}>
              <Ionicons name="add" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Modal */}
          <Modal
            visible={isModalVisible}
            transparent
            animationType="slide"
            onRequestClose={() => setIsModalVisible(false)}
          >
            <TouchableWithoutFeedback onPress={() => setIsModalVisible(false)}>
              <BlurView intensity={50} tint={isDarkTheme ? 'dark' : 'light'} style={styles.blurView} />
            </TouchableWithoutFeedback>
            <View style={styles.modalContainer}>
            <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
                {/* Close Button */}
                <TouchableOpacity
                    onPress={() => {
                    console.log('Close button pressed');
                    setIsModalVisible(false);
                    }}
                    style={styles.modalCloseButton}
                >
                    <Ionicons name="close" size={24} color={theme.colors.onSurface} />
                </TouchableOpacity>

                {/* Modal Header */}
                <Text style={[styles.modalHeader, { color: theme.colors.onSurface, marginTop: -43 }]}>Add a Note</Text>

                {/* Formularz Dodawania Notatki */}
                <View style={[styles.formContainer, { backgroundColor: theme.colors.surface }]}>
                  {/* Pasek wyszukiwania kraju */}
                  <View style={[styles.inputContainer, isModalInputFocused && styles.inputFocused]}>
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
                          primary: isModalInputFocused ? theme.colors.primary : theme.colors.outline,
                          background: 'transparent',
                          text: theme.colors.onSurface,
                        },
                      }}
                      underlineColor="transparent"
                      left={
                        <PaperTextInput.Icon
                          icon={() => <FontAwesome name="search" size={20} color={isModalInputFocused ? theme.colors.primary : theme.colors.outline} />}
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
                        setIsModalInputFocused(true);
                        fadeAnim.setValue(0);
                      }}
                      onBlur={() => {
                        setIsModalInputFocused(false);
                        AnimatedRN.timing(fadeAnim, {
                          toValue: 1,
                          duration: 300,
                          useNativeDriver: true,
                        }).start();
                      }}
                    />
                  </View>

                  {/* Lista wyników wyszukiwania */}
                  {filteredCountries.length > 0 && (
                    <View
                      style={[
                        styles.countriesListWrapper,
                        { height: listHeight, backgroundColor: theme.colors.surface },
                      ]}
                    >
                      <FlatList
                        data={filteredCountries}
                        keyExtractor={(item) => item.cca2}
                        renderItem={renderCountryItem}
                        scrollEnabled={filteredCountries.length > 2}
                      />
                      {filteredCountries.length > 2 && (
                        <>
                          {/* Gradient na górze */}
                          <LinearGradient
                            colors={['rgba(255,255,255,1)', 'rgba(255,255,255,0)']}
                            style={styles.topGradient}
                            pointerEvents="none"
                          />
                          {/* Gradient na dole */}
                          <LinearGradient
                            colors={['rgba(255,255,255,0)', 'rgba(255,255,255,1)']}
                            style={styles.bottomGradient}
                            pointerEvents="none"
                          />
                        </>
                      )}
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
                  <View style={styles.textInputContainer}>
                    <TextInput
                      style={[
                        styles.textInput,
                        { color: theme.colors.onSurface, borderColor: theme.colors.onSurface, paddingTop: 10 },
                      ]}
                      placeholder="Enter your note"
                      placeholderTextColor="gray"
                      value={noteText}
                      onChangeText={setNoteText}
                      multiline
                      scrollEnabled
                      textAlignVertical="top"
                    />
                  </View>

                  {/* Przycisk dodawania notatki */}
                  <TouchableOpacity
                    style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
                    onPress={handleAddNote}
                  >
                    <Text style={styles.addButtonText}>Add Note</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

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

const { width, height: deviceHeight } = Dimensions.get('window');

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
  modalContainer: {
    flex: 1,
    justifyContent: 'center', // Wyśrodkowanie modala
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: width * 0.95,
    height: deviceHeight * 0.95, // Ustawienie wysokości modala na 95% wysokości ekranu
    padding: 20,
    borderRadius: 20,
    // backgroundColor: theme.colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    position: 'relative', // Upewnij się, że jest relative
  },
  blurView: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 10, // Zwiększ obszar dotykowy
    borderRadius: 20,
    zIndex: 1, // Upewnij się, że jest na wierzchu
  },
  modalHeader: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
    marginTop: 40, // Zapewnij odpowiednią przestrzeń od góry
    paddingTop: 40,
  },
  formContainer: {
    flex: 1, // Wypełnia całą dostępną przestrzeń
    padding: 4,
    borderRadius: 10,
    flexDirection: 'column',
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  inputContainer: {
    width: '100%',
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
  plusButtonContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  plusButton: {
    width: 40,
    height: 40,
    borderRadius: 30, // Make it round
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
  },
  inputFocused: {
    borderColor: '#6a1b9a',
  },
  iconLeft: {
    marginLeft: 10,
  },
  countriesListWrapper: {
    width: '100%',
    borderRadius: 8,
    overflow: 'hidden', // Ukryj elementy poza widocznym obszarem
    borderWidth: 0.5,
    borderColor: '#ccc',
    marginTop: -6,
    position: 'relative', // Dodane dla gradientów
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 20,
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 20,
  },
  selectedCountryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 28, // Dodanie zaokrąglenia
    borderWidth: 1,
    borderColor: '#ccc',
    marginBottom: 17, // Dodanie marginesu
    backgroundColor: 'transparent', // Opcjonalne tło
  },
  selectedCountryFlag: {
    marginRight: 10,
    borderRadius: 8, // Dopasowanie zaokrąglenia flagi
  },
  textInputContainer: {
    flex: 1, // Wypełnia całą dostępną przestrzeń
    marginBottom: 10,
  },
  textInput: {
    flex: 1, // Wypełnia całą dostępna przestrzeń w kontenerze
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10, // Padding tylko po bokach
    paddingVertical: 0, // Brak paddingu od góry i dołu
    textAlignVertical: 'top', // Ustawienie tekstu na górze
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
