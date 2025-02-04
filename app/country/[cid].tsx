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

// Define the interface for country profile data
interface CountryProfileData {
  name: string;
  images: string[]; // Storage paths, np. "images/poland1.jpg"
  description: string;
  capital: string;
  population: string;
  area: string;
  continent: string;
  flag: string; // Storage path, np. "flags/poland-flag.png"
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

// Inicjalizujemy Firebase Storage (firebase-config został już skonfigurowany)
const storage = getStorage();

const getFirebaseUrl = async (path: string): Promise<string> => {
  const storageRef = ref(storage, path);
  return await getDownloadURL(storageRef);
};

const CountryProfile = () => {
  const { cid } = useLocalSearchParams();
  const country = countryData[cid as string];

  // Stany na przechowywanie pobranych URL-i
  const [sliderUrls, setSliderUrls] = useState<string[]>([]);
  const [flagUrl, setFlagUrl] = useState<string>('');
  const [outletUrls, setOutletUrls] = useState<string[]>([]);
  const [transportUrls, setTransportUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!country) return;
    // Funkcja pomocnicza pobierająca wszystkie URL-e dla danej tablicy ścieżek
    const fetchUrls = async (paths: string[]): Promise<string[]> => {
      return await Promise.all(paths.map((path) => getFirebaseUrl(path)));
    };

    const loadImages = async () => {
      try {
        const [
          slider,
          flag,
          outlets,
          transport
        ] = await Promise.all([
          fetchUrls(country.images),
          getFirebaseUrl(country.flag),
          fetchUrls(country.outlets),
          fetchUrls(country.transportApps)
        ]);
        setSliderUrls(slider);
        setFlagUrl(flag);
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
      {/* Image slider */}
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

      {/* Information container */}
      <View style={styles.infoContainer}>
        <Text style={styles.sectionTitle}>Description</Text>
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
          <Image
            source={{ uri: flagUrl }}
            style={styles.flag}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.infoText}>
          <Text style={styles.label}>Known for: </Text>
          {country.knownFor}
        </Text>

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

        <Text style={styles.infoText}>
          <Text style={styles.label}>Currency: </Text>
          {country.currency}
        </Text>

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
  sliderContainer: {
    position: 'relative',
    height: 250,
  },
  sliderImage: {
    height: 250,
  },
  overlay: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
  },
  countryName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  infoContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 16,
    marginVertical: 4,
  },
  label: {
    fontWeight: 'bold',
  },
  flagContainer: {
    marginVertical: 8,
    alignItems: 'center',
  },
  flag: {
    width: 100,
    height: 60,
  },
  outletsContainer: {
    marginVertical: 8,
  },
  outletImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 8,
  },
  transportContainer: {
    marginVertical: 8,
  },
  transportImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 8,
  },
  monthlyContainer: {
    marginVertical: 8,
  },
});

export default CountryProfile;
