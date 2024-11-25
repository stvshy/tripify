// app/notes/index.tsx
import React, { useContext, useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  TextInput,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ThemeContext } from '../config/ThemeContext';
import { useTheme } from 'react-native-paper';
import { getDoc, doc, updateDoc, collection, getDocs, addDoc } from 'firebase/firestore';
import { db, auth } from '../config/firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import countriesData from '../../assets/maps/countries.json';
import CountryFlag from 'react-native-country-flag';
import { Country } from '../../.expo/types/country';


interface Note {
  id: string;
  countryCca2: string;
  noteText: string;
  createdAt: any;
}

export default function NotesScreen() {
  const { isDarkTheme, toggleTheme } = useContext(ThemeContext);
  const theme = useTheme();
  const router = useRouter();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [noteText, setNoteText] = useState<string>('');

  const { width, height } = Dimensions.get('window');

  const mappedCountries: Country[] = useMemo(() => {
    return countriesData.countries.map((country) => ({
      ...country,
      cca2: country.id,
      flag: `https://flagcdn.com/w40/${country.id.toLowerCase()}.png`,
      name: country.name || 'Unknown',      // Dodane
      class: country.class || 'Unknown',    // Dodane
      path: country.path || 'Unknown',      // Dodane
    }));
  }, []);

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const currentUser = auth.currentUser;
        if (currentUser) {
          const notesCollectionRef = collection(db, 'users', currentUser.uid, 'notes');
          const notesSnapshot = await getDocs(notesCollectionRef);
          const notesList: Note[] = notesSnapshot.docs.map(doc => ({
            id: doc.id,
            countryCca2: doc.data().countryCca2,
            noteText: doc.data().noteText,
            createdAt: doc.data().createdAt,
          }));
          setNotes(notesList);
        } else {
          console.log('No current user.');
        }
      } catch (error) {
        console.error('Error fetching notes:', error);
        Alert.alert('Error', 'Unable to fetch notes. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchNotes();
  }, []);

  const handleAddNote = async () => {
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
        const newNote = {
          countryCca2: selectedCountry,
          noteText: noteText.trim(),
          createdAt: new Date(),
        };
        const docRef = await addDoc(notesCollectionRef, newNote);
        setNotes([...notes, { id: docRef.id, ...newNote }]);
        setSelectedCountry('');
        setNoteText('');
        Alert.alert('Success', 'Note added successfully.');
      }
    } catch (error) {
      console.error('Error adding note:', error);
      Alert.alert('Error', 'Unable to add note. Please try again.');
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        const noteDocRef = doc(db, 'users', currentUser.uid, 'notes', noteId);
        await updateDoc(noteDocRef, { deleted: true }); // Opcjonalnie, możesz usunąć dokument
        setNotes(notes.filter(note => note.id !== noteId));
        Alert.alert('Success', 'Note deleted successfully.');
      }
    } catch (error) {
      console.error('Error deleting note:', error);
      Alert.alert('Error', 'Unable to delete note. Please try again.');
    }
  };

  const renderNoteItem = ({ item }: { item: Note }) => {
    const country = mappedCountries.find(c => c.cca2 === item.countryCca2);
    return (
      <View style={[styles.noteItem, { backgroundColor: theme.colors.surface }]}>
        {country && (
          <CountryFlag isoCode={country.cca2} size={25} style={styles.noteFlag} />
        )}
        <View style={styles.noteTextContainer}>
          <Text style={[styles.noteCountryName, { color: theme.colors.onBackground }]}>
            {country ? country.name : 'Unknown Country'}
          </Text>
          <Text style={[styles.noteText, { color: theme.colors.onBackground }]}>
            {item.noteText}
          </Text>
        </View>
        <TouchableOpacity onPress={() => handleDeleteNote(item.id)}>
          <Ionicons name="trash" size={24} color="red" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Nagłówek z przyciskiem powrotu i przełącznikiem motywu */}
      <View style={[styles.header, { paddingTop: height * 0.03 }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.headerButton, { marginLeft: -17 }]}>
          <Ionicons name="arrow-back" size={28} color={theme.colors.onBackground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.onBackground }]}>Notes</Text>
        <TouchableOpacity onPress={toggleTheme} style={[styles.headerButton, { marginRight: -17 }]}>
          <Ionicons name={isDarkTheme ? "sunny" : "moon"} size={28} color={theme.colors.onBackground} />
        </TouchableOpacity>
      </View>

      {/* Formularz Dodawania Notatki */}
      <View style={[styles.formContainer, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.formLabel, { color: theme.colors.onSurface }]}>Select Country:</Text>
        <FlatList
          data={mappedCountries}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.cca2}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.countryItem,
                {
                  borderColor: selectedCountry === item.cca2 ? '#6200ee' : 'transparent',
                  backgroundColor: selectedCountry === item.cca2 ? '#e0d7ff' : theme.colors.surface,
                },
              ]}
              onPress={() => setSelectedCountry(item.cca2)}
            >
              <CountryFlag isoCode={item.cca2} size={25} style={styles.countryFlag} />
              <Text style={{ color: theme.colors.onBackground, marginLeft: 5 }}>{item.name}</Text>
            </TouchableOpacity>
          )}
        />

        <Text style={[styles.formLabel, { color: theme.colors.onSurface }]}>Note:</Text>
        <TextInput
          style={[styles.textInput, { color: theme.colors.onBackground, borderColor: theme.colors.onBackground }]}
          placeholder="Enter your note"
          placeholderTextColor="gray"
          value={noteText}
          onChangeText={setNoteText}
          multiline
        />

        <TouchableOpacity style={[styles.addButton, { backgroundColor: '#6200ee' }]} onPress={handleAddNote}>
          <Text style={styles.addButtonText}>Add Note</Text>
        </TouchableOpacity>
      </View>

      {/* Lista Notatek */}
      {loading ? (
        <ActivityIndicator size="large" color="#6200ee" />
      ) : notes.length > 0 ? (
        <FlatList
          data={notes}
          keyExtractor={(item) => item.id}
          renderItem={renderNoteItem}
          contentContainerStyle={styles.notesList}
        />
      ) : (
        <View style={styles.noNotesContainer}>
          <Text style={[styles.noNotesText, { color: theme.colors.onBackground }]}>
            You haven't created any notes yet.
          </Text>
        </View>
      )}
    </View>
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
  formContainer: {
    padding: 16,
    borderRadius: 10,
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderWidth: 2,
    borderRadius: 20,
    marginRight: 10,
  },
  countryFlag: {
    // Optional: style for the flag
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
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
    fontSize: 14,
    marginTop: 2,
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
