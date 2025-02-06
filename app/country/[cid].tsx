// app/country/[cid].tsx
import React, { useEffect, useRef, useState, Suspense, lazy, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Dimensions,
  ActivityIndicator,
  InteractionManager,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { getStorage, ref, getDownloadURL } from 'firebase/storage';
import CountryFlag from 'react-native-country-flag';
import { TapGestureHandler, State as GestureState } from 'react-native-gesture-handler';
import { useWeatherData } from './useWeatherData';

// Lazy-load komponentu Extra Info
const LazyCountryExtraInfo = lazy(() => import('./CountryExtraInfo'));

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

import rawCountryData from './countryData.json';
const countryData: Record<string, CountryProfileData> = rawCountryData;

const storage = getStorage();
const getFirebaseUrl = async (path: string): Promise<string> => {
  const storageRef = ref(storage, path);
  return await getDownloadURL(storageRef);
};

// Jeśli lista Main Cities nie jest długa, używamy .map() zamiast FlatList
const CityCard = React.memo(({ city }: { city: string }) => (
  <View style={styles.cityCard}>
    <Text style={styles.cityText}>{city}</Text>
  </View>
));

const CountryProfile = () => {
  const { cid } = useLocalSearchParams();
  const country = countryData[cid as string];

  const [sliderUrls, setSliderUrls] = useState<string[]>([]);
  const [outletUrls, setOutletUrls] = useState<string[]>([]);
  const [transportUrls, setTransportUrls] = useState<string[]>([]);
  const [drivingSideUrl, setDrivingSideUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [currentSlide, setCurrentSlide] = useState<number>(0);

  const sliderRef = useRef<ScrollView>(null);
  const screenWidth = Dimensions.get('window').width;
  const outletCardImageSize = 50;

  const { data: weatherData, loading: weatherLoading } = useWeatherData(
    country.capitalLatitude,
    country.capitalLongitude
  );

  // UWAGA: Usunięto wywołanie useMonthlyTemperatures – pobieranie tych danych odbywa się w MonthlyTemperaturesSection!

  const loadImages = useCallback(() => {
    const fetchUrls = async (paths: string[]): Promise<string[]> =>
      Promise.all(paths.map((path) => getFirebaseUrl(path)));

    Promise.all([
      fetchUrls(country.images),
      fetchUrls(country.outlets),
      Promise.all(country.transportApps.map(app => getFirebaseUrl(app.logo))),
      getFirebaseUrl(country.drivingSide.image),
    ])
      .then(([slider, outlets, transport, drivingUrl]) => {
        setSliderUrls(slider);
        setOutletUrls(outlets);
        setTransportUrls(transport);
        setDrivingSideUrl(drivingUrl);
      })
      .catch((error) => {
        console.error("Error fetching images from Firebase Storage:", error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [country]);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      loadImages();
    });
    return () => task.cancel();
  }, [country, loadImages]);

  const onSliderScroll = (e: any) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / screenWidth);
    setCurrentSlide(index);
  };

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
            <CityCard key={index} city={city} />
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
  container: { flex: 1, backgroundColor: '#fafafa' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 17.5, color: 'red' },
  sliderContainer: { position: 'relative', height: 290 },
  sliderImage: { height: 290 },
  sliderOverlay: { position: 'absolute', bottom: 8, left: 10, flexDirection: 'column', alignItems: 'center' },
  countryBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', paddingVertical: 6, paddingHorizontal: 15, borderRadius: 20, marginBottom: 3.5 },
  flag: { width: 21, height: 21, borderRadius: 20, marginRight: 10, borderWidth: 1.5, borderColor: '#fff' },
  sectionBox: { borderBottomWidth: 1, borderColor: '#ddd', padding: 12, backgroundColor: '#fafafa', marginVertical: 5 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: '#333' },
  description: { fontSize: 16, marginBottom: 10, color: '#555' },
  infoCardsContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginHorizontal: -3 },
  infoCard: { borderWidth: 1, borderColor: '#ccc', borderRadius: 16, padding: 10, marginVertical: 3.5, backgroundColor: '#fff', flexBasis: '49%' },
  infoCardLabel: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  infoCardValue: { fontSize: 14, color: '#555', marginTop: 8 },
  knownForGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', marginHorizontal: -1 },
  knownForCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#eef', borderRadius: 14, paddingVertical: 4, paddingHorizontal: 8, margin: 3, marginTop: 10 },
  knownForIcon: { fontSize: 17, marginRight: 5 },
  knownForText: { fontSize: 13, color: '#333' },
  citiesGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingVertical: 10 },
  cityCard: { backgroundColor: '#def', borderRadius: 12, paddingVertical: 4, paddingHorizontal: 8, margin: 3 },
  cityText: { fontSize: 13, color: '#333' },
  dotWrapper: { backgroundColor: 'rgba(0,0,0,0.38)', borderRadius: 20, paddingVertical: 2.6, paddingHorizontal: 4.5 },
  dotContainer: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 4, height: 4, borderRadius: 4, marginHorizontal: 2.5 },
  dotActive: { backgroundColor: '#fff', width: 5, height: 5 },
  dotInactive: { backgroundColor: 'rgba(255,255,255,0.6)' },
  countryName: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
});

export default CountryProfile;
