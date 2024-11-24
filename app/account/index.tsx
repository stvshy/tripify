// AccountScreen.tsx
import React, { useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Dimensions,
  Animated,
  LayoutChangeEvent,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ThemeContext } from '../config/ThemeContext';
import { useTheme } from 'react-native-paper';
import { DraxProvider, DraxView } from 'react-native-drax';
import { getDoc, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../config/firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { ListItem, TItem } from '../../components/ListItem';
import countriesData from '../../assets/maps/countries.json'; // Upewnij się, że ścieżka jest poprawna
import CountryFlag from 'react-native-country-flag';
import { Country, CountriesData } from '../../.expo/types/country'; // Import typów

interface RankingSlot {
  id: string; // Unikalny identyfikator slotu
  rank: number;
  country: Country | null;
}

export default function AccountScreen() {
  const { isDarkTheme, toggleTheme } = useContext(ThemeContext);
  const theme = useTheme();
  const router = useRouter();

  const [countriesVisited, setCountriesVisited] = useState<Country[]>([]);
  const [rankingSlots, setRankingSlots] = useState<RankingSlot[]>([]);
  const [draggedItem, setDraggedItem] = useState<TItem | null>(null);
  const [isDraggingRankedCountry, setIsDraggingRankedCountry] = useState(false);
  const [dragSourceRank, setDragSourceRank] = useState<number | null>(null);
  const [isDraggingOutside, setIsDraggingOutside] = useState(false);
  const [rankingStartY, setRankingStartY] = useState<number | null>(null);
  const [rankingEndY, setRankingEndY] = useState<number | null>(null);
  // Mapowanie danych krajów, aby upewnić się, że spełniają interfejs Country
  const mappedCountries: Country[] = useMemo(() => {
    return countriesData.countries.map((country) => ({
      ...country,
      cca2: country.id, // Użycie pola `id` jako `cca2`
      flag: `https://flagcdn.com/w40/${country.id.toLowerCase()}.png`, // Generowanie URL flagi
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
          const visitedCountries: Country[] = mappedCountries.filter((country: Country) =>
            visitedCountryCodes.includes(country.cca2)
          );
          setCountriesVisited(visitedCountries);

          const rankingData: string[] = userData.ranking || [];
          const initialSlots: RankingSlot[] = rankingData.slice(0, 3).map((cca2, index) => {
            const country = mappedCountries.find((c: Country) => c.cca2 === cca2) || null;
            return {
              id: `rank-${index + 1}`,
              rank: index + 1,
              country: country,
            };
          });
          // Dodanie pustych slotów, jeśli jest mniej niż 3
          for (let i = rankingData.length; i < 3; i++) {
            initialSlots.push({
              id: `rank-${i + 1}`,
              rank: i + 1,
              country: null,
            });
          }
          setRankingSlots(initialSlots);
        }
      }
    };

    fetchUserData();
  }, [mappedCountries]);

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

  const addRankingSlot = () => {
    const newRank = rankingSlots.length + 1;
    const newSlot = { id: `rank-${newRank}`, rank: newRank, country: null };
    setRankingSlots((prev) => [...prev, newSlot]);
  };
  
  
  
  const handleDrop = (slotId: string, draggedItem: TItem) => {
    if (!draggedItem) return;
  
    const draggedCountry = mappedCountries.find(
      (country) => country.name === draggedItem.title
    );
  
    if (!draggedCountry) {
      handleDropOutside();
      return;
    }
  
    const slotIndex = rankingSlots.findIndex((slot) => slot.id === slotId);
    if (slotIndex === -1) {
      handleDropOutside();
      return;
    }
  
    if (isDraggingRankedCountry && dragSourceRank !== null) {
      // Zamiana miejsc w rankingu
      const updatedSlots = [...rankingSlots];
      const sourceSlot = updatedSlots[dragSourceRank - 1];
      const targetSlot = updatedSlots[slotIndex];
  
      // Zamień miejsca tylko jeśli różne
      if (sourceSlot !== targetSlot) {
        const tempCountry = sourceSlot.country;
        sourceSlot.country = targetSlot.country;
        targetSlot.country = tempCountry;
  
        setRankingSlots(updatedSlots);
        handleSaveRanking(updatedSlots);
      }
      resetDragState();
      return;
    }
  
    // Dodanie nowego kraju do rankingu
    const alreadyRanked = rankingSlots.some(
      (slot) => slot.country?.id === draggedCountry.id
    );
  
    if (alreadyRanked) {
      Alert.alert('Already Ranked', 'This country is already in your ranking.');
      resetDragState();
      return;
    }
  
    if (!rankingSlots[slotIndex].country) {
      const updatedSlots = rankingSlots.map((slot) => {
        if (slot.id === slotId) {
          return { ...slot, country: draggedCountry };
        }
        return slot;
      });
  
      setRankingSlots(updatedSlots);
      handleSaveRanking(updatedSlots);
  
      // Usuń kraj z listy odwiedzonych
      setCountriesVisited((prev) =>
        prev.filter((country) => country.id !== draggedCountry.id)
      );
      resetDragState();
    } else {
      Alert.alert('Slot Occupied', 'This ranking slot is already occupied.');
      resetDragState();
    }
  };
  
  
  

  const handleDropOutside = () => {
    if (isDraggingRankedCountry && dragSourceRank !== null) {
      // Przywróć kraj do pierwotnego slotu rankingu
      const updatedSlots = rankingSlots.map((slot) =>
        slot.rank === dragSourceRank ? { ...slot, country: null } : slot
      );
      setRankingSlots(updatedSlots);
      resetDragState();
    } else if (draggedItem) {
      // Przywróć kraj do listy odwiedzonych
      const countryToReturn = mappedCountries.find(
        (country) => country.name === draggedItem.title
      );
      if (countryToReturn) {
        setCountriesVisited((prev) => [...prev, countryToReturn]);
      }
      resetDragState();
    }
  };
  
  

  const resetDragState = () => {
    setDraggedItem(null);
    setIsDraggingRankedCountry(false);
    setDragSourceRank(null);
    setIsDraggingOutside(false);
  };

  const handleDragStart = (item: TItem, rankNumber?: number) => {
    setDraggedItem(item);
    if (rankNumber) {
      setIsDraggingRankedCountry(true);
      setDragSourceRank(rankNumber);
    } else {
      setIsDraggingRankedCountry(false);
      setDragSourceRank(null);
    }
  };

  const handleDragEnd = () => {
    if (isDraggingOutside) {
      handleDropOutside();
    } else if (draggedItem) {
      // Przywróć element na pierwotne miejsce
      if (isDraggingRankedCountry && dragSourceRank !== null) {
        // Kraj był przeciągany w rankingu, nic nie rób
      } else {
        // Kraj był przeciągany z listy odwiedzonych
        resetDragState();
      }
    }
  };
  
  
  const removeRankingSlot = (id: string) => {
    const slotToRemove = rankingSlots.find((slot) => slot.id === id);
    if (slotToRemove && slotToRemove.country) {
      const updatedSlots = rankingSlots.map(slot => {
        if (slot.id === id) {
          setCountriesVisited(prev => [...prev, slotToRemove.country!]);
          return { ...slot, country: null };
        }
        return slot;
      });
      
      setRankingSlots(updatedSlots);
      handleSaveRanking(updatedSlots);
    }
  };

  const handleRankingLayout = (event: LayoutChangeEvent) => {
    const { y, height } = event.nativeEvent.layout;
    setRankingStartY(y);
    setRankingEndY(y + height);
  };
  
  const renderRankingSlot = (slot: RankingSlot) => {
    const item: TItem | null = slot.country
      ? {
          id: `ranked-${slot.country.id}`,
          title: slot.country.name,
          singer: '',
          imageSrc: slot.country.cca2,
        }
      : null;

    return (
      <DraxView
        key={slot.id}
        draggable={!!slot.country}
        dragPayload={item}
        onDragStart={() => item && handleDragStart(item, slot.rank)}
        style={[
          styles.rankingSlot,
          {
            backgroundColor: slot.country ? theme.colors.primary : theme.colors.surface,
          },
        ]}
        receivingStyle={{
          borderColor: theme.colors.secondary,
          borderWidth: 2,
        }}
        renderContent={() => (
          <View style={styles.slotContent}>
            <Text style={[styles.rankNumber, { color: theme.colors.onSurface }]}>
              {slot.rank}.
            </Text>
            {slot.country ? (
              <View style={styles.countryContainer}>
                <CountryFlag isoCode={slot.country.cca2} size={25} style={styles.flag} />
                <Text style={{ color: theme.colors.onSurface, marginLeft: 10 }}>
                  {slot.country.name}
                </Text>
                <TouchableOpacity
                  onPress={() => removeRankingSlot(slot.id)}
                  style={styles.removeButton}
                >
                  <Ionicons name="close-circle" size={20} color="red" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.dragHandle}
                  onLongPress={() => item && handleDragStart(item, slot.rank)}
                >
                  <Ionicons name="reorder-three" size={24} color={theme.colors.onSurface} />
                </TouchableOpacity>


              </View>
            ) : (
              <Text style={{ color: theme.colors.onSurface, fontStyle: 'italic' }}>
                Drop Here
              </Text>
            )}
          </View>
        )}
        onReceiveDragDrop={(event) => {
          const draggedItem = event.dragged.payload as TItem;
          handleDrop(slot.id, draggedItem);
          resetDragState(); // Resetuj przeciąganie po każdym upuszczeniu
        }}        
        onDragEnd={handleDragEnd}
      />
    );
  };

  const renderVisitedCountry = (country: Country, index: number) => {
    const item: TItem = {
      id: `${country.id}-${index}`,
      title: country.name,
      singer: '',
      imageSrc: country.cca2,
    };
  
    return (
      <ListItem
        key={`${country.id}-${index}`}
        item={item}
        onDrag={(item) => handleDragStart(item)} // Obsługa przeciągania
        onLongPress={(item) => handleDragStart(item)} // Obsługa przytrzymania
        isRanking={false}
      />
    );
  };
  
  
  return (
    <DraxProvider>
      <View 
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderMove={(event) => {
          if (rankingStartY !== null && rankingEndY !== null) {
            const { pageY } = event.nativeEvent;
            if (pageY < rankingStartY || pageY > rankingEndY) {
              setIsDraggingOutside(true);
            } else {
              setIsDraggingOutside(false);
            }
          }
        }}
      >

        <View style={styles.visitedContainer}>
          <Text style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
            Visited Countries
          </Text>
          <DraxView
            style={styles.visitedList}
            receivingStyle={{
              borderColor: theme.colors.secondary,
              borderWidth: 2,
            }}
            onReceiveDragDrop={() => {
              // Only handle drops if we're dragging a ranked country
              if (isDraggingRankedCountry && dragSourceRank !== null && draggedItem) {
                const countryToRemove = rankingSlots[dragSourceRank - 1].country;
                if (countryToRemove) {
                  // Remove country from ranking
                  const updatedSlots = rankingSlots.map(slot => {
                    if (slot.rank === dragSourceRank) {
                      return { ...slot, country: null };
                    }
                    return slot;
                  });
                  setRankingSlots(updatedSlots);
                  handleSaveRanking(updatedSlots);
                  
                  // Add country back to visited list if not already there
                  const isAlreadyInVisited = countriesVisited.some(
                    (c) => c.id === countryToRemove.id
                  );
                  if (!isAlreadyInVisited) {
                    setCountriesVisited(prev => [...prev, countryToRemove]);
                  }
                }
                setDraggedItem(null);
                setIsDraggingRankedCountry(false);
                setDragSourceRank(null);
              }
            }}
          >
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {countriesVisited.map((country, index) => renderVisitedCountry(country, index))}
            </ScrollView>
          </DraxView>
        </View>

        <View style={styles.rankingContainer} onLayout={handleRankingLayout}>
          <Text style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
            Ranking
          </Text>
          <View style={styles.rankingList}>
            {rankingSlots.map((slot) => renderRankingSlot(slot))}
          </View>
          <TouchableOpacity style={styles.addButton} onPress={addRankingSlot}>
            <Text style={styles.addButtonText}>Add More Slots</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={handleGoBack}
          style={[styles.button, { backgroundColor: theme.colors.primary }]}
        >
          <Text style={[styles.buttonText, { color: theme.colors.onPrimary }]}>
            Go Back
          </Text>
        </TouchableOpacity>
      </View>
    </DraxProvider>
  );
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 50,
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
    textAlign: 'center',
    fontWeight: 'bold',
  },

  visitedContainer: {
    marginBottom: 30,
  },
  dragHandle: {
    padding: 8,
    marginLeft: 'auto',
  },
  sectionTitle: {
    fontSize: 20,
    marginBottom: 10,
    fontWeight: '600',
  },
  visitedList: {
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 12,
    padding: 10,
    backgroundColor: '#f9f9f9',
    flexDirection: 'row',
    alignItems: 'center',
  },
  rankingContainer: {
    marginBottom: 30,
  },
  rankingList: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  rankingSlot: {
    padding: 15,
    marginBottom: 15,
    borderRadius: 12,
    borderWidth: 1,
    height: 70,
    justifyContent: 'center',
    backgroundColor: '#fff',
    elevation: 3, // For Android shadow
    shadowColor: '#000', // For iOS shadow
    shadowOffset: { width: 0, height: 2 }, // For iOS shadow
    shadowOpacity: 0.2, // For iOS shadow
    shadowRadius: 4, // For iOS shadow
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
    width: 25,
    height: 18,
    borderRadius: 3,
  },
  removeButton: {
    marginLeft: 10,
  },
  addButton: {
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#4CAF50',
    borderRadius: 6,
    alignSelf: 'flex-start',
    elevation: 2, // For Android shadow
    shadowColor: '#000', // For iOS shadow
    shadowOffset: { width: 0, height: 2 }, // For iOS shadow
    shadowOpacity: 0.2, // For iOS shadow
    shadowRadius: 4, // For iOS shadow
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 8,
    alignSelf: 'center',
    marginTop: 20,
    elevation: 3, // For Android shadow
    shadowColor: '#000', // For iOS shadow
    shadowOffset: { width: 0, height: 3 }, // For iOS shadow
    shadowOpacity: 0.3, // For iOS shadow
    shadowRadius: 4, // For iOS shadow
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
  },
});
