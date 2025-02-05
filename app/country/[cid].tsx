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

// Komponent DangerRating – wyświetla 5 ikon ostrzegawczych opakowanych w jeden okrągły kontener
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
  return (
    <View style={styles.dangerWrapper}>
      {icons}
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
  const [knownForIcons, setKnownForIcons] = useState<string[]>([]);
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
          getFirebaseUrl(country.drivingSide.image),
          // Dla knownFor – pobieramy ikonki dla każdego elementu
          // Promise.all(country.knownFor.map(item => getFirebaseUrl(item.icon)))
        ]);
        setSliderUrls(slider);
        setOutletUrls(outlets);
        setTransportUrls(transport);
        setDrivingSideUrl(drivingUrl);
        // setKnownForIcons(knownForUrls);
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
        {/* Slider overlay – owal w lewym dolnym rogu z flagą, nazwą i dot-indicator */}
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
        {/* Usunięto flagę z tej sekcji */}
        <View style={styles.infoCard}>
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

      {/* Electrical Outlets Section – grid */}
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

  {/* Currency + Dialing Code */}
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

  {/* Legal Alcohol Age + Legal Cigarettes Age */}
  <View style={styles.row}>
    <View style={styles.halfInfoCard}>
      <Text style={styles.infoCardLabel}>🍺 Legal Alcohol Age</Text>
      <Text style={styles.infoCardValue}>{country.legalAlcoholAge} years</Text>
    </View>
    <View style={styles.halfInfoCard}>
      <Text style={styles.infoCardLabel}>🚬 Legal Cigarettes Age</Text>
      <Text style={styles.infoCardValue}>{country.legalCigarettesAge} years</Text>
    </View>
  </View>

  {/* Driving Side + Danger Rating */}
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
      <Text style={styles.infoCardLabel}>⚠ Danger Rating</Text>
      <DangerRating rating={country.dangerRating} />
    </View>
  </View>

  {/* Network Operators */}
  <View style={styles.infoCard}>
    <Text style={styles.infoCardLabel}>📡 Network Operators</Text>
    <Text style={styles.infoCardValue}>{country.networkOperators.join(', ')}</Text>
  </View>

  {/* Other Legal Drugs */}
  <View style={styles.infoCard}>
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
  drivingSideContainer: {
    flexDirection: 'row', // Ustawia elementy jeden pod drugim
    alignItems: 'flex-start', // Wyśrodkowanie w poziomie
    marginTop: 8
    },
    
    drivingSideImage: {
      width: 30,
      height: 30,
      resizeMode: 'contain',
      marginRight: 5, // Odstęp między obrazkiem a tekstem
    },
    
    drivingSideText: {
      fontSize: 14,
      // fontWeight: '400',
      color: '#333',
      alignSelf: 'flex-end', // Tekst wyrównany do dolnej krawędzi obrazka
      marginLeft: 2
    },
    dangerWrapper: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    // borderWidth: 1,
    borderRadius: 18,
    padding: 8,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(133, 88, 98, 0.09)',
    marginTop: 6,
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
    // borderRadius: 15,
    padding: 15,
    // marginHorizontal: 8,
    // marginVertical: 5,
    backgroundColor: '#fafafa',
  },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: '#333' },
  description: { fontSize: 16, marginBottom: 10, color: '#555' },
  // Info cards – mini okienka
  infoCardsContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  infoCard: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    padding: 10,
    marginVertical: 4.5,
    // marginRight: 3,
    flexBasis: '48.5%',
    backgroundColor: '#fff',
  },
  infoCardLabel: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  infoCardValue: { fontSize: 14, color: '#555', marginTop: 8 },
  // Usunięto flagContainer z General Info
  // Known For – grid mini okienek
  knownForGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  knownForCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eef',
    borderRadius: 14,
    paddingVertical: 4,
    paddingHorizontal: 8,
    margin: 3,
  },
  knownForIcon: {
    fontSize: 17,  // Rozmiar emoji
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
  },
  cityCard: {
    backgroundColor: '#def',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
    margin: 3,
  },
  cityText: { fontSize: 13, color: '#333' },
  // Outlets – grid
  outletsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    borderRadius: 30
  },
  outletImage: { width: 60, height: 60, borderRadius: 7, margin: 5 },
  // Transport Apps – grid
  appsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 5,
  },
  halfInfoCard: {
    flex: 1,
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    padding: 8,
    backgroundColor: '#fff',
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
  // Additional Info – wiersz dla driving side
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
  dangerIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FF4500',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 2,
  },
  
  drivingImage: { width: 30, height: 30, marginHorizontal: 10 },
  dangerContainer: { flexDirection: 'row', alignItems: 'flex-start' }
});

const weatherStyles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', marginVertical: 8 },
  text: { marginLeft: 8, fontSize: 16, color: '#555' },
});

export default CountryProfile;
