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
import { getDoc, doc, updateDoc } from 'firebase/firestore';
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

const generateUniqueId = () => `rank-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export default function AccountScreen() {
  const { isDarkTheme, toggleTheme } = useContext(ThemeContext);
  const theme = useTheme();
  const router = useRouter();
  const [rankingSlots, setRankingSlots] = useState<RankingSlot[]>([]);
  const [activeRankingItemId, setActiveRankingItemId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('John Doe');
  const [userEmail, setUserEmail] = useState<string>('user@example.com');

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
  }, [rankingSlots]);

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

  return (
    <TouchableWithoutFeedback onPress={() => setActiveRankingItemId(null)}>
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Panel Użytkownika */}
        <View style={styles.userPanel}>
          <Ionicons name="person-circle" size={80} color={theme.colors.primary} />
          <Text style={[styles.userName, { color: theme.colors.onBackground }]}>{userName}</Text>
          <Text style={[styles.userEmail, { color: 'gray' }]}>{userEmail}</Text>
        </View>

        {/* Ranking Window */}
        <View style={styles.rankingWindow}>
          <Text style={[styles.rankingTitle, { color: theme.colors.onBackground }]}>Ranking</Text>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => router.push('/ranking')} // Używamy '/ranking' zgodnie z Twoim wymaganiem
          >
            <Text style={styles.editButtonText}> {rankingSlots.length > 0 ? 'Show and Edit Ranking' : 'Create Ranking'}</Text>
            <Ionicons name="chevron-forward" size={20} color="#6200ee" />
          </TouchableOpacity>
        </View>

        {/* Poziomo Przewijalna Lista Rankingu */}
        {rankingSlots.length > 0 ? (
          <View style={styles.horizontalRankingContainer}>
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
          <View style={styles.noRankingContainer}>
            <Text style={[styles.noRankingText, { color: theme.colors.onBackground }]}>
              You haven't created a ranking yet.
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
  userPanel: {
    alignItems: 'center',
    marginTop: 30, // Zwiększony margines od góry
    marginBottom: 20, // Zwiększony margines od dołu
  },
  userName: {
    marginTop: 8,
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
    marginBottom: 20,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 10,
    backgroundColor: '#f0f0f0', // Możesz dostosować kolor tła
  },
  rankingTitle: {
    fontSize: 18,
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
  },
  noRankingContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  noRankingText: {
    fontSize: 16,
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
});
