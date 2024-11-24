// screens/account.tsx
import React, { useContext, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemeContext } from '../config/ThemeContext';
import { useTheme } from 'react-native-paper';
import DraggableFlatList from 'react-native-draggable-flatlist';
import { getDoc, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from  '../config/firebaseConfig';;

export default function AccountScreen() {
  const { isDarkTheme, toggleTheme } = useContext(ThemeContext);
  const theme = useTheme();
  const router = useRouter();

  const [countriesVisited, setCountriesVisited] = useState<string[]>([]);
  const [ranking, setRanking] = useState<string[]>([]);

  useEffect(() => {
    const fetchUserData = async () => {
      const currentUser = auth.currentUser;
      if (currentUser) {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setCountriesVisited(userData.countriesVisited || []);
          setRanking(userData.ranking || []);
        }
      }
    };

    fetchUserData();
  }, []);

  const handleGoBack = () => {
    router.back();
  };

  const handleSaveRanking = async (newRanking: string[]) => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      const userDocRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userDocRef, { ranking: newRanking });
    }
  };

  const renderCountryItem = ({ item, index, drag, isActive }: any) => {
    return (
      <TouchableOpacity
        style={[
          styles.countryItem,
          { backgroundColor: isActive ? theme.colors.primary : theme.colors.surface },
        ]}
        onLongPress={drag}
      >
        <Text style={{ color: theme.colors.onSurface }}>{item}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text style={[styles.text, { color: theme.colors.onBackground }]}>To jest ekran konta</Text>

      {/* Ranking Section */}
      <View style={styles.rankingContainer}>
        <Text style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>Ranking</Text>
        <DraggableFlatList
          data={ranking}
          onDragEnd={({ data }) => {
            setRanking(data);
            handleSaveRanking(data);
          }}
          keyExtractor={(item) => item}
          renderItem={renderCountryItem}
          activationDistance={20}
        />
      </View>

      {/* List of Visited Countries */}
      <View style={styles.listContainer}>
        <Text style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>Odwiedzone Kraje</Text>
        <FlatList
          data={countriesVisited.filter((country) => !ranking.includes(country))}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.countryItem}
              onPress={() => {
                if (ranking.length < 3) {
                  const newRanking = [...ranking, item];
                  setRanking(newRanking);
                  handleSaveRanking(newRanking);
                } else {
                  Alert.alert('Ranking jest pełny', 'Usuń kraj, aby dodać nowy.');
                }
              }}
            >
              <Text style={{ color: theme.colors.onSurface }}>{item}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <TouchableOpacity onPress={handleGoBack} style={[styles.button, { backgroundColor: theme.colors.primary }]}>
        <Text style={[styles.buttonText, { color: theme.colors.onPrimary }]}>Wróć</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  text: {
    fontSize: 20,
    marginBottom: 20,
    textAlign: 'center',
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignSelf: 'center',
    marginTop: 20,
  },
  buttonText: {
    fontSize: 16,
  },
  rankingContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 10,
    fontWeight: 'bold',
  },
  countryItem: {
    padding: 10,
    marginVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  listContainer: {
    flex: 1,
    marginBottom: 20,
  },
});
