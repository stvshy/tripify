// AccountScreen.tsx
import React, { useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  Animated,
  ScrollView,
  TouchableWithoutFeedback,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ThemeContext } from '../config/ThemeContext';
import { useTheme } from 'react-native-paper';
import { getDoc, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../config/firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import countriesData from '../../assets/maps/countries.json';
import CountryFlag from 'react-native-country-flag';
import { Country } from '../../.expo/types/country';
import DraggableFlatList, { RenderItemParams, DragEndParams } from 'react-native-draggable-flatlist';

interface RankingSlot {
  id: string;
  rank: number;
  country: Country | null;
}

const removeDuplicates = (countries: Country[]): Country[] => {
  const unique = new Map<string, Country>();
  countries.forEach(c => {
    unique.set(c.id, c); // Użyj `c.id` jako klucza, zakładając, że jest unikalne
  });
  return Array.from(unique.values());
};

// Funkcja generująca unikalne id
const generateUniqueId = () => `rank-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export default function AccountScreen() {
  const { isDarkTheme, toggleTheme } = useContext(ThemeContext);
  const theme = useTheme();
  const router = useRouter();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const SCALE_ACTIVE = 1.06;
  const SCALE_DURATION = 200;
  const [countriesVisited, setCountriesVisited] = useState<Country[]>([]);
  const [rankingSlots, setRankingSlots] = useState<RankingSlot[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [activeRankingItemId, setActiveRankingItemId] = useState<string | null>(null); // Nowy stan

  const { width, height } = Dimensions.get('window');

  const mappedCountries: Country[] = useMemo(() => {
    return countriesData.countries.map((country) => ({
      ...country,
      cca2: country.id,
      flag: `https://flagcdn.com/w40/${country.id.toLowerCase()}.png`,
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
          const visitedCountryCodes: string[] = userData.countriesVisited || [];
          const rankingData: string[] = userData.ranking || [];

          // Filtruj visited countries, aby wykluczyć te już w rankingu
          const visitedCountries: Country[] = mappedCountries.filter(
            (country: Country) =>
              visitedCountryCodes.includes(country.cca2) &&
              !rankingData.includes(country.cca2)
          );

          // Usuń duplikaty
          const uniqueVisitedCountries = removeDuplicates(visitedCountries);
          setCountriesVisited(uniqueVisitedCountries);

          // Utwórz initialSlots z unikalnym id
          const initialSlots: RankingSlot[] = rankingData.map((cca2, index) => {
            const country = mappedCountries.find((c: Country) => c.cca2 === cca2) || null;
            return {
              id: generateUniqueId(), // Użyj unikalnego id
              rank: index + 1,
              country: country,
            };
          });

          setRankingSlots(initialSlots);
        }
      }
    };

    fetchUserData();
  }, [mappedCountries]);

  useEffect(() => {
    console.log('countriesVisited:', countriesVisited.map(c => c.id));
    console.log('rankingSlots:', rankingSlots.map(slot => slot.id));
  }, [countriesVisited, rankingSlots]);

  const handleGoBack = () => {
    router.back();
  };

  const handleSaveRanking = async (newRankingSlots: RankingSlot[]) => {
    const ranking = newRankingSlots
      .filter((slot) => slot.country !== null)
      .map((slot) => slot.country!.cca2);
    const currentUser = auth.currentUser;
    if (currentUser) {
      const userDocRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userDocRef, { ranking: ranking });
    }
  };

  const handleDragEnd = ({ data }: DragEndParams<RankingSlot>) => {
    const updatedSlots = data.map((item, index) => ({
      ...item,
      rank: index + 1,
    }));
    setRankingSlots(updatedSlots);
    handleSaveRanking(updatedSlots);
    setActiveRankingItemId(null); // Resetowanie aktywnego elementu po przeciąganiu
  };

  const handleRemoveFromRanking = (index: number) => {
    const slot = rankingSlots[index];
    if (slot.country) {
      setCountriesVisited(prev => {
        // Sprawdź, czy kraj już istnieje w `countriesVisited`
        if (!prev.some(c => c.id === slot.country!.id)) {
          return [...prev, slot.country!];
        }
        return prev;
      });
      const updatedSlots = [...rankingSlots];
      updatedSlots.splice(index, 1); // Usunięcie slotu
      // Zaktualizuj rangi
      const reRankedSlots = updatedSlots.map((item, idx) => ({ ...item, rank: idx + 1 }));
      setRankingSlots(reRankedSlots);
      handleSaveRanking(reRankedSlots);
      setActiveRankingItemId(null); // Resetowanie aktywnego elementu
    }
  };

  const renderRankingItem = ({ item, getIndex, drag, isActive }: RenderItemParams<RankingSlot>) => {
    const index = getIndex(); // Pobranie indeksu za pomocą getIndex()

    return (
      <TouchableOpacity
        style={[
          styles.rankingSlot,
          {
            backgroundColor: activeRankingItemId === item.id
              ? theme.colors.primary
              : theme.colors.surface,
          },
        ]}
        onLongPress={() => setActiveRankingItemId(item.id)}
        delayLongPress={300} // Opcjonalnie: dostosowanie czasu przytrzymania
        disabled={!item.country}
        activeOpacity={0.8}
      >
        <View style={styles.slotContent}>
          <Text style={[styles.rankNumber, { color: theme.colors.onSurface }]}>
            {item.rank}.
          </Text>
          {item.country ? (
            <View style={styles.countryInfoContainer}>
              <CountryFlag isoCode={item.country.cca2} size={16} style={styles.flag} />
              <Text style={{ color: theme.colors.onSurface, marginLeft: 6, fontSize: 10 }}>
                {item.country.name}
              </Text>
            </View>
          ) : (
            <Text style={{ color: theme.colors.onSurface, fontStyle: 'italic', fontSize: 10 }}>
              Drop Here
            </Text>
          )}
        </View>
        <View style={styles.actionContainer}>
          {activeRankingItemId === item.id && (
            <TouchableOpacity
              onPress={() => index !== undefined ? handleRemoveFromRanking(index) : null}
              style={styles.removeButton}
            >
              <Ionicons name="close-circle" size={16} color="red" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.dragHandle}
            onPressIn={() => {
              setActiveRankingItemId(null); // Resetowanie aktywnego elementu podczas przeciągania
              drag();
            }}
          >
            <Ionicons name="reorder-three" size={16} color={theme.colors.onSurface} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const handleAddToRanking = (country: Country) => {
    // Opcjonalnie: Zapobiegaj dodawaniu tego samego kraju więcej niż raz
    if (rankingSlots.some(slot => slot.country?.cca2 === country.cca2)) {
      Alert.alert('Duplicate Entry', `${country.name} is already in the ranking.`);
      return;
    }

    const newSlot: RankingSlot = {
      id: generateUniqueId(), // Użyj unikalnego id
      rank: rankingSlots.length + 1,
      country: country,
    };

    const updatedSlots = [...rankingSlots, newSlot];
    setRankingSlots(updatedSlots);
    handleSaveRanking(updatedSlots);
    // Usuń kraj z listy "Visited Countries" i upewnij się, że nie ma duplikatów
    setCountriesVisited(prev => removeDuplicates(prev.filter(c => c.id !== country.id)));
    setActiveRankingItemId(null); // Resetowanie aktywnego elementu po dodaniu
  };

  return (
    <TouchableWithoutFeedback onPress={() => setActiveRankingItemId(null)}>
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        {/* Visited Countries */}
        <View style={styles.visitedContainer}>
          <Text style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
            Visited Countries
          </Text>
          <ScrollView contentContainerStyle={styles.visitedScrollContainer}>
            {countriesVisited.map((country) => (
              <View key={`visited-${country.id}`} style={styles.visitedItemContainer}>
                <CountryFlag isoCode={country.cca2} size={16} style={styles.flag} />
                <Text style={[styles.visitedItemText, { color: theme.colors.onSurface, marginLeft: 6 }]}>
                  {country.name}
                </Text>
                <TouchableOpacity
                  onPress={() => handleAddToRanking(country)}
                  style={styles.addButtonIcon}
                >
                  <Ionicons name="add-circle" size={20} color="green" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Ranking */}
        <View style={styles.rankingContainer}>
          <Text style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
            Ranking
          </Text>
          <DraggableFlatList
            data={rankingSlots}
            keyExtractor={(item) => item.id} // Użyj unikalnego id
            renderItem={renderRankingItem}
            onDragEnd={handleDragEnd}
            activationDistance={20}
            scrollEnabled={true}
            showsVerticalScrollIndicator={true} // Zawsze widoczny pasek przewijania
          />
        </View>

        {/* Go Back Button */}
        <TouchableOpacity
          onPress={handleGoBack}
          style={[styles.button, { backgroundColor: theme.colors.primary }]}
        >
          <Text style={[styles.buttonText, { color: theme.colors.onPrimary }]}>
            Go Back
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 50,
    flex: 1, // Zajmuje całą przestrzeń
  },
  sectionTitle: {
    fontSize: 18, // Zmniejszenie rozmiaru fontu
    marginBottom: 8, // Zmniejszenie marginesu
    fontWeight: '600',
  },
  visitedContainer: {
    marginBottom: 20, // Zmniejszenie marginesu
  },
  visitedScrollContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
  },
  visitedItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 8, // Zmniejszenie poziomego paddingu
    paddingVertical: 6, // Zmniejszenie pionowego paddingu
    margin: 4, // Zmniejszenie marginesu
    borderRadius: 6, // Zmniejszenie promienia
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  visitedItemText: {
    fontSize: 10, // Zmniejszenie rozmiaru fontu
    fontWeight: '600',
  },
  addButtonIcon: {
    marginLeft: 8, // Zmniejszenie marginesu
  },
  rankingContainer: {
    marginBottom: 20, // Zmniejszenie marginesu
    flex: 1, // Pozwól na rozciąganie
  },
  rankingSlot: {
    flexDirection: 'row', // Ustawienie elementów w wierszu
    alignItems: 'center',
    paddingVertical: 6, // Zmniejszenie pionowego paddingu
    paddingHorizontal: 10, // Zmniejszenie poziomego paddingu
    marginBottom: 8, // Zmniejszenie marginesu dolnego
    borderRadius: 10, // Zmniejszenie promienia
    borderWidth: 1,
    justifyContent: 'space-between', // Rozłożenie przestrzeni między elementami
    backgroundColor: '#fff',
    elevation: 2, // Zmniejszenie wysokości cienia
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    maxWidth: '100%', // Opcjonalnie: Ustawienie maksymalnej szerokości
  },
  slotContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1, // Pozwól na rozciąganie
  },
  rankNumber: {
    fontSize: 14, // Zmniejszenie rozmiaru fontu
    marginRight: 8, // Zmniejszenie marginesu
    fontWeight: 'bold',
  },
  countryInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  flag: {
    width: 16, // Zmniejszenie rozmiaru flagi
    height: 12,
    borderRadius: 2,
  },
  actionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  removeButton: {
    marginRight: 4, // Zmniejszenie marginesu po prawej stronie
  },
  dragHandle: {
    padding: 4, // Zmniejszenie paddingu
    marginLeft: 4, // Zmniejszenie marginesu
  },
  addButton: {
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignSelf: 'center',
    elevation: 2,
  },
  addButtonText: {
    fontSize: 14, // Zmniejszenie rozmiaru fontu
    fontWeight: '600',
  },
  button: {
    paddingVertical: 12, // Zmniejszenie pionowego paddingu
    paddingHorizontal: 24, // Zmniejszenie poziomego paddingu
    borderRadius: 6, // Zmniejszenie promienia
    alignSelf: 'center',
    marginTop: 16, // Zmniejszenie marginesu
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  buttonText: {
    fontSize: 16, // Zmniejszenie rozmiaru fontu
    fontWeight: '600',
  },
  description1: { // Dodana właściwość
    fontSize: 10, // Zmniejszenie rozmiaru fontu
    fontWeight: '600',
    color: '#000',
  },
});
