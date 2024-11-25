// app/account/index.tsx
import React, { useContext, useEffect, useState, useMemo } from 'react';
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
import RankingItem from '../../components/RankItem'; // Upewnij się, że ścieżka jest poprawna

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
    const fetchUserData = async () => {
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

          // Utwórz initialSlots z unikalnym id
          const initialSlots: RankingSlot[] = rankingData.map((cca2, index) => {
            const country = mappedCountries.find((c: Country) => c.cca2 === cca2) || null;
            return {
              id: generateUniqueId(),
              rank: index + 1,
              country: country,
            };
          });

          setRankingSlots(initialSlots);
          
            // Pobierz notatki użytkownika
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
          console.log('User document does not exist.');
        }
      } else {
        console.log('No current user.');
      }
    };

    fetchUserData();
  }, [mappedCountries]);

  useEffect(() => {
    console.log('rankingSlots:', rankingSlots.map(slot => slot.id));
    console.log('notes:', notes);
  }, [rankingSlots, notes]);

  const handleGoBack = () => {
    router.back();
  };

  const handleRemoveFromRanking = (index: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (index >= 0 && index < rankingSlots.length) { // Sprawdzenie indeksu
      const updatedSlots = [...rankingSlots];
      updatedSlots.splice(index, 1); // Usunięcie slotu
      // Zaktualizuj rangi
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
    router.push('/notes'); // Upewnij się, że masz zdefiniowaną trasę '/notes'
  };

  return (
    <TouchableWithoutFeedback onPress={() => setActiveRankingItemId(null)}>
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Nagłówek z przyciskiem powrotu i przełącznikiem motywu */}
        <View style={[styles.header, { paddingTop: height * 0.03 }]}>
          <TouchableOpacity onPress={handleGoBack} style={[styles.headerButton, { marginLeft: -17 }]}>
            <Ionicons name="arrow-back" size={28} color={theme.colors.onBackground} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.onBackground }]}>Account</Text>
          <TouchableOpacity onPress={toggleTheme} style={[styles.headerButton, { marginRight: -17 }]}>
            <Ionicons name={isDarkTheme ? "sunny" : "moon"} size={28} color={theme.colors.onBackground} />
          </TouchableOpacity>
        </View>

        {/* Panel Użytkownika */}
        <View style={styles.userPanel}>
          <Ionicons name="person-circle" size={100} color={theme.colors.primary} />
          <Text style={[styles.userName, { color: theme.colors.onBackground }]}>{userName}</Text>
          <Text style={[styles.userEmail, { color: 'gray' }]}>{userEmail}</Text>
        </View>

        {/* Ranking Window */}
        <View style={[styles.rankingWindow, { backgroundColor: isDarkTheme ? '#333333' : '#f5f5f5' }]}>
          <Text style={[styles.rankingTitle, { color: theme.colors.onSurface }]}>Ranking</Text>
            <TouchableOpacity
            style={styles.editButton}
            onPress={() => router.push('/ranking')} // Używamy '/ranking' zgodnie z Twoim wymaganiem
            >
            <Text style={[styles.editButtonText, { color: theme.colors.primary }]}>
              {rankingSlots.length > 0 ? 'Show and Edit Ranking' : 'Create Ranking'}
            </Text>
            <Ionicons name="chevron-forward" size={15} color={theme.colors.primary} style={{ marginRight: -11 }} />
            </TouchableOpacity>
        </View>

        {/* Poziomo Przewijalna Lista Rankingu */}
        {rankingSlots.length > 0 ? (
            <View style={[styles.horizontalRankingContainer, { backgroundColor: isDarkTheme ? '#333333' : '#f5f5f5' }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {rankingSlots.map((slot, index) => (
              <RankingItem
                key={slot.id}
                slot={slot}
                index={index}
                onRemove={handleRemoveFromRanking}
                activeRankingItemId={activeRankingItemId}
                setActiveRankingItemId={setActiveRankingItemId}
                
              />
              ))}
            </ScrollView>
            </View>
        ) : (
          <View style={[styles.noRankingContainer, { backgroundColor: isDarkTheme ? '#333333' : '#f5f5f5' }]}>
            <Text style={[styles.noRankingText, { color: theme.colors.onBackground }]}>
              You haven't created a ranking yet.
            </Text>
          </View>
        )}


        {/* Kontener z Notatkami */}
        <View style={[styles.notesContainer, { backgroundColor: isDarkTheme ? '#333333' : '#f5f5f5' }]}>
          <Text style={[styles.notesTitle, { color: theme.colors.onSurface }]}>Notes</Text>
          <TouchableOpacity
            style={styles.editButton}
            onPress={handleNavigateToNotes} // Nawigacja do '/notes'
          >
         <Text style={[styles.editButtonText, { color: theme.colors.primary }]}>
              {notes.length > 0 ? 'View and Create Notes' : 'Create Note'}
            </Text>
            <Ionicons name="chevron-forward" size={15} color={theme.colors.primary} style={{ marginRight: -11 }} />
          </TouchableOpacity>
        </View>

        {/* Lista Notatek */}
        {notes.length > 0 ? (
         <View style={[styles.notesListContainer, { backgroundColor: isDarkTheme ? '#333333' : '#f5f5f5' }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {notes.map(note => {
                const country = mappedCountries.find(c => c.cca2 === note.countryCca2);
                return (
                  <View key={note.id} style={styles.noteItem}>
                    {country && (
                      <CountryFlag isoCode={country.cca2} size={25} style={styles.noteFlag} />
                    )}
                    <View style={styles.noteTextContainer}>
                      <Text style={[styles.noteCountryName, { color: theme.colors.onSurface }]}>
                        {country ? country.name : 'Unknown Country'}
                      </Text>
                      <Text style={[styles.noteText, { color: theme.colors.onSurface }]}>
                        {note.noteText}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        ) : (
          <View style={[styles.noNotesContainer, { backgroundColor: isDarkTheme ? '#333333' : '#f5f5f5' }]}>
            <Text style={[styles.noNotesText, { color: theme.colors.onBackground }]}>
              You haven't created any notes yet.
            </Text>
          </View>
        )}

      </View>
    </TouchableWithoutFeedback>
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
  userPanel: {
    alignItems: 'center',
    marginBottom: 30, // Zwiększony margines od dołu
    marginTop :10,
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
    // marginBottom: 20,
    paddingVertical: 5,
    paddingHorizontal: 15,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    // backgroundColor: 'grey', // Kolor tła, który będzie zmieniany dynamicznie
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
    // marginTop: 1,
  },
  noRankingContainer: {
    alignItems: 'center',
    // marginBottom: 20,
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
  actionButtonsContainer: {
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    backgroundColor: '#fff', // Możesz dostosować kolor tła
    borderWidth: 1,
    borderColor: '#6200ee', // Możesz dostosować kolor obramowania
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  notesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    // marginBottom: 20,
    paddingVertical: 5,
    paddingHorizontal: 15,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    // backgroundColor: 'grey', // Kolor tła, który będzie zmieniany dynamicznie
  },
  notesTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  notesListContainer: {
    marginBottom: 20,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    padding: 10,
    paddingBottom: 15,
    paddingTop: 10,
    // marginTop: 1,
  },
  noteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
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
    // marginBottom: 20,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    marginBottom: 20,
    padding: 10,
    paddingBottom: 20,
    paddingTop: 20,
  },
  noNotesText: {
    fontSize: 14,
    fontStyle: 'italic', //
  },
});
