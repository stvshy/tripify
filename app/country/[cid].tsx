// app/country/[cid].tsx
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Dimensions,
  ActivityIndicator,
  NativeSyntheticEvent,
  NativeScrollEvent,
  TouchableOpacity
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { getStorage, ref, getDownloadURL } from 'firebase/storage';
import CountryFlag from 'react-native-country-flag';
import { FontAwesome5, MaterialIcons } from '@expo/vector-icons';

// Interfejsy danych
interface MonthlyTemperatures {
  day: number;
  night: number;
}

interface TransportApp {
  name: string;
  logo: string; // Storage path for logo image
}

interface Religion {
  name: string;
  percentage: number;
}

interface DrivingSide {
  side: string; // np. "Right" lub "Left"
  image: string; // Storage path for driving side image
}

interface CountryProfileData {
  name: string;
  images: string[]; // Storage paths for slider images
  description: string;
  capital: string;
  population: string;
  area: string;
  continent: string;
  flag: string; // Storage path (dla CountryFlag używamy biblioteki)
  knownFor: string;
  outlets: string[]; // Storage paths for electrical outlets images
  currency: string; // np. "USD ($) - PLN"
  transportApps: TransportApp[]; // Array of taxi app info objects
  currentWeather: string;
  rainySeason: string;
  bestTimeToVisit: string;
  monthlyTemperatures: Record<string, MonthlyTemperatures>;
  visaRequired: string;
  travelTips: string;
  religions: Religion[];
  dialingCode: string;
  mainCities: string[];
  networkOperators: string[];
  drivingSide: DrivingSide;
  legalAlcoholAge: number;
  legalCigarettesAge: number;
  legalDrugs: string;
  vaccinationRequirements: string;
  dangerRating: number;
}

// Import danych kraju – upewnij się, że ścieżka jest poprawna
import rawCountryData from './countryData.json';
const countryData: Record<string, CountryProfileData> = rawCountryData;

// Inicjalizacja Firebase Storage
const storage = getStorage();
const getFirebaseUrl = async (path: string): Promise<string> => {
  const storageRef = ref(storage, path);
  return await getDownloadURL(storageRef);
};

// Przykładowy widget pogody
const WeatherWidget = ({ currentWeather }: { currentWeather: string }) => {
  return (
    <View style={weatherStyles.container}>
      <FontAwesome5 name="sun" size={24} color="#FFA500" />
      <Text style={weatherStyles.text}>{currentWeather}</Text>
    </View>
  );
};

// Komponent DangerRating – wyświetla ikony ostrzeżenia
const DangerRating = ({ rating }: { rating: number }) => {
  const maxRating = 5;
  const icons = [];
  for (let i = 0; i < maxRating; i++) {
    icons.push(
      <MaterialIcons
        key={i}
        name="warning"
        size={20}
        color="#FF4500"
        style={{ opacity: i < rating ? 1 : 0.3, marginRight: 2 }}
      />
    );
  }
  return <View style={styles.dangerContainer}>{icons}</View>;
};

