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
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ThemeContext } from '../config/ThemeContext';
import { useTheme, TextInput as PaperTextInput } from 'react-native-paper';
import { collection, getDocs, deleteDoc, addDoc, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../config/firebaseConfig';
import { Ionicons, FontAwesome, MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import CountryFlag from 'react-native-country-flag';
import filteredCountriesData from '../../components/filteredCountries.json';
import NoteItem from '@/components/NoteItem';
import CountryItem from '@/components/CountryItem';
import { Animated as AnimatedRN } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MasonryList from 'react-native-masonry-list';

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
  const [isKeyboardVisible, setIsKeyboardVisible] = useState<boolean>(false); // Dodany stan
  const fadeAnim = useRef(new AnimatedRN.Value(1)).current;
  const scaleValue = useRef(new AnimatedRN.Value(1)).current;
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isEditModalVisible, setIsEditModalVisible] = useState<boolean>(false);
  const [editedNoteText, setEditedNoteText] = useState<string>('');
  
  const { height, width: deviceWidth } = Dimensions.get('window');
  const deviceHeight = height; // Używamy deviceHeight w stylach

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

  // Nasłuchiwanie zdarzeń klawiatury
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      setIsKeyboardVisible(true);
    });
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setIsKeyboardVisible(false);
    });

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

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
        <TouchableOpacity
          style={[styles.noteItem, { backgroundColor: isDarkTheme ? '#000' : '#fff' }]}
          onPress={() => {
            setSelectedNote(item);
            setEditedNoteText(item.noteText); // Ustawienie istniejącego tekstu
            setIsEditModalVisible(true);
          }}
        >
          {/* Flaga i nazwa kraju */}
          <View style={styles.noteFlag}>
            {country && <CountryFlag isoCode={country.cca2} size={25} />}
            <Text style={{ fontWeight: 'bold', marginTop: 5 }}>{country?.name}</Text>
          </View>
          {/* Tekst notatki */}
          <Text style={styles.noteText}>{item.noteText}</Text>
          {/* Opcjonalnie: Przycisk usunięcia */}
          <TouchableOpacity onPress={() => handleDeleteNote(item.id)} style={{ position: 'absolute', top: 10, right: 10 }}>
            <Ionicons name="trash" size={20} color="red" />
          </TouchableOpacity>
        </TouchableOpacity>
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

  // Funkcja edytująca notatkę
  const handleEditNote = useCallback(async () => {
    if (!selectedNote) return;

    if (!editedNoteText.trim()) {
      Alert.alert('Error', 'Please enter a note.');
      return;
    }

    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        const noteDocRef = doc(db, 'users', currentUser.uid, 'notes', selectedNote.id);
        await updateDoc(noteDocRef, { noteText: editedNoteText.trim() });
        setNotes((prevNotes) =>
          prevNotes.map((note) =>
            note.id === selectedNote.id ? { ...note, noteText: editedNoteText.trim() } : note
          )
        );
        Alert.alert('Success', 'Note updated successfully.');
        setIsEditModalVisible(false);
        setSelectedNote(null);
        setEditedNoteText('');
      }
    } catch (error) {
      console.error('Error updating note:', error);
      Alert.alert('Error', 'Unable to update note.');
    }
  }, [editedNoteText, selectedNote]);
  const splitIntoColumns = (data: Note[]) => {
    const leftColumn: Note[] = [];
    const rightColumn: Note[] = [];
  
    data.forEach((item, index) => {
      if (index % 2 === 0) {
        leftColumn.push(item);
      } else {
        rightColumn.push(item);
      }
    });
  
    console.log('Left Column:', leftColumn);
    console.log('Right Column:', rightColumn);
  
    return { leftColumn, rightColumn };
  };
  
  console.log('Notes:', notes);
  const { leftColumn, rightColumn } = splitIntoColumns(notes);
  
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

          {/* Modal dodawania notatki */}
          <Modal
            visible={isModalVisible}
            transparent
            animationType="slide"
            onRequestClose={() => setIsModalVisible(false)}
          >
            <TouchableWithoutFeedback onPress={() => setIsModalVisible(false)}>
              <BlurView intensity={50} tint={isDarkTheme ? 'dark' : 'light'} style={styles.blurView} />
            </TouchableWithoutFeedback>
            <KeyboardAvoidingView
              style={styles.modalContainer}
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 20} // Dostosuj wartość w zależności od potrzeb
            >
              <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={[
                  styles.modalContent, 
                  { 
                    backgroundColor: theme.colors.surface,
                    height: isKeyboardVisible ? deviceHeight * 0.81 : deviceHeight * 0.95, // Dynamiczna wysokość
                  }
                ]}>
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
                              colors={[
                                isDarkTheme ? 'rgba(30,30,30,1)' : 'rgba(255,255,255,1)', 
                                isDarkTheme ? 'rgba(30,30,30,0)' : 'rgba(255,255,255,0)'
                              ]}
                              style={styles.topGradient}
                              pointerEvents="none"
                            />
                            {/* Gradient na dole */}
                            <LinearGradient
                              colors={[
                                isDarkTheme ? 'rgba(30,30,30,0)' : 'rgba(255,255,255,0)',
                                isDarkTheme ? 'rgba(30,30,30,1)' : 'rgba(255,255,255,1)'
                              ]}
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
              </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
          </Modal>

          {/* Modal edycji notatki */}
          <Modal
            visible={isEditModalVisible}
            transparent
            animationType="slide"
            onRequestClose={() => setIsEditModalVisible(false)}
          >
            <TouchableWithoutFeedback onPress={() => setIsEditModalVisible(false)}>
              <BlurView intensity={50} tint={isDarkTheme ? 'dark' : 'light'} style={styles.blurView} />
            </TouchableWithoutFeedback>
            <KeyboardAvoidingView
              style={styles.modalContainer}
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 20}
            >
              <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={[
                  styles.modalContent, 
                  { 
                    backgroundColor: theme.colors.surface,
                    height: isKeyboardVisible ? deviceHeight * 0.81 : deviceHeight * 0.95,
                  }
                ]}>
                  {/* Close Button */}
                  <TouchableOpacity
                    onPress={() => setIsEditModalVisible(false)}
                    style={styles.modalCloseButton}
                  >
                    <Ionicons name="close" size={24} color={theme.colors.onSurface} />
                  </TouchableOpacity>

                  {/* Modal Header */}
                  <Text style={[styles.modalHeader, { color: theme.colors.onSurface }]}>Edit Note</Text>

                  {/* Formularz edycji notatki */}
                  <View style={[styles.formContainer, { backgroundColor: theme.colors.surface }]}>
                    {/* Pole tekstowe na edytowaną notatkę */}
                    <View style={styles.textInputContainer}>
                      <TextInput
                        style={[
                          styles.textInput,
                          { color: theme.colors.onSurface, borderColor: theme.colors.onSurface, paddingTop: 10 },
                        ]}
                        placeholder="Edit your note"
                        placeholderTextColor="gray"
                        value={editedNoteText}
                        onChangeText={setEditedNoteText}
                        multiline
                        scrollEnabled
                        textAlignVertical="top"
                      />
                    </View>

                    {/* Przycisk zapisywania zmian */}
                    <TouchableOpacity
                      style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
                      onPress={handleEditNote}
                    >
                      <Text style={styles.addButtonText}>Save Changes</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
          </Modal>

          {/* Lista Notatek */}
          {loading ? (
          <ActivityIndicator size="large" color={theme.colors.primary} />
        ) : notes.length > 0 ? (
<ScrollView contentContainerStyle={styles.masonryContainer}>
  {/* Lewa kolumna */}
  <View style={styles.column}>
    <FlatList
      data={leftColumn}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => renderNoteItem({ item })}
      scrollEnabled={false} // Wyłączamy przewijanie wewnętrzne
    />
  </View>
  {/* Prawa kolumna */}
  <View style={styles.column}>
    <FlatList
      data={rightColumn}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => renderNoteItem({ item })}
      scrollEnabled={false} // Wyłączamy przewijanie wewnętrzne
    />
  </View>
