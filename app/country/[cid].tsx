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
  Animated,
  Easing,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getStorage, ref, getDownloadURL } from 'firebase/storage';
import CountryFlag from 'react-native-country-flag';
import { TapGestureHandler, State as GestureState } from 'react-native-gesture-handler';
import { useWeatherData } from './useWeatherData';
import { arrayRemove, arrayUnion, doc, updateDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebaseConfig';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
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

const filterNonEmpty = (urls: string[]): string[] =>
  urls.filter((url) => typeof url === 'string' && url.trim() !== '');

const CityCard = memo(({ city }: { city: string }) => (
  <View style={styles.cityCard}>
    <Text style={styles.cityText}>{city}</Text>
  </View>
));

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
  const { cid } = useLocalSearchParams();
  const countryId = Array.isArray(cid) ? cid[0] : cid;
  const country = countryData[countryId];
  const theme = useTheme();
  const { visitedCountries, setVisitedCountries } = useCountries();
  const [localVisited, setLocalVisited] = useState<string[]>(visitedCountries);
  const router = useRouter();
  const screenWidth = Dimensions.get('window').width;
  const outletCardImageSize = 50;
  const [isInitialized, setIsInitialized] = useState(false);
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastPosition = useRef(new Animated.Value(120)).current;
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hideAnimationRef = useRef<Animated.CompositeAnimation | null>(null);

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
          setIsInitialized(true);
        })
        .catch((error) => {
          console.error('Error fetching user data:', error);
          setIsInitialized(true); // Still mark as initialized even on error
        });
    } else {
      setIsInitialized(true);
    }
  }, []);

  const isVisited = localVisited.includes(countryId);

  // Jeśli country istnieje, znamy łączną liczbę zdjęć (nawet jeśli nie wszystkie jeszcze pobrane)
  const totalSlides = country ? country.images.length : 0;
  // Inicjujemy stan slidera – tablica o stałej długości, z pustymi ciągami (jeśli jeszcze nie pobrane)
  const [sliderUrls, setSliderUrls] = useState<string[]>(
    country ? Array(totalSlides).fill('') : []
  );
  const [outletUrls, setOutletUrls] = useState<string[]>([]);
  const [transportUrls, setTransportUrls] = useState<string[]>([]);
  const [drivingSideUrl, setDrivingSideUrl] = useState<string>('');
  // Stan ładowania slidera – po pobraniu pierwszego obrazka ustawiamy sliderLoading na false,
  // aby przycisk back i inne elementy były natychmiast dostępne
  const [sliderLoading, setSliderLoading] = useState<boolean>(true);
  const [currentSlide, setCurrentSlide] = useState<number>(0);
  const sliderRef = useRef<ScrollView>(null);
  const isTapRef = useRef<boolean>(false);
  const isAnimatingRef = useRef(false);
  
  // Pobieramy dane pogodowe – dzięki cache’owaniu i abort controllerowi obliczenia nie blokują interfejsu,
  // a ciężka operacja zostanie opóźniona do momentu zakończenia interakcji (InteractionManager)
  const { data: weatherData, loading: weatherLoading } = useWeatherData(
    country?.capitalLatitude,
    country?.capitalLongitude
  );

  useEffect(() => {
    if (!country) return;
    
    // Load first image immediately for quick display
    const loadFirstImage = async () => {
      try {
        const url = await getFirebaseUrlCached(country.images[0]);
        if (url && url.trim() !== '') {
          setSliderUrls([url]);
          Image.prefetch(url);
        }
      } catch (error) {
        console.error('Error loading first image:', error);
      }
    };
    
    // Load remaining images in the background
    const loadRemainingImages = async () => {
      for (let i = 1; i < country.images.length; i++) {
        try {
          const url = await getFirebaseUrlCached(country.images[i]);
          if (url && url.trim() !== '') {
            setSliderUrls(prev => [...prev, url]);
            Image.prefetch(url);
          }
        } catch (error) {
          console.error('Error loading image:', error);
        }
      }
    };

    // Load auxiliary images separately
    const loadAuxiliaryImages = async () => {
      try {
        const [fetchedOutletUrls, fetchedTransportUrls, fetchedDrivingUrl] = await Promise.all([
          Promise.all(country.outlets.map(path => getFirebaseUrlCached(path))),
          Promise.all(country.transportApps.map(app => getFirebaseUrlCached(app.logo))),
          getFirebaseUrlCached(country.drivingSide.image)
        ]);
        
        setOutletUrls(filterNonEmpty(fetchedOutletUrls));
        setTransportUrls(filterNonEmpty(fetchedTransportUrls));
        setDrivingSideUrl(fetchedDrivingUrl?.trim() || '');
      } catch (error) {
        console.error('Error loading auxiliary images:', error);
      }
    };

    loadFirstImage();
    setTimeout(() => {
      loadRemainingImages();
      loadAuxiliaryImages();
    }, 0);
  }, [country]);
  

  // Do obliczania kropek wykorzystujemy liczbę pobranych obrazów – jeśli pobrany jest tylko pierwszy,
  // to wyświetlamy jedną kropkę
  const loadedCount = sliderUrls.filter((url) => url.trim() !== '').length;
  const effectiveDots = loadedCount < 2 ? 1 : Math.min(loadedCount, 5);
  let startDotIndex = 0;
  if (loadedCount > effectiveDots) {
    startDotIndex = Math.min(
      Math.max(currentSlide - Math.floor(effectiveDots / 2), 0),
      loadedCount - effectiveDots
    );
  }

  const resetToastState = () => {
    hideTimeoutRef.current = null;
    hideAnimationRef.current = null;
    isAnimatingRef.current = false;
    toastOpacity.setValue(0);
    toastPosition.setValue(100);
    setToastMessage(null);
  };

  const showToast = (message: string) => {
    // Zatrzymaj poprzednie animacje i timeouty
    if (hideAnimationRef.current) {
      hideAnimationRef.current.stop();
      hideAnimationRef.current = null;
    }
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }

    // Jeśli aktualnie trwa animacja znikania, przerwij ją i zresetuj stany
    if (isAnimatingRef.current) {
      resetToastState();
    }

    // Pokaż nową wiadomość
    setToastMessage(message);
    isAnimatingRef.current = true;

    Animated.parallel([
      Animated.timing(toastOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(toastPosition, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Ustaw timeout do ukrycia toastu
    hideTimeoutRef.current = setTimeout(() => {
      hideAnimationRef.current = Animated.parallel([
        Animated.timing(toastOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(toastPosition, {
          toValue: 100,
          duration: 300,
          useNativeDriver: true,
        }),
      ]);

      hideAnimationRef.current.start(({ finished }) => {
        if (finished) {
          resetToastState();
        }
      });
    }, 3000);
  };

  // Czyszczenie przy odmontowaniu komponentu
  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
      if (hideAnimationRef.current) {
        hideAnimationRef.current.stop();
      }
    };
  }, []);

  // Przy scrollu aktualizujemy bieżący index – niezależnie czy kolejny obrazek został pobrany czy nie
  const onSliderScroll = (e: any) => {
    if (isTapRef.current) return;
    const offsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / screenWidth);
    setCurrentSlide(index);
  };

  const onMomentumScrollEnd = (e: any) => {
    if (isTapRef.current) return;
    const offsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / screenWidth);
    setCurrentSlide(index);
  };

  // Obsługa tapnięcia – umożliwiamy przewijanie tylko wtedy, gdy kolejny (lub poprzedni) obrazek został już pobrany
  const handleLeftTap = useCallback(() => {
    if (currentSlide > 0 && sliderUrls[currentSlide - 1].trim() !== '') {
      const newSlide = currentSlide - 1;
      isTapRef.current = true;
      setCurrentSlide(newSlide);
      sliderRef.current?.scrollTo({ x: newSlide * screenWidth, animated: true });
      setTimeout(() => {
        isTapRef.current = false;
      }, 200);
    }
  }, [currentSlide, screenWidth, sliderUrls]);

  const handleRightTap = useCallback(() => {
    if (
      currentSlide < sliderUrls.length - 1 &&
      sliderUrls[currentSlide + 1].trim() !== ''
    ) {
      const newSlide = currentSlide + 1;
      isTapRef.current = true;
      setCurrentSlide(newSlide);
      sliderRef.current?.scrollTo({ x: newSlide * screenWidth, animated: true });
      setTimeout(() => {
        isTapRef.current = false;
      }, 200);
    }
  }, [currentSlide, screenWidth, sliderUrls]);

  // Zmiana statusu kraju (odwiedzony/nieodwiedzony) – zmiana stanu wykonujemy optymistycznie,
  // aby użytkownik nie musiał czekać na odpowiedź z serwera
  const toggleCountryVisited = useCallback(() => {
    if (!isInitialized) return;
    if (!auth.currentUser) {
      Alert.alert('Error', 'User is not logged in');
      return;
    }

    const newVisited = isVisited
      ? localVisited.filter(code => code !== countryId)
      : [...localVisited, countryId];

    // Optimistic update
    setLocalVisited(newVisited);
    setVisitedCountries(newVisited);

  showToast(isVisited ? 'Country removed from visited list' : 'Country added to visited list');

    // Background update to Firebase
    updateDoc(doc(db, 'users', auth.currentUser.uid), {
      countriesVisited: isVisited ? arrayRemove(countryId) : arrayUnion(countryId)
    }).catch(error => {
      console.error('Error updating country status:', error);
      // Revert on error
      setLocalVisited(localVisited);
      setVisitedCountries(localVisited);
      Alert.alert('Error', 'Failed to update country status');
    });
  }, [countryId, isVisited, localVisited, setVisitedCountries, isInitialized]);

