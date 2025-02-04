// app/country/[cid].tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { getStorage, ref, getDownloadURL } from 'firebase/storage';
import CountryFlag from 'react-native-country-flag';

// Define the interface for country profile data
interface CountryProfileData {
  name: string;
  images: string[]; // Storage paths, e.g. "poland12.jpg"
  description: string;
  capital: string;
  population: string;
  area: string;
  continent: string;
  flag: string; // Storage path, e.g. "poland-flag.png" – ale flagę pobierzemy z biblioteki
  knownFor: string;
  outlets: string[]; // Storage paths for outlet images
  currency: string;
  transportApps: string[]; // Storage paths for transport app icons
  currentWeather: string;
  rainySeason: string;
  bestTimeToVisit: string;
  monthlyTemperatures: Record<string, number>;
  visaRequired: string;
  travelTips: string;
}

// Import country data from a local JSON file – adjust path as needed
import rawCountryData from './countryData.json';
const countryData: Record<string, CountryProfileData> = rawCountryData;

// Inicjalizacja Firebase Storage (konfiguracja w firebase-config.ts)
const storage = getStorage();
// Pobiera pełny URL na podstawie ścieżki w Storage
const getFirebaseUrl = async (path: string): Promise<string> => {
  const storageRef = ref(storage, path);
  return await getDownloadURL(storageRef);
};

