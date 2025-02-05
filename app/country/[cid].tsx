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
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { getStorage, ref, getDownloadURL } from 'firebase/storage';
import CountryFlag from 'react-native-country-flag';
import { FontAwesome5 } from '@expo/vector-icons';

// Importujemy TapGestureHandler z react-native-gesture-handler
import { TapGestureHandler, State as GestureState } from 'react-native-gesture-handler';

// Interfejsy danych
interface MonthlyTemperatures {
  day: number;
  night: number;
}

interface TransportApp {
  name: string;
  logo: string;
}

interface KnownForItem {
  icon: string;
  text: string;
}

interface Religion {
  name: string;
  percentage: number;
}

interface DrivingSide {
  side: string; // "Right" lub "Left"
  image: string;
}

interface CountryProfileData {
  name: string;
  images: string[];
  description: string;
  capital: string;
  population: string;
  area: string;
  continent: string;
  flag: string;
  knownFor: KnownForItem[];
  outlets: string[];
  currency: string;
  transportApps: TransportApp[];
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
  languages: string[]; // nowe pole!
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

// Widget pogody
const WeatherWidget = ({ currentWeather }: { currentWeather: string }) => {
  return (
    <View style={weatherStyles.container}>
      <FontAwesome5 name="sun" size={24} color="#FFA500" />
      <Text style={weatherStyles.text}>{currentWeather}</Text>
    </View>
  );
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

  const screenWidth = Dimensions.get('window').width;

  // Obliczamy rozmiar obrazka dla Electrical Outlets w karcie (jeśli potrzebujemy wielu obrazków, można rozbudować układ)
  const outletCardImageSize = 50;

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
          getFirebaseUrl(country.drivingSide.image),
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

  // Obsługa scrolla slidera – ustalamy aktualny indeks zdjęcia
  const onSliderScroll = (e: any) => {
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

  // Obsługa gestu tapnięcia – rozpoznajemy pozycję tapnięcia w obrębie slidera
  const handleTap = (event: any) => {
    if (event.nativeEvent.state === GestureState.END) {
      const { x } = event.nativeEvent;
      if (x < screenWidth * 0.2) {
        handleLeftTap();
      } else if (x > screenWidth * 0.8) {
        handleRightTap();
      }
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
        <TapGestureHandler onHandlerStateChange={handleTap}>
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
        </TapGestureHandler>
        {/* Slider overlay – z flagą, nazwą kraju i dot-indicator */}
        <View style={styles.sliderOverlay}>
          <View style={styles.countryBadge}>
            <CountryFlag isoCode={cid as string} size={40} style={styles.flag} />
            <Text style={styles.countryName}>{country.name}</Text>
          </View>
          <View style={styles.dotWrapper}>
            <View style={styles.dotContainer}>
              {sliderUrls.map((_, index: number) => {
                const totalDots = Math.min(sliderUrls.length, 5);
                let startIndex = Math.max(
                  0,
                  Math.min(currentSlide - Math.floor(totalDots / 2), sliderUrls.length - totalDots)
                );
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
                        },
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
            <Text style={styles.infoCardLabel}>🌍 Continent</Text>
            <Text style={styles.infoCardValue}>{country.continent}</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoCardLabel}>💠 Area</Text>
            <Text style={styles.infoCardValue}>{country.area} km²</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoCardLabel}>👥 Population</Text>
            <Text style={styles.infoCardValue}>{country.population}</Text>
          </View>
        </View>
        <View style={[styles.infoCard, { marginHorizontal: -3 }]}>
          <Text style={styles.infoCardLabel}>✨ Known For</Text>
          <View style={styles.knownForGrid}>
            {country.knownFor.map((item, index) => (
              <View key={index} style={styles.knownForCard}>
                <Text style={styles.knownForIcon}>{item.icon}</Text>
                <Text style={styles.knownForText}>{item.text}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Main Cities Section */}
      <View style={styles.sectionBox}>
        <Text style={styles.sectionTitle}>Main Cities</Text>
        <View style={styles.citiesGrid}>
          {country.mainCities.map((city, index) => (
            <View key={index} style={styles.cityCard}>
              <Text style={styles.cityText}>{city}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Additional Info Section */}
      <View style={styles.sectionBox}>
        <Text style={styles.sectionTitle}>Additional Info</Text>
        {/* Wiersz Currency & Dialing Code */}
        <View style={styles.row}>
          <View style={styles.halfInfoCard}>
            <Text style={styles.infoCardLabel}>💵 Currency</Text>
            <Text style={styles.infoCardValue}>{country.currency}</Text>
          </View>
          <View style={styles.halfInfoCard}>
            <Text style={styles.infoCardLabel}>📞 Dialing Code</Text>
            <Text style={styles.infoCardValue}>{country.dialingCode}</Text>
          </View>
        </View>
        {/* Wiersz Drinking Age & Smoking Age */}
        <View style={styles.row}>
          <View style={styles.halfInfoCard}>
            <Text style={styles.infoCardLabel}>🍺 Drinking Age</Text>
            <Text style={styles.infoCardValue}>{country.legalAlcoholAge} years</Text>
          </View>
          <View style={styles.halfInfoCard}>
            <Text style={styles.infoCardLabel}>💨 Smoking Age</Text>
            <Text style={styles.infoCardValue}>{country.legalCigarettesAge} years</Text>
          </View>
        </View>
        {/* Wiersz Driving Side & Electrical Outlets */}
        <View style={styles.row}>
        <View style={styles.halfInfoCard}>
          <Text style={styles.infoCardLabel}>🚗 Driving Side</Text>
          <View style={styles.drivingSideContainer}>
            <Image
              source={{ uri: drivingSideUrl }}
              style={styles.drivingSideImage}
              resizeMode="contain"
            />
            <Text style={styles.drivingSideText}>{country.drivingSide.side}</Text>
          </View>
        </View>


        <View style={styles.halfInfoCard}>
          <Text style={styles.infoCardLabel}>🔌 Electrical Outlets</Text>
          <View style={styles.outletCard}>
            {outletUrls.map((url, index) => (
              <View key={index} style={styles.outletItem}>
                <Image
                  source={{ uri: url }}
                  style={[styles.outletCardImage, { width: outletCardImageSize, height: outletCardImageSize }]}
                  resizeMode="cover"
                />
                <Text style={styles.outletCaption}>C</Text>
              </View>
            ))}
          </View>
        </View>

        </View>
        {/* Nowa sekcja Languages (zastępuje poprzedni Danger Rating) */}
        <View style={[styles.infoCard, { marginHorizontal: -3 }]}>
          <Text style={styles.infoCardLabel}>🌐 Languages</Text>
          <Text style={styles.infoCardValue}>{country.languages.join(', ')}</Text>
        </View>
        {/* Dodatkowe info (Network Operators, Other Legal Drugs) */}
        <View style={[styles.infoCard, { marginHorizontal: -3 }]}>
          <Text style={styles.infoCardLabel}>📡 Network Operators</Text>
          <Text style={styles.infoCardValue}>{country.networkOperators.join(', ')}</Text>
        </View>
        <View style={[styles.infoCard, { marginHorizontal: -3 }]}>
          <Text style={styles.infoCardLabel}>💊 Other Legal Drugs</Text>
          <Text style={styles.infoCardValue}>{country.legalDrugs}</Text>
        </View>
      </View>

      {/* Transport Apps Section – grid */}
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
        <View style={[styles.infoCard, { marginHorizontal: -3 }]}>
          <Text style={styles.infoCardLabel}>☔ Rainy Season</Text>
          <Text style={styles.infoCardValue}>{country.rainySeason}</Text>
        </View>
        <View style={[styles.infoCard, { marginHorizontal: -3 }]}>
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
        <View style={[styles.infoCard, { marginHorizontal: -3 }]}>
          <Text style={styles.infoCardLabel}>🛂 Visa Requirements</Text>
          <Text style={styles.infoCardValue}>{country.visaRequired}</Text>
        </View>
        <View style={[styles.infoCard, { marginHorizontal: -3 }]}>
          <Text style={styles.infoCardLabel}>💡 Travel Tips</Text>
          <Text style={styles.infoCardValue}>{country.travelTips}</Text>
        </View>
        <View style={[styles.infoCard, { marginHorizontal: -3 }]}>
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
  container: { flex: 1, backgroundColor:'#fafafa' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 17.5, color: 'red' },
  // Slider
  sliderContainer: { position: 'relative', height: 290 },
  sliderImage: { height: 290 },
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
  outletItem: {
    alignItems: 'center',      // Wyśrodkowanie zawartości (obrazek i napis)
    marginRight: 5,
    marginBottom: 5,
  },
  outletCaption: {
    fontSize: 12,
    color: '#333',
    marginTop: 3,
    textAlign: 'center',
  },
  outletCardImage: {
    borderRadius: 7,
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
    borderBottomWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    backgroundColor: '#fafafa',
    marginVertical: 5,
  },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: '#333' },
  description: { fontSize: 16, marginBottom: 10, color: '#555' },
  // Info cards – mini okienka
  infoCardsContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginHorizontal: -3 },
  infoCard: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 16,
    padding: 10,
    marginVertical: 3.5,
    backgroundColor: '#fff',
    flexBasis: '49%',  
  },
  infoCardLabel: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  infoCardValue: { fontSize: 14, color: '#555', marginTop: 8 },
  // Known For – grid mini okienek
  knownForGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    marginHorizontal: -1,
  },
  knownForCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eef',
    borderRadius: 14,
    paddingVertical: 4,
    paddingHorizontal: 8,
    margin: 3,
    marginTop: 10,
  },
  knownForIcon: {
    fontSize: 17,
    marginRight: 5,
  },
  knownForText: {
    fontSize: 13,
    color: '#333',
  },
  // Main Cities – grid mini okienek
  citiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -3,
  },
  cityCard: {
    backgroundColor: '#def',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
    margin: 3,
  },
  cityText: { fontSize: 13, color: '#333' },
  // Dla dodatkowych wierszy w Additional Info
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 3.5,
    marginHorizontal: -7,
  },
  halfInfoCard: {
    flex: 1,
    marginHorizontal: 3.5,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 16,
    padding: 10,
    backgroundColor: '#fff',
  },
  // Transport Apps – grid
  appsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    marginLeft: -6,
  },
  appCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingLeft: 6,
    paddingVertical: 6,
    paddingRight: 10,
    margin: 3.2,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  appLogo: { width: 40, height: 40, borderRadius: 15, marginRight: 7 },
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
  // Additional Info – Driving Side & Electrical Outlets
  drivingSideContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginTop: 8,
  },
  drivingSideImage: {
    width: 48,
    height: 48,
    resizeMode: 'contain',
    marginBottom: 5,
    alignSelf: 'flex-start',
  },
  drivingSideText: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',         // Tekst również wyrównany do lewej
    // alignSelf: 'center',
  },
  outletCard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: 5,
  },
});

const weatherStyles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', marginVertical: 8 },
  text: { marginLeft: 8, fontSize: 16, color: '#555' },
});

export default CountryProfile;
