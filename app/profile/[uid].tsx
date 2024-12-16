// app/profile/[uid].tsx
import React, { useEffect, useState, useMemo, useCallback, useContext } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  ScrollView, 
  TouchableOpacity, 
  Alert, 
  Dimensions, 
  Modal, 
  TouchableWithoutFeedback 
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { db, auth } from '../config/firebaseConfig';
import { doc, getDoc, updateDoc, writeBatch, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { useTheme } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import countriesData from '../../assets/maps/countries.json';
import CountryFlag from 'react-native-country-flag';
import RankingList from '../../components/RankingList'; // Upewnij się, że ścieżka jest poprawna
import { ThemeContext } from '../config/ThemeContext';

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

interface FriendRequest {
  senderUid: string;
  receiverUid: string;
  status: string;
}

const removeDuplicates = (countries: Country[]): Country[] => {
  const unique = new Map<string, Country>();
  countries.forEach(c => {
    unique.set(c.id, c); // Użyj `c.id` jako klucza, zakładając że jest unikalne
  });
  return Array.from(unique.values());
};

const generateUniqueId = () => `rank-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Nowy komponent ProfileRankingItem z własnymi stylami
const ProfileRankingItem: React.FC<{ slot: RankingSlot }> = ({ slot }) => {
  const theme = useTheme();

  return (
    <View style={[profileStyles.rankingItemContainer, { backgroundColor: theme.colors.surface }]}>
      <Text style={[profileStyles.rank, { color: theme.colors.onSurface }]}>
        {slot.rank}.
      </Text>
      {slot.country ? (
        <>
          <CountryFlag isoCode={slot.country.cca2} size={20} style={profileStyles.flag} />
          <Text style={[profileStyles.countryName, { color: theme.colors.onSurface }]}>
            {slot.country.name}
          </Text>
        </>
      ) : (
        <Text style={[profileStyles.countryName, { color: theme.colors.onSurface }]}>
          Unknown
        </Text>
      )}
    </View>
  );
};

export default function ProfileScreen() {
  const { uid } = useLocalSearchParams(); // Użyj useLocalSearchParams
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [rankingSlots, setRankingSlots] = useState<RankingSlot[]>([]);
  const [countriesVisited, setCountriesVisited] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const theme = useTheme();
  const router = useRouter();
  const { isDarkTheme, toggleTheme } = useContext(ThemeContext);
  const { width, height } = Dimensions.get('window');
  const [isRankingModalVisible, setIsRankingModalVisible] = useState(false);

  // Nowe stany dla przycisku "Add to Friends"
  const [friendStatus, setFriendStatus] = useState<'none' | 'sent' | 'friend'>('none');

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

        // Tworzenie ranking slots (pełny ranking)
        const initialSlots: RankingSlot[] = rankingData.map((cca2, index) => {
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

        // Sprawdź status przyjaźni
        if (auth.currentUser) {
          const currentUserUid = auth.currentUser.uid;
          if (currentUserUid !== uid) {
            checkFriendStatus(currentUserUid, uid as string);
          }
        }
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

  // Funkcja sprawdzająca status przyjaźni
  const checkFriendStatus = async (currentUserUid: string, profileUserUid: string) => {
    try {
      // Sprawdź, czy są już przyjaciółmi (userAUid == currentUserUid AND userBUid == profileUserUid)
      const friendshipQuery1 = query(
        collection(db, 'friendships'),
        where('userAUid', '==', currentUserUid),
        where('userBUid', '==', profileUserUid),
        where('status', '==', 'accepted')
      );
      const friendshipSnapshot1 = await getDocs(friendshipQuery1);
      
      // Sprawdź, czy są już przyjaciółmi (userAUid == profileUserUid AND userBUid == currentUserUid)
      const friendshipQuery2 = query(
        collection(db, 'friendships'),
        where('userAUid', '==', profileUserUid),
        where('userBUid', '==', currentUserUid),
        where('status', '==', 'accepted')
      );
      const friendshipSnapshot2 = await getDocs(friendshipQuery2);
      
      if (!friendshipSnapshot1.empty || !friendshipSnapshot2.empty) {
        setFriendStatus('friend');
        return;
      }
      
      // Sprawdź, czy wysłano zaproszenie (senderUid == currentUserUid AND receiverUid == profileUserUid)
      const outgoingRequestQuery = query(
        collection(db, 'friendRequests'),
        where('senderUid', '==', currentUserUid),
        where('receiverUid', '==', profileUserUid),
        where('status', '==', 'pending')
      );
      const outgoingSnapshot = await getDocs(outgoingRequestQuery);
      if (!outgoingSnapshot.empty) {
        setFriendStatus('sent');
        return;
      }
      
      // Sprawdź, czy otrzymano zaproszenie (senderUid == profileUserUid AND receiverUid == currentUserUid)
      const incomingRequestQuery = query(
        collection(db, 'friendRequests'),
        where('senderUid', '==', profileUserUid),
        where('receiverUid', '==', currentUserUid),
        where('status', '==', 'pending')
      );
      const incomingSnapshot = await getDocs(incomingRequestQuery);
      if (!incomingSnapshot.empty) {
        setFriendStatus('none'); // Możesz dodać opcję akceptacji zaproszenia
        return;
      }
      
      setFriendStatus('none');
    } catch (error) {
      console.error('Error checking friend status:', error);
      setFriendStatus('none');
    }
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        console.log('User is authenticated');
        fetchUserProfile();
      } else {
        console.log('User is not authenticated');
        setLoading(false);
        Alert.alert('Error', 'You need to be logged in to view profiles.');
        // Przekieruj do ekranu logowania
        router.replace('/login');
      }
    });

    return () => unsubscribe();
  }, [fetchUserProfile, router]);

  const handleAddFriend = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser || !userProfile) {
      Alert.alert('Error', 'You need to be logged in to add friends.');
      return;
    }

    const senderUid = currentUser.uid;
    const receiverUid = userProfile.uid;

    if (senderUid === receiverUid) {
      Alert.alert('Error', 'You cannot add yourself as a friend.');
      return;
    }

    const friendRequestData = {
      senderUid: senderUid,
      receiverUid: receiverUid,
      status: 'pending',
      createdAt: serverTimestamp(),
    };

    console.log('Sending friend request with data:', friendRequestData);

    try {
      // Sprawdź, czy już są przyjaciółmi
      const friendshipQuery1 = query(
        collection(db, 'friendships'),
        where('userAUid', '==', senderUid),
        where('userBUid', '==', receiverUid),
        where('status', '==', 'accepted')
      );
      const friendshipSnapshot1 = await getDocs(friendshipQuery1);

      const friendshipQuery2 = query(
        collection(db, 'friendships'),
        where('userAUid', '==', receiverUid),
        where('userBUid', '==', senderUid),
        where('status', '==', 'accepted')
      );
      const friendshipSnapshot2 = await getDocs(friendshipQuery2);

      if (!friendshipSnapshot1.empty || !friendshipSnapshot2.empty) {
        Alert.alert('Info', 'You are already friends with this user.');
        setFriendStatus('friend');
        return;
      }

      // Sprawdź, czy istnieje już wysłane zaproszenie
      const outgoingRequestQuery = query(
        collection(db, 'friendRequests'),
        where('senderUid', '==', senderUid),
        where('receiverUid', '==', receiverUid),
        where('status', '==', 'pending')
      );
      const outgoingSnapshot = await getDocs(outgoingRequestQuery);
      if (!outgoingSnapshot.empty) {
        Alert.alert('Info', 'You have already sent a friend request to this user.');
        setFriendStatus('sent');
        return;
      }

      // Sprawdź, czy profileUser wysłał zaproszenie do currentUser
      const incomingRequestQuery = query(
        collection(db, 'friendRequests'),
        where('senderUid', '==', receiverUid),
        where('receiverUid', '==', senderUid),
        where('status', '==', 'pending')
      );
      const incomingSnapshot = await getDocs(incomingRequestQuery);
      if (!incomingSnapshot.empty) {
        Alert.alert('Info', 'This user has already sent you a friend request.');
        return;
      }

      // Dodaj zaproszenie do przyjaciół
      const batch = writeBatch(db);

      const friendRequestRef = doc(collection(db, 'friendRequests'));
      batch.set(friendRequestRef, {
        senderUid: senderUid,
        receiverUid: receiverUid,
        status: 'pending',
        createdAt: serverTimestamp(),
      });

      await batch.commit();

      Alert.alert('Success', 'Friend request sent!');
      setFriendStatus('sent');
    } catch (error) {
      console.error('Error sending friend request:', error);
      Alert.alert('Error', 'Failed to send friend request.');
    }
  };

  if (loading) {
    return (
      <View style={profileStyles.loading}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!userProfile) {
    return (
      <View style={profileStyles.container}>
        <Text style={{ color: theme.colors.onBackground }}>User not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={[profileStyles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={{ paddingBottom: 50 }}
    >
      {/* Nagłówek z przyciskiem powrotu i przełącznikiem motywu */}
      <View style={[profileStyles.header, { paddingTop: height * 0.02 }]}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={[profileStyles.headerButton, { marginLeft: -11, marginRight: -1 }]}
        >
          <Ionicons name="arrow-back" size={26} color={theme.colors.onBackground} />
        </TouchableOpacity>
        <Text style={[profileStyles.headerTitle, { color: theme.colors.onBackground }]}>
          Profile
        </Text>
        <TouchableOpacity 
          onPress={toggleTheme} 
          style={[profileStyles.headerButton, { marginRight: -7 }]}
        >
          <Ionicons name={isDarkTheme ? "sunny" : "moon"} size={24} color={theme.colors.onBackground} />
        </TouchableOpacity>
      </View>

      {/* User Panel */}
      <View style={profileStyles.userPanel}>
        <Ionicons name="person-circle" size={100} color={theme.colors.primary} />
        <Text style={[profileStyles.userName, { color: theme.colors.onBackground }]}>
          {userProfile.nickname}
        </Text>
        <Text style={[profileStyles.userEmail, { color: 'gray' }]}>
          {userProfile.email}
        </Text>

        {/* Przycisk "Add to Friends" */}
        {auth.currentUser?.uid !== userProfile.uid && (
          <TouchableOpacity
            onPress={handleAddFriend}
            style={[
              profileStyles.addFriendButton,
              { backgroundColor: friendStatus === 'sent' ? '#ccc' : theme.colors.primary }
            ]}
            disabled={friendStatus === 'sent' || friendStatus === 'friend'}
          >
            <Text style={profileStyles.addFriendButtonText}>
              {friendStatus === 'friend' ? 'Friend' : (friendStatus === 'sent' ? 'Request Sent' : 'Add')}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Ranking Section */}
      <View style={profileStyles.rankingContainer}>
        <View style={profileStyles.rankingHeader}>
          <Text style={[profileStyles.sectionTitle, { color: theme.colors.onSurface }]}>
            Ranking
          </Text>
          <TouchableOpacity onPress={() => setIsRankingModalVisible(true)}>
            <Text style={[profileStyles.showAllRankingButton, { color: theme.colors.primary }]}>
              Show Full Ranking
            </Text>
          </TouchableOpacity>
        </View>
        <RankingList rankingSlots={rankingSlots.slice(0, 5)} />
      </View>

      {/* Visited Countries Section */}
      <View style={profileStyles.visitedContainer}>
        <Text style={[profileStyles.sectionTitle, { color: theme.colors.onBackground }]}>
          Visited Countries
        </Text>
        {countriesVisited.length === 0 ? (
          <Text style={{ color: theme.colors.onBackground }}>No visited countries.</Text>
        ) : (
          <View style={profileStyles.visitedList}>
            {countriesVisited.map((country) => (
              <View 
                key={`visited-${country.id}`} 
                style={[
                  profileStyles.visitedItemContainer,
                  {
                    backgroundColor: isDarkTheme ? theme.colors.surface : '#f0f0f0',
                  }
                ]}
              >
                <CountryFlag isoCode={country.cca2} size={20} style={profileStyles.flag} />
                <Text style={[
                  profileStyles.visitedItemText, 
                  { 
                    color: theme.colors.onSurface, 
                    marginLeft: 6 
                  }
                ]}>
                  {country.name}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Modal z pełnym rankingiem */}
      <Modal
        visible={isRankingModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsRankingModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsRankingModalVisible(false)}>
          <View style={modalStyles.modalOverlay} />
        </TouchableWithoutFeedback>
        <View style={[modalStyles.modalContent, { backgroundColor: theme.colors.background }]}>
          <View style={modalStyles.modalHeader}>
            <Text style={[modalStyles.modalTitle, { color: theme.colors.onBackground }]}>
              Full Ranking
            </Text>
            <TouchableOpacity onPress={() => setIsRankingModalVisible(false)}>
              <Ionicons name="close" size={24} color={theme.colors.onBackground} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={modalStyles.modalScrollContent}>
            <RankingList rankingSlots={rankingSlots} />
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
}

// StyleSheet dla ProfileScreen
const profileStyles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20, // Zmniejszony rozmiar czcionki
    fontWeight: '600',
  },
  userPanel: {
    alignItems: 'center',
    marginBottom: 25,
  },
  userName: {
    marginTop: -2,
    fontSize: 18, // Zmniejszony rozmiar czcionki
    fontWeight: '500',
  },
  userEmail: {
    marginTop: 3,
    fontSize: 12, // Zmniejszony rozmiar czcionki
    color: 'gray',
    marginBottom: 6
  },
  addFriendButton: {
    marginTop: 5,
    paddingVertical: 5.5,
    paddingHorizontal: 15,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2, // Dodanie cienia (opcjonalnie)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  addFriendButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  rankingContainer: {
    marginBottom: 25,
  },
  rankingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18, // Zmniejszony rozmiar czcionki
    fontWeight: '600',
    marginBottom: 10,
  },
  showAllRankingButton: {
    fontSize: 14, // Mniejszy rozmiar czcionki
    textDecorationLine: 'none', // Usunięto podkreślenie
    marginBottom: 6,
  },
  rankingItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8, // Mniejszy padding
    paddingHorizontal: 12, // Mniejszy padding
    marginBottom: 10, // Większy odstęp między elementami
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ccc', // Dodanie obwódki
  },
  rank: {
    fontSize: 16, // Mniejszy rozmiar czcionki
    fontWeight: 'bold',
    marginRight: 8,
  },
  countryName: {
    fontSize: 14, // Mniejszy rozmiar czcionki
  },
  visitedContainer: {
    marginBottom: 20,
  },
  visitedList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  visitedItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    margin: 6,
    borderRadius: 8,
  },
  visitedItemText: {
    fontSize: 14,
    fontWeight: '600',
  },
  addButtonIcon: {
    marginLeft: 8,
  },
  flag: {
    width: 20,
    height: 15,
    borderRadius: 2,
  },
});

// StyleSheet dla Modal
const modalStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    position: 'absolute',
    bottom: 0,
    height: '90%',
    width: '100%',
    backgroundColor: '#fff', // Zostanie nadpisane przez dynamiczne tło
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 10,
  },
  modalScrollContent: {
    paddingBottom: 20,
  },
});
