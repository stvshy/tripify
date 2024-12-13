// app/community/index.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { auth, db } from '../config/firebaseConfig';
import { doc, getDoc, collection, getDocs, orderBy, query, limit, onSnapshot } from 'firebase/firestore';
import { useRouter, Href } from 'expo-router';
import { useTheme } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';

interface FeedItemProps {
  friendUid: string;
  countryCca2?: string;
}

export default function CommunityScreen() {
  const [loading, setLoading] = useState(true);
  const [feed, setFeed] = useState<{
    createdAt: any;
    friendUid: string;
    countryCca2?: string;
  }[]>([]);
  const router = useRouter();
  const theme = useTheme();

  const fetchData = useCallback(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setLoading(false);
      return;
    }

    const userId = currentUser.uid;

    // Listener dla aktywności znajomych
    const userDocRef = doc(db, 'users', userId);
    const unsubscribeUser = onSnapshot(userDocRef, async (docSnap) => {
      if (docSnap.exists()) {
        const userData = docSnap.data();
        const friends: string[] = userData.friends || [];

        const allActivities: {
          createdAt: any;
          friendUid: string;
          countryCca2?: string;
        }[] = [];

        // Używaj Promise.all z map, aby pobrać aktywności wszystkich znajomych równocześnie
        const promises = friends.map(async (friendUid) => {
          const activitiesRef = collection(db, 'users', friendUid, 'activities');
          const activitiesQuery = query(activitiesRef, orderBy('createdAt', 'desc'), limit(10));
          const activitiesSnapshot = await getDocs(activitiesQuery);
          activitiesSnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            allActivities.push({
              friendUid,
              createdAt: data.createdAt,
              countryCca2: data.countryCca2,
            });
          });
        });

        await Promise.all(promises);

        // Sortuj wszystkie aktywności po createdAt
        allActivities.sort((a, b) => {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
          return dateB.getTime() - dateA.getTime();
        });

        setFeed(allActivities);
      }
      setLoading(false);
    });

    return () => {
      unsubscribeUser();
    };
  }, []);

  // Użyj useFocusEffect, aby nasłuchiwać tylko, gdy ekran jest aktywny
  useFocusEffect(
    React.useCallback(() => {
      const unsubscribe = fetchData();
      return () => unsubscribe && unsubscribe();
    }, [fetchData])
  );

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Nagłówek z przyciskami do wyszukiwania i listy znajomych */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.colors.onBackground }]}>Aktualności</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            onPress={() => router.push({ pathname: '/community/search' } as Href<string | object>)}
            style={[styles.headerButton, { backgroundColor: theme.colors.primary }]}
          >
            <Text style={styles.headerButtonText}>Szukaj</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push({ pathname: '/community/friends' } as Href<string | object>)}
            style={[styles.headerButton, { backgroundColor: theme.colors.primary }]}
          >
            <Text style={styles.headerButtonText}>Znajomi</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push({ pathname: '/community/friendRequests' } as Href<string | object>)}
            style={[styles.headerButton, { backgroundColor: theme.colors.primary }]}
          >
            <Text style={styles.headerButtonText}>Zaproszenia</Text>
          </TouchableOpacity>
        </View>
      </View>

      {feed.length === 0 ? (
        <View style={styles.empty}>
          <Text style={{ color: theme.colors.onBackground }}>Twoi znajomi nie mają jeszcze żadnych aktywności!</Text>
        </View>
      ) : (
        <FlatList
          data={feed}
          keyExtractor={(item, index) => `${item.friendUid}-${item.createdAt?.seconds}-${index}`}
          renderItem={({ item }) => (
            <FeedItem friendUid={item.friendUid} countryCca2={item.countryCca2} />
          )}
        />
      )}
    </View>
  );
}

// Komponent FeedItem do wyświetlania pojedynczej aktywności
const FeedItem: React.FC<FeedItemProps> = ({ friendUid, countryCca2 }) => {
  const [nickname, setNickname] = useState('');
  const [countryName, setCountryName] = useState('');
  const theme = useTheme();

  useEffect(() => {
    const fetchFriendNickname = async () => {
      try {
        const friendDocRef = doc(db, 'users', friendUid);
        const friendDoc = await getDoc(friendDocRef);
        if (friendDoc.exists()) {
          const friendData = friendDoc.data();
          setNickname(friendData.nickname || 'Unknown');
        }
      } catch (error) {
        console.error('Error fetching friend nickname:', error);
        setNickname('Unknown');
      }
    };

    const fetchCountryName = async () => {
      // Zakładając, że masz lokalny plik countries.json z nazwami krajów
      try {
        const countries = require('../../assets/maps/countries.json').countries;
        const country = countries.find((c: { id: string; name: string }) => c.id === countryCca2);
        setCountryName(country ? country.name : 'Unknown');
      } catch (error) {
        console.error('Error fetching country name:', error);
        setCountryName('Unknown');
      }
    };

    fetchFriendNickname();
    fetchCountryName();
  }, [friendUid, countryCca2]);

  return (
    <View style={[styles.feedItem, { borderBottomColor: theme.colors.outline }]}>
      <Text style={{ color: theme.colors.onBackground }}>
        {nickname} odwiedził {countryName}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerButtons: {
    flexDirection: 'row',
    marginTop: 10,
    justifyContent: 'space-between',
  },
  headerButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    marginRight: 10,
  },
  headerButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  feedItem: { padding: 10, borderBottomWidth: 1 },
});
