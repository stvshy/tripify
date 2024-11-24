// AccountScreen.tsx
import React, { useContext, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ThemeContext } from '../config/ThemeContext';
import { useTheme } from 'react-native-paper';
import { DraxView, DraxProvider } from 'react-native-drax';
import { getDoc, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../config/firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { ListItem, TItem } from '../../components/ListItem'; // Import ListItem component

interface RankingSlot {
  id: string; // Unique identifier for the slot
  rank: number;
  country: string | null;
}

export default function AccountScreen() {
  const { isDarkTheme, toggleTheme } = useContext(ThemeContext);
  const theme = useTheme();
  const router = useRouter();

  const [countriesVisited, setCountriesVisited] = useState<string[]>([]);
  const [rankingSlots, setRankingSlots] = useState<RankingSlot[]>([]);

  useEffect(() => {
    const fetchUserData = async () => {
      const currentUser = auth.currentUser;
      if (currentUser) {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setCountriesVisited(userData.countriesVisited || []);
          const rankingData: string[] = userData.ranking || [];
          // Initialize ranking slots with top 3
          const initialSlots: RankingSlot[] = rankingData.slice(0, 3).map((country, index) => ({
            id: `rank-${index + 1}`,
            rank: index + 1,
            country: country,
          }));
          // Fill remaining slots if less than 3
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
  }, []);

  const handleGoBack = () => {
    router.back();
  };

  const handleSaveRanking = async (newRankingSlots: RankingSlot[]) => {
    const ranking = newRankingSlots
      .filter((slot) => slot.country !== null)
      .map((slot) => slot.country);
    const currentUser = auth.currentUser;
    if (currentUser) {
      const userDocRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userDocRef, { ranking: ranking });
    }
  };

  const addRankingSlot = () => {
    const newRank = rankingSlots.length + 1;
    const newSlot: RankingSlot = {
      id: `rank-${newRank}`,
      rank: newRank,
      country: null,
    };
    setRankingSlots([...rankingSlots, newSlot]);
  };

  const removeRankingSlot = (id: string) => {
    const slotToRemove = rankingSlots.find((slot) => slot.id === id);
    if (slotToRemove && slotToRemove.country) {
      // Add the removed country back to the visited list
      setCountriesVisited((prev) => [...prev, slotToRemove.country!]);
    }
    const updatedSlots = rankingSlots.filter((slot) => slot.id !== id);
    // Reassign ranks
    const reassignedSlots = updatedSlots.map((slot, index) => ({
      ...slot,
      rank: index + 1,
      id: `rank-${index + 1}`,
    }));
    setRankingSlots(reassignedSlots);
    handleSaveRanking(reassignedSlots);
  };

  const handleDrop = (slotId: string, draggedItem: TItem) => {
    if (!draggedItem) return;

    const slotIndex = rankingSlots.findIndex((slot) => slot.id === slotId);
    if (slotIndex === -1) return;

    if (rankingSlots[slotIndex].country) {
      Alert.alert('Slot Occupied', 'This ranking slot is already occupied.');
      return;
    }

    // Assign the dragged country to the slot
    const updatedSlots = rankingSlots.map((slot) => {
      if (slot.id === slotId) {
        return { ...slot, country: draggedItem.title };
      }
      return slot;
    });
    setRankingSlots(updatedSlots);
    handleSaveRanking(updatedSlots);

    // Remove the country from the visited list
    setCountriesVisited((prev) => prev.filter((c) => c !== draggedItem.title));
  };

  const renderRankingSlot = (slot: RankingSlot) => {
    return (
      <DraxView
        key={slot.id}
        style={[
          styles.rankingSlot,
          {
            backgroundColor: slot.country ? theme.colors.primary : theme.colors.surface,
            borderColor: slot.country ? theme.colors.primary : '#ccc',
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
                <Text style={{ color: theme.colors.onSurface }}>{slot.country}</Text>
                <TouchableOpacity
                  onPress={() => removeRankingSlot(slot.id)}
                  style={styles.removeButton}
                >
                  <Ionicons name="close-circle" size={20} color="red" />
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
        }}
      />
    );
  };

  const handleDrag = (item: TItem) => {
    console.log(`Dragging item: ${item.title}`);
  };

  const renderVisitedCountry = (country: string, index: number) => {
    const item: TItem = {
      id: `${country}-${index}`,
      title: country,
      singer: '', // Add additional information if needed
      imageSrc: '', // Add image if needed
    };

    return (
      <ListItem
        key={`${country}-${index}`} // Ensure unique key
        item={item}
        onDrag={handleDrag}
      />
    );
  };

  return (
    <DraxProvider>
      <ScrollView
        contentContainerStyle={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <Text style={[styles.title, { color: theme.colors.onBackground }]}>
          Account Screen
        </Text>

        {/* Visited Countries - Horizontal List */}
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
          >
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {countriesVisited.filter(
                (country) => !rankingSlots.some((slot) => slot.country === country)
              ).map((country, index) => renderVisitedCountry(country, index))}
            </ScrollView>
          </DraxView>
        </View>

        {/* Ranking Section - Vertical List */}
        <View style={styles.rankingContainer}>
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
      </ScrollView>
    </DraxProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
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
  sectionTitle: {
    fontSize: 20,
    marginBottom: 10,
    fontWeight: '600',
  },
  visitedList: {
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#f9f9f9',
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
    borderRadius: 8,
    borderWidth: 1,
    height: 70,
    justifyContent: 'center',
    backgroundColor: '#fff',
    elevation: 2, // For Android shadow
    shadowColor: '#000', // For iOS shadow
    shadowOffset: { width: 0, height: 2 }, // For iOS shadow
    shadowOpacity: 0.1, // For iOS shadow
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
  removeButton: {
    marginLeft: 10,
  },
  addButton: {
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 15,
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
