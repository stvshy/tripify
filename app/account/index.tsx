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
} from 'react-native';
import { useRouter } from 'expo-router';
import { ThemeContext } from '../config/ThemeContext';
import { useTheme } from 'react-native-paper';
import { DraxProvider, DraxView } from 'react-native-drax';
import { getDoc, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../config/firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { ListItem, TItem } from '../../components/ListItem';
import countriesData from '../../assets/maps/countries.json';
import CountryFlag from 'react-native-country-flag';
import { Country } from '../../.expo/types/country';

interface RankingSlot {
  id: string;
  rank: number;
  country: Country | null;
}

export default function AccountScreen() {
  const { isDarkTheme, toggleTheme } = useContext(ThemeContext);
  const theme = useTheme();
  const router = useRouter();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const SCALE_ACTIVE = 1.06;
  const SCALE_DURATION = 200;
  const [countriesVisited, setCountriesVisited] = useState<Country[]>([]);
  const [rankingSlots, setRankingSlots] = useState<RankingSlot[]>([]);
  const [draggedItem, setDraggedItem] = useState<TItem | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const { width, height } = Dimensions.get('window');

  const mappedCountries: Country[] = useMemo(() => {
    return countriesData.countries.map((country) => ({
      ...country,
      cca2: country.id,
      flag: `https://flagcdn.com/w40/${country.id.toLowerCase()}.png`,
    }));
  }, []);

  const animateScale = (active: boolean) => {
    Animated.timing(scaleAnim, {
      toValue: active ? SCALE_ACTIVE : 1,
      duration: SCALE_DURATION,
      useNativeDriver: true,
    }).start();
  };

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
          setCountriesVisited(visitedCountries);

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

  const addRankingSlot = useCallback(async () => {
    const newRank = rankingSlots.length + 1;
    const newSlot: RankingSlot = {
      id: `rank-${newRank}`,
      rank: newRank,
      country: null
    };
    
    const updatedSlots = [...rankingSlots, newSlot];
    setRankingSlots(updatedSlots);
    
    const currentUser = auth.currentUser;
    if (currentUser) {
      try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userDocRef, {
          ranking: updatedSlots.map(slot => slot.country?.cca2 || null)
        });
      } catch (error) {
        console.error('Error adding ranking slot:', error);
        Alert.alert('Error', 'Failed to add new ranking slot');
      }
    }
  }, [rankingSlots]);
  
  
  const handleDrop = (dropZone: 'Visited' | 'Ranking', draggedItem: TItem) => {
    if (!draggedItem) {
      resetDragState();
      return;
    }

    const draggedCountry = mappedCountries.find(
      (country) => country.cca2 === draggedItem.imageSrc
    );

    if (!draggedCountry) {
      handleDropOutside();
      return;
    }

    if (dropZone === 'Ranking') {
      // Check if already ranked
      const alreadyRanked = rankingSlots.some(
        (slot) => slot.country?.id === draggedCountry.id
      );

      if (alreadyRanked) {
        Alert.alert('Already Ranked', 'This country is already in your ranking.');
        resetDragState();
        return;
      }

      // Find first empty slot
      const emptySlotIndex = rankingSlots.findIndex((slot) => slot.country === null);
      if (emptySlotIndex !== -1) {
        const updatedSlots = rankingSlots.map((slot, index) => {
          if (index === emptySlotIndex) {
            return { ...slot, country: draggedCountry };
          }
          return slot;
        });

        setRankingSlots(updatedSlots);
        handleSaveRanking(updatedSlots);

        // Remove from visited
        setCountriesVisited(prev => prev.filter(country => country.id !== draggedCountry.id));
      } else {
        Alert.alert('No Empty Slot', 'There are no empty ranking slots.');
      }
    } else if (dropZone === 'Visited') {
      // Check if already in visited
      const alreadyVisited = countriesVisited.some(
        (country) => country.id === draggedCountry.id
      );

      if (!alreadyVisited) {
        setCountriesVisited(prev => [...prev, draggedCountry]);
      }

      // Remove from ranking slots
      const updatedSlots = rankingSlots.map(slot => {
        if (slot.country?.id === draggedCountry.id) {
          return { ...slot, country: null };
        }
        return slot;
      });

      setRankingSlots(updatedSlots);
      handleSaveRanking(updatedSlots);
    }

    resetDragState();
  };

  const handleDropOutside = useCallback(() => {
    console.log('Drop Outside');
    if (draggedItem) {
      const countryToAddBack = mappedCountries.find(c => c.cca2 === draggedItem.imageSrc);
      if (countryToAddBack) {
        setCountriesVisited(prev => {
          if (!prev.some(country => country.id === countryToAddBack.id)) {
            return [...prev, countryToAddBack];
          }
          return prev;
        });

        // If the item was in ranking, remove it
        const updatedSlots = rankingSlots.map(slot => {
          if (slot.country?.id === countryToAddBack.id) {
            return { ...slot, country: null };
          }
          return slot;
        });
        setRankingSlots(updatedSlots);
        handleSaveRanking(updatedSlots);
      }
    }
    resetDragState();
  }, [draggedItem, mappedCountries, rankingSlots]);

  const handleDragEnd = () => {
    resetDragState();
  };

  const resetDragState = useCallback(() => {
    console.log('Reset Drag State');
    setDraggedItem(null);
    setIsDragging(false);
    animateScale(false);
  }, []);

  const handleDragStart = (item: TItem) => {
    console.log('Drag Start:', item);
    setDraggedItem(item);
    setIsDragging(true);
    animateScale(true);
  };


  const removeRankingSlot = (id: string) => {
    const slotToRemove = rankingSlots.find((slot) => slot.id === id);
    if (slotToRemove && slotToRemove.country) {
      const updatedSlots = rankingSlots.map(slot => {
        if (slot.id === id) {
          setCountriesVisited(prev => {
            if (!prev.some(country => country.id === slotToRemove.country!.id)) {
              return [...prev, slotToRemove.country!];
            }
            return prev;
          });
          return { ...slot, country: null };
        }
        return slot;
      });
      
      setRankingSlots(updatedSlots);
      handleSaveRanking(updatedSlots);
    }
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
        onDragStart={() => item && handleDragStart(item)}
        onDragEnd={handleDragEnd}
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
          <Animated.View 
            style={[
              styles.slotContent,
              {
                transform: [{ scale: isDragging ? scaleAnim : 1 }]
              }
            ]}
          >
            <Text style={[styles.rankNumber, { color: theme.colors.onSurface }]}>
              {slot.rank}.
            </Text>
            {slot.country ? (
              <View style={styles.countryContainer}>
                <CountryFlag isoCode={slot.country.cca2} size={20} style={styles.flag} />
                <Text style={{ color: theme.colors.onSurface, marginLeft: 10, fontSize: 12 }}>
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
                  onLongPress={() => item && handleDragStart(item)}
                >
                  <Ionicons name="reorder-three" size={20} color={theme.colors.onSurface} />
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={{ color: theme.colors.onSurface, fontStyle: 'italic', fontSize: 12 }}>
                Drop Here
              </Text>
            )}
          </Animated.View>
        )}
        onReceiveDragDrop={(event) => {
          const draggedItem = event.dragged.payload as TItem;
          handleDrop('Ranking', draggedItem);
        }}
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
        style={styles.visitedItem} // Dodaj styl
      />
    );
  };
  
  return (
    <DraxProvider>
      <View 
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        {/* Visited Countries */}
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
            onReceiveDragDrop={(event) => {
              const draggedItem = event.dragged.payload as TItem;
              handleDrop('Visited', draggedItem);
            }}
            renderContent={() => (
              <View style={styles.visitedListContent}>
                {countriesVisited.map((country, index) => renderVisitedCountry(country, index))}
              </View>
            )}
          />
        </View>

        {/* Ranking */}
        <View style={styles.rankingContainer}>
          <Text style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
            Ranking
          </Text>
          <ScrollView style={styles.rankingList}>
            {rankingSlots.map((slot) => renderRankingSlot(slot))}
          </ScrollView>
          <TouchableOpacity 
            style={[styles.addButton, { backgroundColor: theme.colors.primary }]} 
            onPress={addRankingSlot}
            activeOpacity={0.7}
          >
            <Text style={[styles.addButtonText, { color: theme.colors.onPrimary }]}>
              Add More Slots
            </Text>
          </TouchableOpacity>
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
    </DraxProvider>
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
  rankingContainer: {
    marginBottom: 30,
    flex: 1, // Pozwól na rozciąganie
  },
  rankingList: {
    maxHeight: 300, // Ustaw odpowiednią wartość
    marginBottom: 10,
  },
  rankingSlot: {
    padding: 15,
    marginBottom: 15,
    borderRadius: 12,
    borderWidth: 1,
    height: 70,
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
  visitedList: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 12,
    padding: 10,
    backgroundColor: '#f9f9f9',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
  },
  visitedListContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  visitedItem: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    margin: 5,
    backgroundColor: '#fff',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
});