return (
  <View style={{ flex: 1 }}>
    <ScrollView style={styles.container} removeClippedSubviews>
      {/* Sekcja slidera */}
      <View style={styles.sliderContainer}>
        <ScrollView
          horizontal
          pagingEnabled
          directionalLockEnabled={true} // Blokada pionowych gestów na sliderze
          nestedScrollEnabled={true}    // Zapobiega "wyciekaniu" gestów do rodzica
          showsHorizontalScrollIndicator={false}
          onScroll={onSliderScroll}
          onMomentumScrollEnd={onMomentumScrollEnd}
          scrollEventThrottle={16}
          ref={sliderRef}
          removeClippedSubviews
        >
          {Array.from({ length: totalSlides }).map((_, index) => {
            const url = sliderUrls[index];
            return (
              <View
                key={index}
                style={{
                  width: screenWidth,
                  height: 290,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                {url && url.trim() !== '' ? (
                  <Image
                    source={{ uri: url }}
                    style={[styles.sliderImage, { width: screenWidth }]}
                    resizeMode="cover"
                  />
                ) : (
                  <ActivityIndicator size="large" color="#ccc" />
                )}
              </View>
            );
          })}
        </ScrollView>
        {/* Przycisk "back" – dostępny natychmiast */}
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={17} color="#fff" />
        </TouchableOpacity>
        {/* Lewy obszar dotykowy */}
        <TapGestureHandler
          onHandlerStateChange={(event) => {
            if (event.nativeEvent.state === GestureState.END) handleLeftTap();
          }}
          maxDeltaX={10}
          simultaneousHandlers={sliderRef}
        >
          <View style={[styles.tapArea, { left: 0, width: screenWidth * 0.2 }]} />
        </TapGestureHandler>
        {/* Prawy obszar dotykowy */}
        <TapGestureHandler
          onHandlerStateChange={(event) => {
            if (event.nativeEvent.state === GestureState.END) handleRightTap();
          }}
          maxDeltaX={10}
          simultaneousHandlers={sliderRef}
        >
          <View style={[styles.tapArea, { right: 0, width: screenWidth * 0.2 }]} />
        </TapGestureHandler>
        {/* Nakładka z nazwą kraju i dynamicznymi kropkami */}
        <View style={styles.sliderOverlay}>
          <View style={styles.countryBadge}>
            <CountryFlag isoCode={countryId} size={40} style={styles.flag} />
            <Text style={styles.countryName}>{country.name}</Text>
          </View>
          <View style={styles.dotWrapper}>
            <View style={styles.dotContainer}>
              {Array.from({ length: effectiveDots }).map((_, dotIndex) => {
                const globalDotIndex = startDotIndex + dotIndex;
                const isActive = globalDotIndex === currentSlide;
                const distanceFromCenter = Math.abs(globalDotIndex - currentSlide);
                return (
                  <View
                    key={globalDotIndex}
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
              })}
            </View>
          </View>
        </View>
      </View>
      {/* Przycisk dodawania/odznaczania kraju */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: isVisited ? 'rgb(6, 157, 11)' : '#a678e0' }]}
          onPress={toggleCountryVisited}
        >
          <MaterialCommunityIcons name={isVisited ? 'check' : 'map-marker-plus-outline'} size={21} color="#fff" />
        </TouchableOpacity>
      </View>
      {/* Sekcja General Info */}
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
      {/* Sekcja Main Cities */}
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
      {/* Lazy-loaded Extra Info – fallback nie blokuje interakcji dzięki pointerEvents: 'none' */}
      <Suspense fallback={
        <View style={{ pointerEvents: 'none' }}>
          <ActivityIndicator size="large" color="#000" style={{ marginVertical: 20 }} />
        </View>
      }>
        <LazyCountryExtraInfo
          country={country}
          outletUrls={outletUrls}
          transportUrls={transportUrls}
          drivingSideUrl={drivingSideUrl}
          outletCardImageSize={outletCardImageSize}
        />
      </Suspense>
    </ScrollView>
    {/* Toast przeniesiony poza ScrollView */}
    {toastMessage && (
      <Animated.View
        style={[
          styles.toastContainer,
          {
            opacity: toastOpacity,
            transform: [
              {
                translateY: toastPosition.interpolate({
                  inputRange: [0, 100],
                  outputRange: [0, 100],
                }),
              },
            ],
          },
        ]}
      >
        <Text style={styles.toastText}>{toastMessage}</Text>
      </Animated.View>
    )}
  </View>
);
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'rgb(255, 254, 255)' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 17.5, color: 'red' },
  sliderContainer: { position: 'relative', height: 290 },
  sliderImage: { height: 290 },
  sliderOverlay: { position: 'absolute', bottom: 8, left: 10, flexDirection: 'column', alignItems: 'center' },
  countryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 6,
    paddingHorizontal: 13,
    borderRadius: 20,
    marginBottom: 3.5,
  },
  flag: {
    width: 21,
    height: 21,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: '#fff',
    marginLeft: -3,
  },
  sectionBox: {
    borderBottomWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    backgroundColor: 'rgb(255, 254, 255)',
    marginVertical: 10,
    paddingBottom: 4,
    paddingTop: 1,
    borderRadius: 15,
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 10,
    color: '#333',
    fontFamily: 'PlusJakartaSans-Bold',
    marginTop: -7,
  },
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
    width: 35,
    height: 35,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  backButton: {
    position: 'absolute',
    top: 39,
    left: 10,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.21)',
    padding: 5,
    borderRadius: 20,
  },
  tapArea: { position: 'absolute', top: 0, bottom: 0 },
 
  toastContainer: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.56)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    elevation: 5,
    zIndex: 1000,
  },
  toastText: {
    color: 'white',
    fontSize: 14,
    textAlign: 'center',
    fontFamily: 'Figtree-Regular',
  },
});

export default CountryProfile;