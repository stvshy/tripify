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
    }
  };

  const renderRankingItem = ({ item, getIndex, drag, isActive }: RenderItemParams<RankingSlot>) => {
    const index = getIndex(); // Pobranie indeksu za pomocą getIndex()

    return (
      <TouchableOpacity
        style={[
          styles.rankingSlot,
          {
            backgroundColor: isActive ? theme.colors.primary : theme.colors.surface,
          },
        ]}
        onLongPress={drag}
        disabled={!item.country}
      >
        <View style={styles.slotContent}>
          <Text style={[styles.rankNumber, { color: theme.colors.onSurface }]}>
            {item.rank}.
          </Text>
          {item.country ? (
            <View style={styles.countryContainer}>
              <CountryFlag isoCode={item.country.cca2} size={20} style={styles.flag} />
              <Text style={{ color: theme.colors.onSurface, marginLeft: 10, fontSize: 12 }}>
                {item.country.name}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  if (index !== undefined) handleRemoveFromRanking(index);
                }}
                style={styles.removeButton}
              >
                <Ionicons name="close-circle" size={20} color="red" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dragHandle}
                onPressIn={drag}
              >
                <Ionicons name="reorder-three" size={20} color={theme.colors.onSurface} />
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={{ color: theme.colors.onSurface, fontStyle: 'italic', fontSize: 12 }}>
              Drop Here
            </Text>
          )}
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
  };

  return (
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
              <CountryFlag isoCode={country.cca2} size={20} style={styles.flag} />
              <Text style={[styles.visitedItemText, { color: theme.colors.onSurface, marginLeft: 10 }]}>
                {country.name}
              </Text>
              <TouchableOpacity
                onPress={() => handleAddToRanking(country)}
                style={styles.addButtonIcon}
              >
                <Ionicons name="add-circle" size={24} color="green" />
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
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 50,
    flex: 1, // Zajmuje całą przestrzeń
  },
  sectionTitle: {
    fontSize: 20,
    marginBottom: 10,
    fontWeight: '600',
  },
  visitedContainer: {
    marginBottom: 30,
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
    paddingHorizontal: 10,
    paddingVertical: 8,
    margin: 5,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  visitedItemText: {
    fontSize: 12,
    fontWeight: '600',
  },
  addButtonIcon: {
    marginLeft: 10,
  },
  rankingContainer: {
    marginBottom: 30,
    flex: 1, // Pozwól na rozciąganie
  },
  rankingSlot: {
    padding: 15,
    marginBottom: 15,
    borderRadius: 12,
    borderWidth: 1,
    // height: 70, // Usunięcie stałej wysokości
    justifyContent: 'center',
    backgroundColor: '#fff',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  slotContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rankNumber: {
    fontSize: 20,
    marginRight: 15,
    fontWeight: 'bold',
  },
  countryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  flag: {
    width: 20, // Zmniejszenie rozmiaru flagi
    height: 14,
    borderRadius: 3,
  },
  removeButton: {
    marginLeft: 10,
  },
  dragHandle: {
    padding: 8,
    marginLeft: 'auto',
  },
  addButton: {
    marginTop: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 6,
    alignSelf: 'center',
    elevation: 3,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 8,
    alignSelf: 'center',
    marginTop: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  description1: { // Dodana właściwość
    fontSize: 12,
    fontWeight: '600',
    color: '#000',
  },
});