const CountryProfile = () => {
  const { cid } = useLocalSearchParams();
  const country = countryData[cid as string];

  // Stany dla pobranych URL-i
  const [sliderUrls, setSliderUrls] = useState<string[]>([]);
  const [outletUrls, setOutletUrls] = useState<string[]>([]);
  const [transportUrls, setTransportUrls] = useState<string[]>([]);
  const [drivingSideUrl, setDrivingSideUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [currentSlide, setCurrentSlide] = useState<number>(0);

  // Referencja do ScrollView slidera
  const sliderRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!country) return;
    const fetchUrls = async (paths: string[]): Promise<string[]> => {
      return await Promise.all(paths.map((path) => getFirebaseUrl(path)));
    };

    const loadImages = async () => {
      try {
        const [slider, outlets, transport, drivingUrl] = await Promise.all([
          fetchUrls(country.images),
          fetchUrls(country.outlets),
          // Dla transport apps – pobieramy logo z każdego obiektu
          Promise.all(country.transportApps.map(app => getFirebaseUrl(app.logo))),
          getFirebaseUrl(country.drivingSide.image)
        ]);
        setSliderUrls(slider);
        setOutletUrls(outlets);
        setTransportUrls(transport);
        setDrivingSideUrl(drivingUrl);
      } catch (error) {
        console.error("Error fetching images from Firebase Storage:", error);
      } finally {
        setLoading(false);
      }
    };

    loadImages();
  }, [country]);

  const screenWidth = Dimensions.get('window').width;

  // Obsługa scrolla slidera – ustalamy aktualny indeks zdjęcia
  const onSliderScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / screenWidth);
    setCurrentSlide(index);
  };

  // Tapnięcia po lewej/prawej stronie slidera
  const handleLeftTap = () => {
    if (currentSlide > 0) {
      const newSlide = currentSlide - 1;
      setCurrentSlide(newSlide);
      sliderRef.current?.scrollTo({ x: newSlide * screenWidth, animated: true });
    }
  };

  const handleRightTap = () => {
    if (currentSlide < sliderUrls.length - 1) {
      const newSlide = currentSlide + 1;
      setCurrentSlide(newSlide);
      sliderRef.current?.scrollTo({ x: newSlide * screenWidth, animated: true });
    }
  };

  if (!country) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Data for country "{cid}" not found.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Slider Section */}
      <View style={styles.sliderContainer}>
        <TouchableOpacity style={styles.leftTapArea} onPress={handleLeftTap} />
        <TouchableOpacity style={styles.rightTapArea} onPress={handleRightTap} />
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onSliderScroll}
          scrollEventThrottle={16}
          ref={sliderRef}
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
        {/* Slider overlay – owalu po lewej stronie z flagą, nazwą i dot-indicator */}
        <View style={styles.sliderOverlay}>
          <View style={styles.countryBadge}>
            <CountryFlag isoCode={cid as string} size={40} style={styles.flag} />
            <Text style={styles.countryName}>{country.name}</Text>
          </View>
          <View style={styles.dotWrapper}>
            <View style={styles.dotContainer}>
              {sliderUrls.map((_, index: number) => {
                const totalDots = Math.min(sliderUrls.length, 5);
                let startIndex = Math.max(0, Math.min(currentSlide - Math.floor(totalDots / 2), sliderUrls.length - totalDots));
                let endIndex = startIndex + totalDots;
                if (sliderUrls.length > totalDots) {
                  if (currentSlide < Math.floor(totalDots / 2)) {
                    startIndex = 0;
                    endIndex = totalDots;
                  } else if (currentSlide > sliderUrls.length - Math.ceil(totalDots / 2)) {
                    startIndex = sliderUrls.length - totalDots;
                    endIndex = sliderUrls.length;
                  }
                }
                if (index >= startIndex && index < endIndex) {
                  const isActive = index === currentSlide;
                  const distanceFromCenter = Math.abs(index - currentSlide);
                  return (
                    <View
                      key={index}
                      style={[
                        styles.dot,
                        isActive ? styles.dotActive : styles.dotInactive,
                        {
                          transform: [{ scale: 1.2 - distanceFromCenter * 0.2 }],
                          opacity: 1 - distanceFromCenter * 0.3,
                        }
                      ]}
                    />
                  );
                }
                return null;
              })}
            </View>
          </View>
        </View>
      </View>

      {/* General Info Section */}
      <View style={styles.sectionBox}>
        <Text style={styles.sectionTitle}>General Info</Text>
        <Text style={styles.description}>{country.description}</Text>
        <View style={styles.infoCardsContainer}>
          <View style={styles.infoCard}>
            <Text style={styles.infoCardLabel}>🏙️ Capital</Text>
            <Text style={styles.infoCardValue}>{country.capital}</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoCardLabel}>👥 Population</Text>
            <Text style={styles.infoCardValue}>{country.population}</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoCardLabel}>📏 Area</Text>
            <Text style={styles.infoCardValue}>{country.area} km²</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoCardLabel}>🌍 Continent</Text>
            <Text style={styles.infoCardValue}>{country.continent}</Text>
          </View>
        </View>
        <View style={styles.flagContainer}>
          <CountryFlag isoCode={cid as string} size={60} style={styles.flag} />
        </View>
        <View style={styles.infoCard}>
          <Text style={styles.infoCardLabel}>✨ Known For</Text>
          <Text style={styles.infoCardValue}>{country.knownFor}</Text>
        </View>
      </View>

      {/* Electrical Outlets Section – jako grid */}
      <View style={styles.sectionBox}>
        <Text style={styles.sectionTitle}>Electrical Outlets</Text>
        <View style={styles.outletsGrid}>
          {outletUrls.map((url: string, index: number) => (
            <Image
              key={index}
              source={{ uri: url }}
              style={styles.outletImage}
              resizeMode="cover"
            />
          ))}
        </View>
      </View>

      {/* Additional Info Section */}
      <View style={styles.sectionBox}>
        <Text style={styles.sectionTitle}>Additional Info</Text>
        <View style={styles.infoCard}>
          <Text style={styles.infoCardLabel}>💵 Currency</Text>
          <Text style={styles.infoCardValue}>{country.currency}</Text>
        </View>
        <View style={styles.infoCard}>
          <Text style={styles.infoCardLabel}>📞 Dialing Code</Text>
          <Text style={styles.infoCardValue}>{country.dialingCode}</Text>
        </View>
        <View style={styles.infoCard}>
          <Text style={styles.infoCardLabel}>🏙️ Main Cities</Text>
          <Text style={styles.infoCardValue}>{country.mainCities.join(', ')}</Text>
        </View>
        <View style={styles.infoCard}>
          <Text style={styles.infoCardLabel}>📡 Network Operators</Text>
          <Text style={styles.infoCardValue}>{country.networkOperators.join(', ')}</Text>
        </View>
        <View style={styles.infoCardRow}>
          <Text style={styles.infoCardLabel}>🚗 Driving Side</Text>
          <Image
            source={{ uri: drivingSideUrl }}
            style={styles.drivingImage}
            resizeMode="contain"
          />
          <Text style={styles.infoCardValue}>{country.drivingSide.side}</Text>
        </View>
        <View style={styles.infoCard}>
          <Text style={styles.infoCardLabel}>🍺 Legal Alcohol Age</Text>
          <Text style={styles.infoCardValue}>{country.legalAlcoholAge} years</Text>
        </View>
        <View style={styles.infoCard}>
          <Text style={styles.infoCardLabel}>🚬 Legal Cigarettes Age</Text>
          <Text style={styles.infoCardValue}>{country.legalCigarettesAge} years</Text>
        </View>
        <View style={styles.infoCard}>
          <Text style={styles.infoCardLabel}>💊 Legal Drugs</Text>
          <Text style={styles.infoCardValue}>{country.legalDrugs}</Text>
        </View>
        <View style={styles.infoCard}>
          <Text style={styles.infoCardLabel}>💉 Vaccination Req.</Text>
          <Text style={styles.infoCardValue}>{country.vaccinationRequirements}</Text>
        </View>
        <View style={styles.infoCard}>
          <Text style={styles.infoCardLabel}>⚠ Danger Rating</Text>
          <DangerRating rating={country.dangerRating} />
        </View>
      </View>

      {/* Transport Apps Section – teraz w gridzie */}
      <View style={styles.sectionBox}>
        <Text style={styles.sectionTitle}>Transport Apps</Text>
        <View style={styles.appsGrid}>
          {country.transportApps.map((app, index: number) => (
            <View key={index} style={styles.appCard}>
              <Image
                source={{ uri: transportUrls[index] }}
                style={styles.appLogo}
                resizeMode="cover"
              />
              <Text style={styles.appName}>{app.name}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Weather Section */}
      <View style={styles.sectionBox}>
        <Text style={styles.sectionTitle}>Weather</Text>
        <WeatherWidget currentWeather={country.currentWeather} />
        <View style={styles.infoCard}>
          <Text style={styles.infoCardLabel}>☔ Rainy Season</Text>
          <Text style={styles.infoCardValue}>{country.rainySeason}</Text>
        </View>
        <View style={styles.infoCard}>
          <Text style={styles.infoCardLabel}>📅 Best Time</Text>
          <Text style={styles.infoCardValue}>{country.bestTimeToVisit}</Text>
        </View>
      </View>

      {/* Monthly Temperatures Section */}
      <View style={styles.sectionBox}>
        <Text style={styles.sectionTitle}>Average Monthly Temperatures (°C)</Text>
        {Object.entries(country.monthlyTemperatures).map(
          ([month, temps]) => (
            <View key={month} style={styles.monthlyRow}>
              <Text style={styles.monthText}>{month}</Text>
              <Text style={styles.tempText}>🌞 {temps.day}°C</Text>
              <Text style={styles.tempText}>🌙 {temps.night}°C</Text>
            </View>
          )
        )}
      </View>

      {/* Visa & Travel Tips Section */}
      <View style={styles.sectionBox}>
        <View style={styles.infoCard}>
          <Text style={styles.infoCardLabel}>🛂 Visa Requirements</Text>
          <Text style={styles.infoCardValue}>{country.visaRequired}</Text>
        </View>
        <View style={styles.infoCard}>
          <Text style={styles.infoCardLabel}>💡 Travel Tips</Text>
          <Text style={styles.infoCardValue}>{country.travelTips}</Text>
        </View>
        <View style={styles.infoCard}>
          <Text style={styles.infoCardLabel}>🙏 Religions</Text>
          <Text style={styles.infoCardValue}>
            {country.religions.map(r => `${r.name} (${r.percentage}%)`).join(', ')}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 17.5, color: 'red' },
  // Slider
  sliderContainer: { position: 'relative', height: 290 },
  sliderImage: { height: 290 },
  leftTapArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '20%',
    height: '100%',
    zIndex: 2,
  },
  rightTapArea: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: '20%',
    height: '100%',
    zIndex: 2,
  },
  sliderOverlay: {
    position: 'absolute',
    bottom: 8,
    left: 10,
    flexDirection: 'column',
    alignItems: 'center',
  },
  countryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: 6,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginBottom: 3.5,
  },
  flag: {
    width: 21,
    height: 21,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  countryName: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  dotWrapper: {
    backgroundColor: 'rgba(0, 0, 0, 0.38)',
    borderRadius: 20,
    paddingVertical: 2.6,
    paddingHorizontal: 4.5,
  },
  dotContainer: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 4, height: 4, borderRadius: 4, marginHorizontal: 2.5 },
  dotActive: { backgroundColor: '#fff', width: 5, height: 5 },
  dotInactive: { backgroundColor: 'rgba(255, 255, 255, 0.6)' },
  // Section Box
  sectionBox: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 15,
    padding: 15,
    marginHorizontal: 15,
    marginVertical: 10,
    backgroundColor: '#fafafa',
  },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: '#333' },
  description: { fontSize: 16, marginBottom: 10, color: '#555' },
  // Info cards
  infoCardsContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  infoCard: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    padding: 8,
    marginVertical: 5,
    marginRight: 5,
    flexBasis: '48%',
    backgroundColor: '#fff',
  },
  infoCardLabel: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  infoCardValue: { fontSize: 14, color: '#555', marginTop: 3 },
  flagContainer: { marginVertical: 10, alignItems: 'center' },
  // Outlets – grid zamiast horizontal scroll
  outletsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  outletImage: { width: 60, height: 60, borderRadius: 10, margin: 5 },
  // Transport Apps – grid
  appsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  appCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 5,
    margin: 5,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  appLogo: { width: 40, height: 40, borderRadius: 20, marginRight: 5 },
  appName: { fontSize: 14, color: '#333' },
  monthlyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  monthText: { fontSize: 16, fontWeight: 'bold', color: '#333', flex: 1 },
  tempText: { fontSize: 16, color: '#555', flex: 1, textAlign: 'right' },
  // Additional Info rows
  infoCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    padding: 8,
    marginVertical: 5,
    backgroundColor: '#fff',
  },
  drivingImage: { width: 30, height: 30, marginHorizontal: 10 },
  dangerContainer: { flexDirection: 'row', alignItems: 'center' }
});

const weatherStyles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', marginVertical: 8 },
  text: { marginLeft: 8, fontSize: 16, color: '#555' },
});

export default CountryProfile;
