// app/profile/[uid].tsx
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { db } from '../config/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { useTheme } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import countriesData from '../../assets/maps/countries.json';
import CountryFlag from 'react-native-country-flag';
import RankingItem from '../../components/RankItem'; // Upewnij się, że RankingItem używa useTheme

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
  // Dodaj inne pola, które chcesz wyświetlać
}

interface RankingSlot {
  id: string;
  rank: number;
  country: Country | null;
}

export default function ProfileScreen() {
  const { uid } = useLocalSearchParams(); // Użyj useLocalSearchParams
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [rankingSlots, setRankingSlots] = useState<RankingSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const theme = useTheme();
  const router = useRouter();

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
      const userDocRef = doc(db, 'users', uid as string);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        const data = userDoc.data();
        const rankingData: string[] = data.ranking || [];
        setUserProfile({
          uid: userDoc.id,
          nickname: data.nickname || 'Unknown',
          email: data.email || 'No email',
          ranking: rankingData,
        });

        // Tworzenie ranking slots
        const initialSlots: RankingSlot[] = rankingData.slice(0, 5).map((cca2, index) => {
          const country = mappedCountries.find((c: Country) => c.cca2 === cca2) || null;
          return {
            id: `rank-${index + 1}`,
            rank: index + 1,
            country: country,
          };
        });
        setRankingSlots(initialSlots);
      } else {
        console.log('User does not exist.');
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setLoading(false);
    }
  }, [uid, mappedCountries]);

  useEffect(() => {
    if (uid) {
      fetchUserProfile();
    } else {
      setLoading(false);
    }
  }, [uid, fetchUserProfile]);

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
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.profileHeader}>
        <Ionicons name="person-circle" size={100} color={theme.colors.primary} />
        <Text style={[styles.nickname, { color: theme.colors.onBackground }]}>{userProfile.nickname}</Text>
        {userProfile.email && (
          <Text style={[styles.email, { color: 'gray' }]}>{userProfile.email}</Text>
        )}
      </View>

      {/* Ranking Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Ranking</Text>
        {rankingSlots.length === 0 ? (
          <Text style={{ color: theme.colors.onBackground }}>No ranking available.</Text>
        ) : (
          rankingSlots.map((slot) => (
            <RankingItem key={slot.id} slot={slot} index={0} onRemove={function (index: number): void {
                  throw new Error('Function not implemented.');
              } } activeRankingItemId={null} setActiveRankingItemId={function (id: string | null): void {
                  throw new Error('Function not implemented.');
              } } isDarkTheme={false} /> // Usuń theme z props
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 30,
  },
  nickname: {
    marginTop: 10,
    fontSize: 24,
    fontWeight: '700',
  },
  email: {
    marginTop: 5,
    fontSize: 16,
    color: 'gray',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 10,
  },
});
