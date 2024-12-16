// app/profile/[uid].tsx
import React, { useEffect, useState, useMemo, useCallback, useContext } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity, Alert, TouchableWithoutFeedback } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { db, auth } from '../config/firebaseConfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useTheme } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import countriesData from '../../assets/maps/countries.json';
import CountryFlag from 'react-native-country-flag';
import RankingItem from '../../components/RankItem';
import { ThemeContext } from '../config/ThemeContext'; // Upewnij się, że masz poprawny import

interface Country {
  id: string;
  cca2: string;
  name: string;
  flag: string;
  class: string;
  path: string;
}

interface UserProfile {
  uid: string;
  nickname: string;
  email?: string;
  ranking: string[]; // Lista kodów krajów
  countriesVisited: string[]; // Lista kodów odwiedzonych krajów
  // Dodaj inne pola, które chcesz wyświetlać
}

interface RankingSlot {
  id: string;
  rank: number;
  country: Country | null;
}

const removeDuplicates = (countries: Country[]): Country[] => {
  const unique = new Map<string, Country>();
  countries.forEach(c => {
    unique.set(c.id, c); // Użyj `c.id` jako klucza, zakładając że jest unikalne
  });
  return Array.from(unique.values());
};

const generateUniqueId = () => `rank-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export default function ProfileScreen() {
  const { uid } = useLocalSearchParams(); // Użyj useLocalSearchParams
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [rankingSlots, setRankingSlots] = useState<RankingSlot[]>([]);
  const [countriesVisited, setCountriesVisited] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const theme = useTheme();
  const router = useRouter();
  const { isDarkTheme, toggleTheme } = useContext(ThemeContext); // Użyj kontekstu motywu

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

  const fetchUserProfile = useCallback(async () => {
    try {
      console.log(`Fetching profile for UID: ${uid}`);
      const userDocRef = doc(db, 'users', uid as string);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        console.log('User document exists.');
        const data = userDoc.data() as UserProfile;

        const rankingData: string[] = data.ranking || [];
        const visitedCountryCodes: string[] = data.countriesVisited || [];

        setUserProfile({
          uid: userDoc.id,
          nickname: data.nickname || 'Unknown',
          email: data.email || 'No email',
          ranking: rankingData,
          countriesVisited: visitedCountryCodes,
        });

        // Tworzenie ranking slots
        const initialSlots: RankingSlot[] = rankingData.slice(0, 5).map((cca2, index) => {
          const country = mappedCountries.find((c: Country) => c.cca2 === cca2) || null;
          return {
            id: generateUniqueId(),
            rank: index + 1,
            country: country,
          };
        });
        setRankingSlots(initialSlots);

        // Filtruj visited countries, aby wykluczyć te już w rankingu
        const visitedCountries: Country[] = mappedCountries.filter(
          (country: Country) =>
            visitedCountryCodes.includes(country.cca2) &&
            !rankingData.includes(country.cca2)
        );

        // Usuń duplikaty
        const uniqueVisitedCountries = removeDuplicates(visitedCountries);
        setCountriesVisited(uniqueVisitedCountries);
      } else {
        console.log('User document does not exist.');
        Alert.alert('Error', 'User does not exist.');
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      Alert.alert('Error', 'Failed to fetch user profile.');
    } finally {
      setLoading(false);
    }
  }, [uid, mappedCountries]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        console.log('User is authenticated');
        fetchUserProfile();
      } else {
        console.log('User is not authenticated');
        setLoading(false);
        Alert.alert('Error', 'You need to be logged in to view profiles.');
        // Możesz przekierować do ekranu logowania
        router.replace('/login');
      }
    });

    return () => unsubscribe();
  }, [fetchUserProfile, router]);

  const handleAddToRanking = async (country: Country) => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      Alert.alert('Error', 'You need to be logged in to add to ranking.');
      return;
    }

    if (currentUser.uid !== uid) {
      Alert.alert('Error', 'You can only modify your own ranking.');
      return;
    }

    try {
      const userDocRef = doc(db, 'users', currentUser.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const data = userDocSnap.data() as UserProfile;
        const currentRanking: string[] = data.ranking || [];

        if (currentRanking.length >= 5) {
          Alert.alert('Info', 'You have reached the maximum number of ranked countries.');
          return;
        }

        if (currentRanking.includes(country.cca2)) {
          Alert.alert('Info', 'This country is already in your ranking.');
          return;
        }

        // Dodaj kraj do rankingu
        await updateDoc(userDocRef, {
          ranking: [...currentRanking, country.cca2],
        });

        Alert.alert('Success', `${country.name} has been added to your ranking.`);
        // Aktualizuj lokalny stan
        setRankingSlots(prev => [
          ...prev,
          {
            id: generateUniqueId(),
            rank: prev.length + 1,
            country: country,
          }
        ]);
        setCountriesVisited(prev => prev.filter(c => c.cca2 !== country.cca2));
      } else {
        Alert.alert('Error', 'User does not exist.');
      }
    } catch (error) {
      console.error('Error adding to ranking:', error);
      Alert.alert('Error', 'Failed to add country to ranking.');
    }
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!userProfile) {
    return (
      <View style={styles.container}>
        <Text style={{ color: theme.colors.onBackground }}>User not found.</Text>
      </View>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={() => {}}>
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Nagłówek z przyciskiem powrotu i przełącznikiem motywu */}
        <View style={[styles.header, { paddingTop: 20 }]}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.headerButton, { marginLeft: -19 }]}>
            <Ionicons name="arrow-back" size={28} color={theme.colors.onBackground} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.onBackground }]}>Profile</Text>
          <TouchableOpacity onPress={toggleTheme} style={[styles.headerButton, { marginRight: -16 }]}>
            <Ionicons name={isDarkTheme ? "sunny" : "moon"} size={26} color={theme.colors.onBackground} />
          </TouchableOpacity>
        </View>

        {/* User Panel */}
        <View style={styles.userPanel}>
          <Ionicons name="person-circle" size={100} color={theme.colors.primary} />
          <Text style={[styles.userName, { color: theme.colors.onBackground }]}>{userProfile.nickname}</Text>
          <Text style={[styles.userEmail, { color: 'gray' }]}>{userProfile.email}</Text>
        </View>

        {/* Ranking Section */}
        <View style={[styles.rankingContainer, { marginBottom: 20 }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Ranking</Text>
          {rankingSlots.length === 0 ? (
            <Text style={{ color: theme.colors.onBackground }}>No ranking available.</Text>
          ) : (
            rankingSlots.map((slot) => (
              <RankingItem key={slot.id} slot={slot} index={0} onRemove={function (index: number): void {
                    throw new Error('Function not implemented.');
                } } activeRankingItemId={null} setActiveRankingItemId={function (id: string | null): void {
                    throw new Error('Function not implemented.');
                } } isDarkTheme={false} />
            ))
          )}
        </View>

        {/* Visited Countries Section */}
        {countriesVisited.length > 0 && (
          <View style={[styles.visitedContainer, { marginTop: 20 }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.onBackground, marginLeft: 4 }]}>
              Visited Countries
            </Text>
            <ScrollView contentContainerStyle={styles.visitedScrollContainer}>
              {countriesVisited.map((country) => (
                <View key={`visited-${country.id}`} style={[
                  styles.visitedItemContainer,
                  {
                    backgroundColor: isDarkTheme ? '#333333' : '#fff',
                  }
                ]}>
                  <CountryFlag isoCode={country.cca2} size={20} style={styles.flag} />
                  <Text style={[
                    styles.visitedItemText, 
                    { 
                      color: theme.colors.onSurface, 
                      marginLeft: 6 
                    }
                  ]}>
                    {country.name}
                  </Text>
                </View>
              ))}
            </ScrollView>
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  headerButton: {
    padding: 8,
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
    marginTop: 10,
    fontSize: 24,
    fontWeight: '700',
  },
  userEmail: {
    marginTop: 5,
    fontSize: 16,
    color: 'gray',
  },
  rankingContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
  },
  visitedContainer: {
    marginBottom: 5,
    marginLeft: -4,
    marginRight: -4,
  },
  visitedScrollContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
  },
  visitedItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    margin: 6,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  visitedItemText: {
    fontSize: 14,
    fontWeight: '600',
  },
  addButtonIcon: {
    marginLeft: 10,
    marginRight: -3,
  },
  flag: {
    width: 20,
    height: 15,
    borderRadius: 2,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
