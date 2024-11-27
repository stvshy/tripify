// app/account/index.tsx
import React, { useContext, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  ScrollView,
  LayoutAnimation,
  TouchableWithoutFeedback,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ThemeContext } from '../config/ThemeContext';
import { useTheme } from 'react-native-paper';
import { getDoc, doc, updateDoc, collection, getDocs } from 'firebase/firestore';
import { db, auth } from '../config/firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import countriesData from '../../assets/maps/countries.json';
import CountryFlag from 'react-native-country-flag';
import { Country } from '../../.expo/types/country';
import RankingItem from '../../components/RankItem'; // Ensure the path is correct
import { useFocusEffect } from '@react-navigation/native'; // Import useFocusEffect

interface RankingSlot {
  id: string;
  rank: number;
  country: Country | null;
}
interface Note {
  id: string;
  countryCca2: string;
  noteText: string;
  createdAt: any;
}
const generateUniqueId = () => `rank-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export default function AccountScreen() {
  const { isDarkTheme, toggleTheme } = useContext(ThemeContext);
  const theme = useTheme();
  const router = useRouter();
  const [rankingSlots, setRankingSlots] = useState<RankingSlot[]>([]);
  const [activeRankingItemId, setActiveRankingItemId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('Error: No nickname');
  const [userEmail, setUserEmail] = useState<string>('user@error.com');
  const [notes, setNotes] = useState<Note[]>([]);
  const { width, height } = Dimensions.get('window');
  const [isNotePreviewVisible, setIsNotePreviewVisible] = useState<boolean>(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  
  const mappedCountries: Country[] = useMemo(() => {
    return countriesData.countries.map((country) => ({
      ...country,
      cca2: country.id,
      flag: `https://flagcdn.com/w40/${country.id.toLowerCase()}.png`,
      name: country.name || 'Unknown',
      class: country.class || 'Unknown',
      path: country.path || 'Unknown',
    }));
  }, []);

  const fetchUserData = useCallback(async () => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      const userDocRef = doc(db, 'users', currentUser.uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const rankingData: string[] = userData.ranking || [];
        const nickname: string | undefined = userData.nickname;
        const email: string | null | undefined = currentUser.email;

        setUserName(nickname || 'Error: No nickname');
        setUserEmail(email || 'user@error.com');

        // Create initial ranking slots with unique IDs
        const initialSlots: RankingSlot[] = rankingData.map((cca2, index) => {
          const country = mappedCountries.find((c: Country) => c.cca2 === cca2) || null;
          return {
            id: generateUniqueId(),
            rank: index + 1,
            country: country,
          };
        });

        setRankingSlots(initialSlots);

        // Fetch user notes
        const notesCollectionRef = collection(db, 'users', currentUser.uid, 'notes');
        const notesSnapshot = await getDocs(notesCollectionRef);
        const notesList: Note[] = notesSnapshot.docs.map((doc) => ({
          id: doc.id,
          countryCca2: doc.data().countryCca2,
          noteText: doc.data().noteText,
          createdAt: doc.data().createdAt,
        }));
        setNotes(notesList);
      } else {
        console.log('User document does not exist.');
      }
    } else {
      console.log('No current user.');
    }
  }, [mappedCountries]);

  useFocusEffect(
    useCallback(() => {
      fetchUserData();
    }, [fetchUserData])
  );
  const handleGoBack = () => {
    router.back();
  };

  const handleRemoveFromRanking = (index: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (index >= 0 && index < rankingSlots.length) {
      const updatedSlots = [...rankingSlots];
      updatedSlots.splice(index, 1);
      // Update ranks
      const reRankedSlots = updatedSlots.map((item, idx) => ({ ...item, rank: idx + 1 }));
      setRankingSlots(reRankedSlots);
      handleSaveRanking(reRankedSlots);
      setActiveRankingItemId(null);
    } else {
      console.warn(`Invalid index for removal: ${index}`);
    }
  };

  const handleSaveRanking = async (newRankingSlots: RankingSlot[]) => {
    const ranking = newRankingSlots
      .filter((slot) => slot.country !== null)
      .map((slot) => slot.country!.cca2);
    const currentUser = auth.currentUser;
    if (currentUser) {
      const userDocRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userDocRef, { ranking: ranking });
      Alert.alert('Success', 'Ranking has been saved successfully.');
    }
  };

  const handleNavigateToNotes = () => {
    router.push('/notes');
  };

  const handleNotePress = (note: Note) => {
    setSelectedNote(note);
    setIsNotePreviewVisible(true);
  };
  

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 20 }}
       scrollIndicatorInsets={{ right: -3 }} >
        <TouchableWithoutFeedback onPress={() => setActiveRankingItemId(null)}>
          <View>
            {/* Header with back button and theme toggle */}
            <View style={[styles.header, { paddingTop: height * 0.03 }]}>
              <TouchableOpacity onPress={handleGoBack} style={[styles.headerButton, { marginLeft: -17 }]}>
                <Ionicons name="arrow-back" size={28} color={theme.colors.onBackground} />
              </TouchableOpacity>
              <Text style={[styles.headerTitle, { color: theme.colors.onBackground }]}>Account</Text>
              <TouchableOpacity onPress={toggleTheme} style={[styles.headerButton, { marginRight: -17 }]}>
                <Ionicons name={isDarkTheme ? 'sunny' : 'moon'} size={28} color={theme.colors.onBackground} />
              </TouchableOpacity>
            </View>

            {/* User Panel */}
            <View style={styles.userPanel}>
              <Ionicons name="person-circle" size={100} color={theme.colors.primary} />
              <Text style={[styles.userName, { color: theme.colors.onBackground }]}>{userName}</Text>
              <Text style={[styles.userEmail, { color: 'gray' }]}>{userEmail}</Text>
            </View>

            {/* Ranking Section */}
            <View style={[styles.rankingWindow, { backgroundColor: isDarkTheme ? '#333333' : '#f5f5f5' }]}>
              <Text style={[styles.rankingTitle, { color: theme.colors.onSurface }]}>Ranking</Text>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => router.push('/ranking')}
              >
                <Text style={[styles.editButtonText, { color: theme.colors.primary }]}>
                  {rankingSlots.length > 0 ? 'Show and Edit Ranking' : 'Create Ranking'}
                </Text>
                <Ionicons name="chevron-forward" size={15} color={theme.colors.primary} style={{ marginRight: -11 }} />
              </TouchableOpacity>
            </View>

            {/* Horizontal Ranking List */}
            {rankingSlots.length > 0 ? (
              <View
                style={[
                  styles.horizontalRankingContainer,
                  { backgroundColor: isDarkTheme ? '#333333' : '#f5f5f5' },
                ]}
              >
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {rankingSlots.map((slot, index) => (
                    <RankingItem
                      key={slot.id}
                      slot={slot}
                      index={index}
                      onRemove={handleRemoveFromRanking}
                      activeRankingItemId={activeRankingItemId}
                      setActiveRankingItemId={setActiveRankingItemId}
                      isDarkTheme={isDarkTheme} // Pass the theme prop
                    />
                  ))}
                </ScrollView>
              </View>
            ) : (
              <View
                style={[
                  styles.noRankingContainer,
                  { backgroundColor: isDarkTheme ? '#333333' : '#f5f5f5' },
                ]}
              >
                <Text style={[styles.noRankingText, { color: theme.colors.onBackground }]}>
                  You haven't created a ranking yet.
                </Text>
              </View>
            )}

            {/* Notes Section */}
            <View
              style={[
                styles.notesContainer,
                { backgroundColor: isDarkTheme ? '#333333' : '#f5f5f5' },
              ]}
            >
              <Text style={[styles.notesTitle, { color: theme.colors.onSurface }]}>Notes</Text>
              <TouchableOpacity
                style={styles.editButton}
                onPress={handleNavigateToNotes}
              >
                <Text style={[styles.editButtonText, { color: theme.colors.primary }]}>
                  {notes.length > 0 ? 'View and Create Notes' : 'Create Note'}
                </Text>
                <Ionicons name="chevron-forward" size={15} color={theme.colors.primary} style={{ marginRight: -11 }} />
              </TouchableOpacity>
            </View>

            {/* Horizontal Notes List */}
            {notes.length > 0 ? (
              <View
                style={[
                  styles.horizontalNotesContainer,
                  { backgroundColor: isDarkTheme ? '#333333' : '#f5f5f5' },
                ]}
              >
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {notes.map((note) => {
                    const country = mappedCountries.find((c) => c.cca2 === note.countryCca2);
                    return (
                      <TouchableOpacity
                        key={note.id}
                        style={[
                          styles.noteItem,
                          {
                            backgroundColor: isDarkTheme ? '#333333' : '#f5f5f5',
                            // backgroundColor: theme.colors.surface,
                            borderColor: isDarkTheme ? '#555' : '#ccc', // Adjust border color
                            borderWidth: 1,
                          },
                        ]}
                        onPress={() => handleNotePress(note)}
                      >
                        <View style={styles.noteHeader}>
                          {country && (
                            <CountryFlag isoCode={country.cca2} size={20} style={styles.noteFlag} />
                          )}
                          <Text
                            style={[styles.noteCountryName, { color: theme.colors.onSurface }]}
                            numberOfLines={2}
                          >
                            {country ? country.name : 'Unknown Country'}
                          </Text>
                        </View>
                        <Text
                          style={[styles.noteText, { color: theme.colors.onSurface }]}
                          numberOfLines={3}
                          ellipsizeMode="tail"
                        >
                          {note.noteText}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            ) : (
              <View
                style={[
                  styles.noNotesContainer,
                  { backgroundColor: isDarkTheme ? '#333333' : '#f5f5f5' },
                ]}
              >
                <Text style={[styles.noNotesText, { color: theme.colors.onBackground }]}>
                  You haven't created any notes yet.
                </Text>
              </View>
            )}
          </View>
        </TouchableWithoutFeedback>
      </ScrollView>
   {/* Note Preview Modal */}
        <Modal
        visible={isNotePreviewVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsNotePreviewVisible(false)}
      >
        <View style={styles.modalBackground}>
          <TouchableWithoutFeedback onPress={() => setIsNotePreviewVisible(false)}>
            <View style={styles.modalOverlay} />
          </TouchableWithoutFeedback>
          <View style={styles.modalContainer}>
            <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
              {/* Przycisk zamknięcia */}
              <TouchableOpacity
                onPress={() => setIsNotePreviewVisible(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={theme.colors.onSurface} />
              </TouchableOpacity>

              {/* Treść modala */}
              <ScrollView
                contentContainerStyle={styles.modalScrollContent}
                showsVerticalScrollIndicator={false}
              >
                <Text style={[styles.modalHeader, { color: theme.colors.onSurface }]}>
                  {selectedNote
                    ? mappedCountries.find(c => c.cca2 === selectedNote.countryCca2)?.name
                    : ''}
                </Text>
                <Text style={[styles.modalNoteText, { color: theme.colors.onSurface }]}>
                  {selectedNote ? selectedNote.noteText : ''}
                </Text>
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}



const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 50,
    flex: 1,
    justifyContent: 'flex-start',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    marginBottom: 20,
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
  userPanel: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 10,
  },
  userName: {
    marginTop: 3,
    fontSize: 20,
    fontWeight: '700',
  },
  userEmail: {
    marginTop: 4,
    fontSize: 14,
    color: 'gray',
  },
  rankingWindow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingVertical: 5,
    paddingHorizontal: 15,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  rankingTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editButtonText: {
    color: '#6200ee',
    fontSize: 14,
    marginRight: 4,
  },
  horizontalRankingContainer: {
    marginBottom: 20,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    padding: 10,
    paddingBottom: 15,
    paddingTop: 10,
  },
  noRankingContainer: {
    alignItems: 'center',
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    marginBottom: 20,
    padding: 10,
    paddingBottom: 20,
    paddingTop: 20,
  },
  noRankingText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  notesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingVertical: 5,
    paddingHorizontal: 15,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  notesTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  horizontalNotesContainer: {
    marginBottom: 20,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    padding: 10,
    paddingBottom: 15,
    paddingTop: 10,
  },
  noteItem: {
    width: 200,
    borderRadius: 10,
    padding: 16,
    marginRight: 10,
    // Remove shadows
    // Instead, use border to match ranking items
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start', // Align items to the top
    marginBottom: 8,
  },
  noteFlag: {
    marginRight: 8,
    borderRadius: 4,
    width: 25,
    height: 15,
    marginTop: 3, // Adjust to align with multi-line text
  },
  noteCountryName: {
    fontSize: 15,
    fontWeight: '600',
    flexShrink: 1,
    flexWrap: 'wrap',
    maxWidth: '90%',
  },
  noteText: {
    fontSize: 14,
  },
  noNotesContainer: {
    alignItems: 'center',
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    marginBottom: 20,
    padding: 10,
    paddingBottom: 20,
    paddingTop: 20,
  },
  noNotesText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  modalBackground: {
    flex: 1,
    position: 'relative',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    borderRadius: 10,
    padding: 20,
    paddingTop: 40, // Aby uwzględnić przycisk zamknięcia
    maxHeight: '90%', // Maksymalna wysokość modala
    width: '90%', // Szerokość modala
  },
  modalCloseButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 1,
  },
  modalHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  modalNoteText: {
    fontSize: 16,
  },
  modalScrollContent: {
    paddingBottom: 20,
  },
});
