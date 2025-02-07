// app/country/[cid].tsx
import React, {
  useEffect,
  useRef,
  useState,
  Suspense,
  lazy,
  useCallback,
  memo,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Dimensions,
  ActivityIndicator,
  FlatList,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { getStorage, ref, getDownloadURL } from 'firebase/storage';
import CountryFlag from 'react-native-country-flag';
import { TapGestureHandler, State as GestureState } from 'react-native-gesture-handler';
import { useWeatherData } from './useWeatherData';
import { arrayRemove, arrayUnion, doc, updateDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebaseConfig';
import { MaterialIcons } from '@expo/vector-icons';
import rawCountryData from './countryData.json';
import { useTheme } from 'react-native-paper';
import { useCountries } from '../config/CountryContext';

const LazyCountryExtraInfo = lazy(() => import('./CountryExtraInfo'));

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
  side: string;
  image: string;
}

export interface CountryProfileData {
  name: string;
  images: string[];
  description: string;
  capital: string;
  capitalLatitude: number;
  capitalLongitude: number;
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
  languages: string[];
}

const countryData: Record<string, CountryProfileData> = rawCountryData;
const storage = getStorage();

// Globalny cache dla URL-i pobieranych z Firebase – utrzymywany w obrębie sesji
const firebaseUrlCache: { [path: string]: string } = {};

const getFirebaseUrl = async (path: string): Promise<string> => {
  const storageRef = ref(storage, path);
  return await getDownloadURL(storageRef);
};

const getFirebaseUrlCached = async (path: string): Promise<string> => {
  if (firebaseUrlCache[path]) {
    return firebaseUrlCache[path];
  }
  try {
    const url = await getFirebaseUrl(path);
    firebaseUrlCache[path] = url;
    return url;
  } catch (error) {
    console.error(`Error fetching URL for ${path}:`, error);
    return '';
  }
};

// Pomocnicza funkcja filtrująca puste ciągi znaków
const filterNonEmpty = (urls: string[]): string[] =>
  urls.filter((url) => typeof url === 'string' && url.trim() !== '');

// Memoizowany komponent dla karty miasta
const CityCard = memo(({ city }: { city: string }) => (
  <View style={styles.cityCard}>
    <Text style={styles.cityText}>{city}</Text>
  </View>
));

// Komponent wyświetlający listę miast za pomocą FlatList
const CitiesList = ({ cities }: { cities: string[] }) => (
  <FlatList
    data={cities}
    keyExtractor={(item, index) => item + index}
    renderItem={({ item }) => <CityCard city={item} />}
    numColumns={3}
    scrollEnabled={false}
    contentContainerStyle={styles.citiesGrid}
  />
);

const CountryProfile = () => {
  // Pobieramy parametr i upewniamy się, że mamy string
  const { cid } = useLocalSearchParams();
  const countryId = Array.isArray(cid) ? cid[0] : cid;
  const country = countryData[countryId];

  const theme = useTheme();
  const { visitedCountries, setVisitedCountries } = useCountries();
  const [localVisited, setLocalVisited] = useState<string[]>(visitedCountries);

  // Pobieramy dane użytkownika z Firestore
  useEffect(() => {
    if (auth.currentUser) {
      const userDocRef = doc(db, 'users', auth.currentUser.uid);
      getDoc(userDocRef)
        .then((docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            const countries = data.countriesVisited || [];
            setLocalVisited(countries);
            setVisitedCountries(countries);
          }
        })
        .catch(console.error);
    }
  }, []);

  const isVisited = localVisited.includes(countryId);

  const [sliderUrls, setSliderUrls] = useState<string[]>([]);
  const [outletUrls, setOutletUrls] = useState<string[]>([]);
  const [transportUrls, setTransportUrls] = useState<string[]>([]);
  const [drivingSideUrl, setDrivingSideUrl] = useState<string>('');
  // Używamy sliderLoading tylko do zdjęć slidera – gdy choć jeden obraz jest dostępny, ustawiamy sliderLoading na false
  const [sliderLoading, setSliderLoading] = useState<boolean>(true);
  const [currentSlide, setCurrentSlide] = useState<number>(0);
  const sliderRef = useRef<ScrollView>(null);
  const screenWidth = Dimensions.get('window').width;
  const outletCardImageSize = 50;

  // Ref blokujący aktualizację stanu slajdu podczas tapnięcia
  const isTapRef = useRef<boolean>(false);

  const { data: weatherData, loading: weatherLoading } = useWeatherData(
    country.capitalLatitude,
    country.capitalLongitude
  );

  // Ładujemy zdjęcia slidera i pozostałe zdjęcia osobno
  useEffect(() => {
    // Ładowanie zdjęć slidera – inkrementalnie
    const loadSliderImages = async () => {
      let loadedUrls: string[] = [];
      for (let i = 0; i < country.images.length; i++) {
        try {
          const url = await getFirebaseUrlCached(country.images[i]);
          if (url && url.trim() !== '') {
            loadedUrls.push(url);
            setSliderUrls([...loadedUrls]); // aktualizacja stanu po każdym załadowaniu
            Image.prefetch(url);
            if (loadedUrls.length === 1) {
              setSliderLoading(false);
            }
          }
        } catch (error) {
          console.error("Error fetching slider image:", error);
        }
      }
    };

    // Ładowanie pozostałych zdjęć
    const loadOtherImages = async () => {
      try {
        const outletUrls = await Promise.all(
          country.outlets.map((path) => getFirebaseUrlCached(path))
        );
        setOutletUrls(filterNonEmpty(outletUrls));

        const transportUrls = await Promise.all(
          country.transportApps.map(app => getFirebaseUrlCached(app.logo))
        );
        setTransportUrls(filterNonEmpty(transportUrls));

        const drivingUrl = await getFirebaseUrlCached(country.drivingSide.image);
        setDrivingSideUrl(drivingUrl && drivingUrl.trim() !== '' ? drivingUrl : '');
      } catch (error) {
        console.error("Error fetching other images:", error);
      }
    };

    loadSliderImages();
    loadOtherImages();
  }, [country]);

  // Aktualizacja stanu slajdu przy przewijaniu – jeśli nie jesteśmy w trakcie gestu tapnięcia
  const onSliderScroll = (e: any) => {
    if (isTapRef.current) return;
    const offsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / screenWidth);
    setCurrentSlide(index);
  };

  // Aktualizacja przy zakończeniu animacji przewijania
  const onMomentumScrollEnd = (e: any) => {
    if (isTapRef.current) return;
    const offsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / screenWidth);
    setCurrentSlide(index);
  };

  const handleLeftTap = () => {
    if (currentSlide > 0) {
      const newSlide = currentSlide - 1;
      isTapRef.current = true;
      setCurrentSlide(newSlide);
      sliderRef.current?.scrollTo({ x: newSlide * screenWidth, animated: true });
      setTimeout(() => { isTapRef.current = false; }, 200);
    }
  };

  const handleRightTap = () => {
    if (currentSlide < sliderUrls.length - 1) {
      const newSlide = currentSlide + 1;
      isTapRef.current = true;
      setCurrentSlide(newSlide);
      sliderRef.current?.scrollTo({ x: newSlide * screenWidth, animated: true });
      setTimeout(() => { isTapRef.current = false; }, 200);
    }
  };

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

  const toggleCountryVisited = useCallback(async () => {
    if (!auth.currentUser) {
      Alert.alert("Błąd", "Użytkownik nie jest zalogowany");
      return;
    }
    try {
      const userDocRef = doc(db, 'users', auth.currentUser.uid);
      let updatedVisited: string[];
      if (isVisited) {
        await updateDoc(userDocRef, {
          countriesVisited: arrayRemove(countryId),
        });
        updatedVisited = localVisited.filter(code => code !== countryId);
      } else {
        await updateDoc(userDocRef, {
          countriesVisited: arrayUnion(countryId),
        });
        updatedVisited = [...localVisited, countryId];
      }
      setLocalVisited(updatedVisited);
      setVisitedCountries(updatedVisited);
    } catch (error) {
      console.error('Błąd podczas zmiany statusu kraju:', error);
      Alert.alert("Błąd", "Nie udało się zmienić statusu kraju");
    }
  }, [countryId, isVisited, localVisited, setVisitedCountries]);

  if (!country) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Data for country "{countryId}" not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} removeClippedSubviews>
      {/* Slider Section */}
      <View style={styles.sliderContainer}>
        <TapGestureHandler onHandlerStateChange={handleTap}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={onSliderScroll}
            onMomentumScrollEnd={onMomentumScrollEnd}
            scrollEventThrottle={16}
            ref={sliderRef}
            removeClippedSubviews
          >
            {sliderUrls.length > 0 ? (
              sliderUrls.map((url: string, index: number) =>
                url && url.trim() !== '' ? (
                  <Image
                    key={index}
                    source={{ uri: url }}
                    style={[styles.sliderImage, { width: screenWidth }]}
                    resizeMode="cover"
                  />
                ) : null
              )
            ) : (
              <View style={[styles.sliderImage, { width: screenWidth, justifyContent: 'center', alignItems: 'center' }]}>
                <Text>Ładowanie...</Text>
              </View>
            )}
          </ScrollView>
        </TapGestureHandler>
        <View style={styles.sliderOverlay}>
          <View style={styles.countryBadge}>
            <CountryFlag isoCode={countryId} size={40} style={styles.flag} />
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

      {/* Przycisk do dodawania/odznaczania kraju */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.addButton,
            { backgroundColor: isVisited ? '#32CD32' : theme.colors.primary },
          ]}
          onPress={toggleCountryVisited}
        >
          <MaterialIcons
            name={isVisited ? "check" : "add"}
            size={24}
            color="#fff"
          />
        </TouchableOpacity>
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
      <View style={[styles.sectionBox, { paddingBottom: 20 }]}>
        <Text style={styles.sectionTitle}>Main Cities</Text>
        <View style={styles.citiesGrid}>
          {country.mainCities.map((city, index) => (
            <View key={index} style={styles.cityCard}>
              <Text style={styles.cityText}>{city}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Lazy-loaded Extra Info */}
      <Suspense fallback={<ActivityIndicator size="large" color="#000" style={{ marginVertical: 20 }} />}>
        <LazyCountryExtraInfo
          country={country}
          outletUrls={outletUrls}
          transportUrls={transportUrls}
          drivingSideUrl={drivingSideUrl}
          outletCardImageSize={outletCardImageSize}
        />
      </Suspense>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'rgb(255, 254, 255)' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 17.5, color: 'red' },
  sliderContainer: { position: 'relative', height: 290 },
  sliderImage: { height: 290 },
  sliderOverlay: { position: 'absolute', bottom: 8, left: 10, flexDirection: 'column', alignItems: 'center' },
  countryBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', paddingVertical: 6, paddingHorizontal: 13, borderRadius: 20, marginBottom: 3.5 },
  flag: { width: 21, height: 21, borderRadius: 20, marginRight: 8, borderWidth: 1.5, borderColor: '#fff', marginLeft: -3 },
  sectionBox: { borderBottomWidth: 1, borderColor: '#ddd', padding: 12, backgroundColor: 'rgb(255, 254, 255)', marginVertical: 10, paddingBottom: 4, paddingTop: 1, borderRadius: 15 },
  sectionTitle: { fontSize: 18, marginBottom: 10, color: '#333', fontFamily: 'PlusJakartaSans-Bold', marginTop: -7 },
  description: { fontSize: 16.5, marginBottom: 10, color: '#555', fontFamily: 'Figtree-Regular' },
  infoCardsContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginHorizontal: -3 },
  infoCard: { borderWidth: 1, borderColor: '#ccc', borderRadius: 16, padding: 10, marginVertical: 3.5, backgroundColor: '#fff', flexBasis: '49%' },
  infoCardLabel: { fontSize: 14.5, color: '#333', fontFamily: 'Inter-SemiBold' },
  infoCardValue: { fontSize: 14.5, color: '#555', marginTop: 8, fontFamily: 'Figtree-Regular' },
  knownForGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', marginHorizontal: -1 },
  knownForCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#eef', borderRadius: 15, paddingVertical: 4, paddingHorizontal: 9, margin: 3, marginTop: 10 },
  knownForIcon: { fontSize: 16.5, marginRight: 5 },
  knownForText: { fontSize: 13.5, color: '#333', fontFamily: 'Figtree-Medium' },
  citiesGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -3 },
  cityCard: { backgroundColor: '#def', borderRadius: 12, paddingVertical: 5, paddingHorizontal: 8.5, margin: 3, marginLeft: 0 },
  cityText: { fontSize: 13.5, color: '#333', fontFamily: 'Figtree-Medium' },
  dotWrapper: { backgroundColor: 'rgba(0,0,0,0.38)', borderRadius: 20, paddingVertical: 2.6, paddingHorizontal: 4.5 },
  dotContainer: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 4, height: 4, borderRadius: 4, marginHorizontal: 2.5 },
  dotActive: { backgroundColor: '#fff', width: 5, height: 5 },
  dotInactive: { backgroundColor: 'rgba(255,255,255,0.6)' },
  countryName: { color: '#fff', fontSize: 17, fontFamily: 'DMSans-Bold' },
  buttonContainer: { alignItems: 'flex-end', marginRight: 20, marginVertical: 10 },
  addButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
});

export default CountryProfile;