</ScrollView>

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
  masonryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    // paddingHorizontal: 10,
    // flex: 1, // Umożliwienie zajmowania pełnej wysokości
  },
  column: {
    flex: 1, // Każda kolumna zajmuje połowę szerokości
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center', // Wyśrodkowanie modala
    alignItems: 'center',
    // padding: 20,
  },
  modalContent: {
    width: '95%',
    padding: 20,
    borderRadius: 20,
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
    borderRadius: 28,
    overflow: 'hidden', // Ukryj elementy poza widocznym obszarem
    borderWidth: 0.5,
    borderColor: '#ccc',
    marginTop: -6,
    position: 'relative', // Dodane dla gradientów
    marginBottom: 7
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
    flexGrow: 1, // Dodane
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  noteItem: {
    borderRadius: 10,
    padding: 16,
    marginBottom: 10,
    // flex: 1,
    backgroundColor: '#f9f9f9',
    marginHorizontal: 5,
    // Dodaj cienie dla iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    // Dodaj cienie dla Android
    elevation: 3,
  },
  noteFlag: {
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  noteTextContainer: {
    flex: 1,
  },
  noteCountryName: {
    fontSize: 16,
    fontWeight: '600',
  },
  noteText: {
    // flex: 1,
    fontSize: 14,
    // marginRight: 10,
    //  lineHeight: 20,
     color: '#000', // Tekst czarny
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