const CountryProfile = () => {
  const { cid } = useLocalSearchParams();
  const country = countryData[cid as string];

  // Stany na przechowywanie pobranych URL-i dla zdjęć (slider, outletów, aplikacji transportowych)
  const [sliderUrls, setSliderUrls] = useState<string[]>([]);
  const [outletUrls, setOutletUrls] = useState<string[]>([]);
  const [transportUrls, setTransportUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!country) return;
    const fetchUrls = async (paths: string[]): Promise<string[]> => {
      return await Promise.all(paths.map((path) => getFirebaseUrl(path)));
    };

    const loadImages = async () => {
      try {
        const [slider, outlets, transport] = await Promise.all([
          fetchUrls(country.images),
          fetchUrls(country.outlets),
          fetchUrls(country.transportApps)
        ]);
        setSliderUrls(slider);
        setOutletUrls(outlets);
        setTransportUrls(transport);
      } catch (error) {
        console.error("Error fetching images from Firebase Storage:", error);
      } finally {
        setLoading(false);
      }
    };

    loadImages();
  }, [country]);

  if (!country) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Data for country "{cid}" not found.</Text>
      </View>
    );
  }

  const screenWidth = Dimensions.get('window').width;

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Image slider (increased height to 300) */}
      <View style={styles.sliderContainer}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
        >
          {sliderUrls.map((url: string, index: number) => (
            <Image
              key={index}
              source={{ uri: url }}
              style={[styles.sliderImage, { width: screenWidth }]}
              resizeMode="cover"
            />
          ))}
        </ScrollView>
        {/* Overlay with country name */}
        <View style={styles.overlay}>
          <Text style={styles.countryName}>{country.name}</Text>
        </View>
      </View>

      {/* General Info Section */}
      <View style={styles.sectionBox}>
        <Text style={styles.sectionTitle}>General Info</Text>
        <Text style={styles.description}>{country.description}</Text>
        <Text style={styles.infoText}>
          <Text style={styles.label}>Capital: </Text>
          {country.capital}
        </Text>
        <Text style={styles.infoText}>
          <Text style={styles.label}>Population: </Text>
          {country.population}
        </Text>
        <Text style={styles.infoText}>
          <Text style={styles.label}>Area: </Text>
          {country.area} km²
        </Text>
        <Text style={styles.infoText}>
          <Text style={styles.label}>Continent: </Text>
          {country.continent}
        </Text>
        <View style={styles.flagContainer}>
          {/* Używamy komponentu CountryFlag z biblioteki */}
          <CountryFlag
            isoCode={cid as string}
            size={60}
            style={styles.flag}
          />
        </View>
        <Text style={styles.infoText}>
          <Text style={styles.label}>Known for: </Text>
          {country.knownFor}
        </Text>
      </View>

      {/* Electrical Outlets Section */}
      <View style={styles.sectionBox}>
        <Text style={styles.sectionTitle}>Electrical Outlets</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.outletsContainer}
        >
          {outletUrls.map((url: string, index: number) => (
            <Image
              key={index}
              source={{ uri: url }}
              style={styles.outletImage}
              resizeMode="cover"
            />
          ))}
        </ScrollView>
      </View>

      {/* Transport Apps Section */}
      <View style={styles.sectionBox}>
        <Text style={styles.sectionTitle}>Transport Apps</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.transportContainer}
        >
          {transportUrls.map((url: string, index: number) => (
            <Image
              key={index}
              source={{ uri: url }}
              style={styles.transportImage}
              resizeMode="cover"
            />
          ))}
        </ScrollView>
        <Text style={styles.infoText}>
          <Text style={styles.label}>Currency: </Text>
          {country.currency}
        </Text>
      </View>

      {/* Weather Section */}
      <View style={styles.sectionBox}>
        <Text style={styles.sectionTitle}>Weather</Text>
        <Text style={styles.infoText}>
          <Text style={styles.label}>Current weather: </Text>
          {country.currentWeather}
        </Text>
        <Text style={styles.infoText}>
          <Text style={styles.label}>Rainy season: </Text>
          {country.rainySeason}
        </Text>
        <Text style={styles.infoText}>
          <Text style={styles.label}>Best time to visit: </Text>
          {country.bestTimeToVisit}
        </Text>
      </View>

      {/* Monthly Temperatures Section */}
      <View style={styles.sectionBox}>
        <Text style={styles.sectionTitle}>Average Monthly Temperatures (°C)</Text>
        <View style={styles.monthlyContainer}>
          {Object.entries(country.monthlyTemperatures).map(
            ([month, temp]) => (
              <Text key={month} style={styles.infoText}>
                {month}: {temp}°C
              </Text>
            )
          )}
        </View>
      </View>

      {/* Visa & Travel Tips Section */}
      <View style={styles.sectionBox}>
        <Text style={styles.infoText}>
          <Text style={styles.label}>Visa Requirements: </Text>
          {country.visaRequired}
        </Text>
        <Text style={styles.sectionTitle}>Travel Tips</Text>
        <Text style={styles.infoText}>{country.travelTips}</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  errorText: {
    fontSize: 18,
    color: 'red'
  },
  // Slider container with increased height
  sliderContainer: {
    position: 'relative',
    height: 290,
  },
  sliderImage: {
    height: 290,
  },
  overlay: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    // backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  countryName: {
    color: '#fff',
    fontSize:30,
    fontWeight: 'bold',
  },
  // Sekcja opakowana zaokrąglonym obrysem
  sectionBox: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 15,
    padding: 15,
    marginHorizontal: 15,
    marginVertical: 10,
    backgroundColor: '#fafafa',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  description: {
    fontSize: 16,
    marginBottom: 10,
    color: '#555',
  },
  infoText: {
    fontSize: 16,
    marginVertical: 4,
    color: '#444',
  },
  label: {
    fontWeight: 'bold',
    color: '#333',
  },
  flagContainer: {
    marginVertical: 10,
    alignItems: 'center',
  },
  // Styl dla flagi – CountryFlag zwraca komponent Image,
  // tutaj dodajemy obrys i zaokrąglenie
  flag: {
    borderWidth: 2,
    borderColor: '#ccc',
    borderRadius: 30,
    overflow: 'hidden',
  },
  outletsContainer: {
    marginVertical: 10,
  },
  outletImage: {
    width: 60,
    height: 60,
    borderRadius: 10,
    marginRight: 10,
  },
  transportContainer: {
    marginVertical: 10,
  },
  transportImage: {
    width: 60,
    height: 60,
    borderRadius: 10,
    marginRight: 10,
  },
  monthlyContainer: {
    marginVertical: 10,
  },
});

export default CountryProfile;
