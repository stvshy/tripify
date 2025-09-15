// app/chooseCountries/index.tsx
import React, {
  useState,
  useMemo,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useTransition,
} from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Keyboard,
  Animated,
  UIManager,
  Modal,
  TouchableOpacity,
  Easing,
  TouchableWithoutFeedback,
  BackHandler,
  TextInput,
  LayoutAnimation,
  ActivityIndicator,
  AppState,
  AppStateStatus,
  InteractionManager,
} from "react-native";
import { TextInput as PaperTextInput, useTheme } from "react-native-paper";
import {
  AntDesign,
  FontAwesome,
  MaterialCommunityIcons,
  MaterialIcons,
} from "@expo/vector-icons";
import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  runTransaction,
} from "firebase/firestore";
import { router, useFocusEffect, useRouter } from "expo-router";
import { auth, db } from "../config/firebaseConfig";
import CountryFlag from "react-native-country-flag";
import { ThemeContext } from "../config/ThemeContext"; // (theme toggle may be repurposed)
import AsyncStorage from "@react-native-async-storage/async-storage";
// DOBRZE - importujemy i od razu mówimy TS, jaki to ma być typ
import preprocessedCountries from "../../components/preprocessedCountries.json";
import { useCountries } from "../config/CountryContext";
import { useAuthStore } from "../store/authStore";
import { FlashList } from "@shopify/flash-list";
import { useLocalCount } from "../config/LocalCountContext";
import Color from "color";
import { useMapState } from "../config/MapStateProvider";
import { moderateScale, ScaledSheet } from "react-native-size-matters";
const { width, height } = Dimensions.get("window");
const ITEM_HEIGHT = moderateScale(49, 0.5);
const SECTION_HEADER_HEIGHT = moderateScale(27, 0.5);
const SAVE_BUTTON_MARGIN_BOTTOM = moderateScale(12.8);
type Continent =
  | "Africa"
  | "North America"
  | "South America"
  | "Asia"
  | "Europe"
  | "Oceania"
  | "Antarctica";

export type Country = {
  id: string;
  name: string;
  officialName: string;
  cca2: string;
  cca3: string;
  region: string;
  subregion: string;
  class: string | null;
  // path: string;
};
type ListItem = Country | { isHeader: true; title: string };
export type FilteredCountries = {
  countries: Country[];
};

// Function to determine the continent
const getContinent = (region: string, subregion: string): Continent => {
  switch (region) {
    case "Africa":
      return "Africa";
    case "Americas":
      return subregion.includes("South") ? "South America" : "North America";
    case "Asia":
      return "Asia";
    case "Europe":
      return "Europe";
    case "Oceania":
      return "Oceania";
    case "Antarctic":
      return "Antarctica";
    default:
      return "Africa";
  }
};

// CountryItem component
// Wklej ten kod w miejsce oryginalnego komponentu CountryItem

type CountryItemProps = {
  item: Country;
  onSelect: (countryCode: string) => void;
  isSelected: boolean;
  modeAV: Animated.Value;
  suppressSelectionAnimations: boolean;
};

const CountryItem = React.memo(
  function CountryItem({
    item,
    onSelect,
    isSelected,
    modeAV,
    suppressSelectionAnimations,
  }: CountryItemProps) {
    const theme = useTheme();

    // ZMIANA: Rozdzielamy animacje dla lepszej kontroli i wydajności.
    // 1. Animacja dla kolorów (wymaga useNativeDriver: false)
    const colorAnimation = useRef(
      new Animated.Value(isSelected ? 1 : 0)
    ).current;
    // 2. Animacja dla skali ptaszka (może używać useNativeDriver: true)
    const scaleAnimation = useRef(
      new Animated.Value(isSelected ? 1 : 0)
    ).current;

    // Wklej ten kod w miejsce całego bloku useEffect w CountryItem

    useEffect(() => {
      if (suppressSelectionAnimations) {
        // Natychmiastowa zmiana bez animacji dla przełączania trybu
        colorAnimation.stopAnimation();
        scaleAnimation.stopAnimation();
        colorAnimation.setValue(isSelected ? 1 : 0);
        scaleAnimation.setValue(isSelected ? 1 : 0);
        return;
      }
      // Używamy warunku, aby zastosować różne animacje
      // dla zaznaczania i odznaczania.

      if (isSelected) {
        // --- ANIMACJA ZAZNACZANIA (wolniejsza, bardziej efektowna) ---

        // Animacja koloru tła
        Animated.timing(colorAnimation, {
          toValue: 1,
          duration: 150,
          easing: Easing.out(Easing.ease),
          useNativeDriver: false,
        }).start();

        // Animacja sprężynowa dla ptaszka (efekt "pop-up")
        Animated.spring(scaleAnimation, {
          toValue: 1,
          friction: 4,
          tension: 52,
          useNativeDriver: true,
        }).start();
      } else {
        // --- ANIMACJA ODZNACZANIA (szybsza, bardziej dyskretna) ---

        // Szybsza animacja koloru tła
        Animated.timing(colorAnimation, {
          toValue: 0,
          duration: 80, // ZMIANA: Krótszy czas (o połowę)
          easing: Easing.in(Easing.ease), // ZMIANA: Szybki start animacji
          useNativeDriver: false,
        }).start();

        // Szybka animacja zanikania ptaszka (bez sprężyny)
        Animated.timing(scaleAnimation, {
          toValue: 0,
          duration: 153, // ZMIANA: Bardzo krótki czas
          useNativeDriver: true,
        }).start();
      }
    }, [isSelected, suppressSelectionAnimations]);
    const handleToggleSelection = useCallback(() => {
      onSelect(item.cca2);
    }, [onSelect, item.cca2]);

    const handleNavigateToCountry = useCallback(() => {
      router.push(`/country/${item.id}`);
    }, [item.id]);

    // Interpolacje oparte na animacji koloru
    const animatedBackgroundColor = colorAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [theme.colors.surface, theme.colors.surfaceVariant],
    });

    const animatedCheckboxBackgroundColor = colorAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: ["transparent", theme.colors.primary],
    });

    const animatedCheckboxBorderColor = colorAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [theme.colors.outline, theme.colors.primary],
    });

    // Statyczne kolory
    const flagBorderColor = theme.colors.outline;
    const checkboxIconColor = theme.colors.onPrimary;
    const staticBackgroundColor = isSelected
      ? theme.colors.surfaceVariant
      : theme.colors.surface;
    const staticCheckboxBackgroundColor = isSelected
      ? theme.colors.primary
      : "transparent";
    const staticCheckboxBorderColor = isSelected
      ? theme.colors.primary
      : theme.colors.outline;

    // Interpolacja do płynnego przełączania ikon bez re-renderów (0 -> visited, 1 -> wishlist)
    const visitedOpacity = useMemo(
      () => modeAV.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
      [modeAV]
    );
    const wishlistOpacity = useMemo(
      () => modeAV.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }),
      [modeAV]
    );

    return (
      <Pressable
        onPress={handleToggleSelection}
        style={styles.countryItemOuterContainer}
      >
        <Animated.View
          style={[
            styles.countryItemInnerContainer,
            {
              backgroundColor: suppressSelectionAnimations
                ? staticBackgroundColor
                : animatedBackgroundColor,
              borderBottomWidth: 0.5,
              borderBottomColor: theme.colors.outline,
            },
          ]}
        >
          <TouchableOpacity
            onPress={handleNavigateToCountry}
            style={styles.navigableArea}
            activeOpacity={0.6}
          >
            <View
              style={[
                styles.flagContainer,
                styles.flagWithBorder,
                { borderColor: flagBorderColor },
              ]}
            >
              <CountryFlag
                isoCode={item.cca2}
                size={moderateScale(24.7, 0.5)}
              />
            </View>
            <Text
              style={[
                styles.countryText,
                { color: theme.colors.onSurface, marginLeft: 5 },
              ]}
            >
              {item.name}
            </Text>
          </TouchableOpacity>

          <View style={{ flex: 1 }} />

          <Animated.View
            style={[
              styles.roundCheckbox,
              {
                backgroundColor: suppressSelectionAnimations
                  ? staticCheckboxBackgroundColor
                  : animatedCheckboxBackgroundColor,
                borderColor: suppressSelectionAnimations
                  ? staticCheckboxBorderColor
                  : animatedCheckboxBorderColor,
              },
            ]}
          >
            {/* NOWOŚĆ: Zastosowanie transformacji skali z animacji sprężynowej */}
            <Animated.View
              style={{
                transform: [
                  {
                    scale: suppressSelectionAnimations
                      ? isSelected
                        ? 1
                        : 0
                      : (scaleAnimation as any),
                  },
                ],
                width: 12,
                height: 12,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Animated.View
                style={{ position: "absolute", opacity: visitedOpacity }}
              >
                <FontAwesome name="check" size={12} color={checkboxIconColor} />
              </Animated.View>
              <Animated.View
                style={{ position: "absolute", opacity: wishlistOpacity }}
              >
                <FontAwesome name="plus" size={12} color={checkboxIconColor} />
              </Animated.View>
            </Animated.View>
          </Animated.View>
        </Animated.View>
      </Pressable>
    );
  },
  (prevProps: CountryItemProps, nextProps: CountryItemProps) => {
    // Always re-render if selection state changes
    if (prevProps.isSelected !== nextProps.isSelected) return false;
    // Re-render when animation suppression toggles (mode switch)
    if (
      prevProps.suppressSelectionAnimations !==
      nextProps.suppressSelectionAnimations
    ) {
      return false;
    }

    // If both are unselected, ignore mode changes to avoid unnecessary re-renders
    if (!prevProps.isSelected && !nextProps.isSelected) {
      return (
        prevProps.item === nextProps.item &&
        prevProps.onSelect === nextProps.onSelect
      );
    }

    // Otherwise, props are effectively the same
    return (
      prevProps.item === nextProps.item &&
      prevProps.onSelect === nextProps.onSelect
    );
  }
);
type ChooseCountriesScreenProps = {
  fromTab?: boolean;
};
const SectionHeader = ({ title }: { title: string }) => {
  const theme = useTheme();
  return (
    <View
      style={[styles.sectionHeader, { backgroundColor: theme.colors.surface }]}
    >
      <Text style={[styles.sectionHeaderText, { color: theme.colors.primary }]}>
        {title}
      </Text>
    </View>
  );
};
export default function ChooseCountriesScreen({
  fromTab = false,
}: ChooseCountriesScreenProps) {
  const router = useRouter();
  const [inputValue, setInputValue] = useState(""); // Stan dla samego inputu
  const [filterQuery, setFilterQuery] = useState(""); // Stan do filtrowania listy
  const [isPending, startTransition] = useTransition();
  const { setLocalCount, selectionMode, setSelectionMode } = useLocalCount();
  const { toggleTheme, isDarkTheme } = useContext(ThemeContext);
  const theme = useTheme();
  // const [isFocused, setIsFocused] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  // const [isInputFocused, setIsInputFocused] = useState(false);
  const scaleValue = useRef(new Animated.Value(1)).current;
  const modeAV = useRef(
    new Animated.Value(selectionMode === "wishlist" ? 1 : 0)
  ).current;
  const [suppressSelectionAnimations, setSuppressSelectionAnimations] =
    useState(false);

  // Błyskawicznie aktualizuj stan ikon tuż przed committem layoutu
  useLayoutEffect(() => {
    modeAV.stopAnimation();
    modeAV.setValue(selectionMode === "wishlist" ? 1 : 0);
  }, [selectionMode, modeAV]);
  const [isPopupVisible, setIsPopupVisible] = useState(true);
  const searchInputRef = useRef<TextInput>(null);
  const {
    visitedCountries,
    setVisitedCountries,
    wishlistCountries,
    setWishlistCountries,
  } = useCountries();
  const initialVisitedCountriesRef = useRef(new Set(visitedCountries));
  const appState = useRef(AppState.currentState);
  const { updateAndHighlightCountries, applyCountryDiff } = useMapState();

  // Tryb globalny współdzielony z headerem
  const mode = selectionMode;
  const prevModeRef = useRef(mode);
  const [localSelectedCountries, setLocalSelectedCountries] = useState(
    () => new Set<string>()
  );
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  //  const selectedCountriesRef = useRef(selectedCountries);
  // useEffect(() => {
  //   const initialSet = new Set(visitedCountries);
  //   setLocalSelectedCountries(initialSet); // Ustawia stan lokalny
  //   initialVisitedCountriesRef.current = initialSet; // Zapisuje stan początkowy
  //   setLocalCount(initialSet.size); // Ustawia licznik

  //   // Funkcja czyszcząca uruchomi się przy odmontowaniu
  //   return () => {
  //     setLocalCount(null);
  //   };
  // }, [visitedCountries, setLocalCount]); // Zależności są idealne
  const { userProfile, setUserProfile } = useAuthStore();

  // const preprocessedCountries: ListItem[] = preprocessedData;

  // Używamy useMemo do błyskawicznego filtrowania GOTOWEJ listy.
  // To jest bardzo szybka operacja w porównaniu do poprzedniej.
  const allCountries = preprocessedCountries as unknown as ListItem[];

  const flattenedData = useMemo(() => {
    const lowercasedQuery = filterQuery.toLowerCase().trim();

    // Jeśli nie ma filtrowania, zwróć całą listę
    if (!lowercasedQuery) {
      return allCountries;
    }

    // Obiekt do przechowywania przefiltrowanych krajów pogrupowanych po kontynentach
    const grouped: Record<string, Country[]> = {};

    // Iterujemy tylko po krajach (ignorujemy nagłówki na tym etapie)
    for (const item of allCountries) {
      if (!("isHeader" in item)) {
        if (item.name.toLowerCase().includes(lowercasedQuery)) {
          // Znajdź kontynent dla tego kraju
          const continent = getContinent(item.region, item.subregion);

          // Jeśli kontynent nie istnieje w naszym obiekcie, stwórz dla niego tablicę
          if (!grouped[continent]) {
            grouped[continent] = [];
          }
          // Dodaj kraj do odpowiedniej grupy
          grouped[continent].push(item);
        }
      }
    }

    // Teraz "spłaszcz" pogrupowane dane z powrotem do formatu listy
    const result: ListItem[] = [];
    for (const continentTitle of Object.keys(grouped).sort()) {
      // Sortujemy kontynenty alfabetycznie
      // Dodaj nagłówek kontynentu
      result.push({ isHeader: true, title: continentTitle });
      // Dodaj wszystkie kraje z tego kontynentu
      result.push(...grouped[continentTitle]);
    }

    return result;
  }, [filterQuery, allCountries]);
  useEffect(() => {
    const checkPopup = async () => {
      try {
        const value = await AsyncStorage.getItem("hasShownPopup");
        if (value !== "true") {
          setIsPopupVisible(true);
        }
      } catch (e) {
        console.error("Failed to load popup status.");
      }
    };

    checkPopup();
  }, []);

  const handleClosePopup = useCallback(async () => {
    setIsPopupVisible(false);
    try {
      await AsyncStorage.setItem("hasShownPopup", "true");
    } catch (e) {
      console.error("Failed to save popup status.");
    }
  }, []);
  const overrideItemLayout = useCallback(
    (layout: { size?: number }, item: ListItem) => {
      if ("isHeader" in item) {
        layout.size = SECTION_HEADER_HEIGHT;
      } else {
        layout.size = ITEM_HEIGHT;
      }
    },
    []
  );
  const handleToggleTheme = useCallback(() => {
    Animated.sequence([
      Animated.timing(scaleValue, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleValue, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(() => {
      toggleTheme();
    });
  }, [scaleValue, toggleTheme]);

  // Ikona (modeAV) będzie aktualizowana ręcznie po zsynchronizowaniu zaznaczeń

  // useFocusEffect(
  //   useCallback(() => {
  //     // --- Nowa, bardziej agresywna logika BackHandler ---
  //     const onBackPress = () => {
  //       // Sprawdzamy, czy jakikolwiek TextInput jest aktywny.
  //       // To jest bardziej ogólne i niezawodne niż poleganie na naszym stanie.
  //       const activeElement = TextInput.State.currentlyFocusedInput();

  //       if (activeElement) {
  //         // Jeśli tak, bezwzględnie usuwamy fokus i chowamy klawiaturę
  //         activeElement.blur();
  //         Keyboard.dismiss();

  //         // Upewniamy się, że nasz stan też jest zsynchronizowany
  //         setIsSearchFocused(false);

  //         // Zwracamy `true`, aby zatrzymać dalsze działania
  //         return true;
  //       }

  //       // Jeśli żaden input nie jest aktywny, pozwalamy na normalne działanie
  //       return false;
  //     };

  //     const backHandler = BackHandler.addEventListener(
  //       "hardwareBackPress",
  //       onBackPress
  //     );

  //     // --- Logika AppState (pozostaje bez zmian) ---
  //     const subscription = AppState.addEventListener(
  //       "change",
  //       (nextAppState) => {
  //         if (
  //           appState.current.match(/active/) &&
  //           (nextAppState === "background" || nextAppState === "inactive")
  //         ) {
  //           console.log(
  //             "App state changed to inactive/background! Saving changes..."
  //           );
  //           handleSaveRef.current?.();
  //         }
  //         appState.current = nextAppState;
  //       }
  //     );

  //     // --- Funkcja czyszcząca ---
  //     return () => {
  //       console.log(
  //         "Screen lost focus! Removing listeners and saving changes..."
  //       );
  //       backHandler.remove(); // Usuwamy listener BackHandler
  //       subscription.remove(); // Usuwamy listener AppState
  //       handleSaveRef.current?.(); // Zapisujemy zmiany przy utracie fokusu
  //     };
  //   }, []) // Pusta tablica zależności jest tutaj KLUCZOWA, aby to działało jak componentDidMount/WillUnmount
  // );
  const SkeletonItem = () => {
    const theme = useTheme();

    // --- Logika kolorów zgodna z Twoimi wymaganiami ---

    // Tło komórki: surface jaśniejszy o 10%
    // Używamy try-catch, bo operacje na kolorach mogą rzucić błąd, jeśli format jest nieoczekiwany
    let itemBackgroundColor;
    try {
      // Dla motywu ciemnego rozjaśniamy, dla jasnego... też rozjaśniamy (można to dostosować)
      itemBackgroundColor = Color(theme.colors.surface).hex();
    } catch (e) {
      itemBackgroundColor = theme.colors.surface; // Fallback
    }

    // Kolor elementów (placeholdery): w trybie ciemnym przyciemniony o 0.2, w jasnym rozjaśniony o 0.2
    let placeholderColor;
    try {
      placeholderColor = theme.dark
        ? Color(theme.colors.surfaceVariant).darken(0.16).hex()
        : Color(theme.colors.surfaceVariant).darken(0.01).hex();
    } catch (e) {
      placeholderColor = theme.colors.surfaceVariant; // Fallback
    }

    return (
      // Używamy tego samego stylu co prawdziwy item, aby zapewnić spójność
      <View
        style={[
          styles.countryItemInnerContainer,
          {
            backgroundColor: itemBackgroundColor,
            // Dodajemy border, aby pasował do prawdziwego itemu
            borderBottomWidth: 0.5,
            borderBottomColor: theme.colors.outline,
            // Dodajemy marginesy, które są na prawdziwej liście
            // marginHorizontal: 13,
            // marginBottom: 1,
            width: "100%", // Upewniamy się, że zajmuje całą szerokość
          },
        ]}
      >
        {/* Kontener na flagę i nazwę - zachowujemy strukturę */}
        <View style={styles.navigableArea}>
          {/* Placeholder flagi */}
          <View
            style={[
              styles.flagContainer,
              {
                width: 30, // Stała szerokość jak w CountryFlag
                height: 25, // Stała wysokość jak w CountryFlag
                backgroundColor: placeholderColor,
                borderRadius: 5,
                borderWidth: 1,
                borderColor: "transparent", // Ukrywamy border flagi, bo ma tło
              },
            ]}
          />
          {/* Placeholder nazwy kraju */}
          <View
            style={{
              height: 20,
              width: "60%", // Przykładowa szerokość
              backgroundColor: placeholderColor,
              borderRadius: 13,
              marginLeft: 5, // Taki sam margines jak w `countryText`
            }}
          />
        </View>

        <View style={{ flex: 1 }} />

        {/* Placeholder checkboxa */}
        <View
          style={[
            styles.roundCheckbox,
            {
              // Naśladujemy wygląd niezaznaczonego checkboxa
              borderColor: theme.colors.outline,
              backgroundColor: "transparent",
            },
          ]}
        />
      </View>
    );
  };
  const ListSkeleton = () => {
    // Pokaż tyle skeletonów, ile mniej więcej mieści się na ekranie
    const skeletonCount = Math.floor(height / (ITEM_HEIGHT + 1)) - 2; // +1 za marginBottom
    return (
      // Zmieniamy paddingTop, aby pasował do odstępu w prawdziwej liście
      <View style={{ paddingTop: 37, flex: 1 }}>
        {Array.from({ length: skeletonCount }).map((_, index) => (
          <SkeletonItem key={index} />
        ))}
      </View>
    );
  };
  const [isSkeletonVisible, setIsSkeletonVisible] = useState(true);

  // Wartość opacity dla animacji zanikania skeletona
  const skeletonOpacity = useRef(new Animated.Value(1)).current;

  // Ref, który zapewni, że animacja zanikania uruchomi się tylko raz
  const hasInitialLoadFired = useRef(false);
  // Inicjalizacja oraz reakcja na zmianę trybu z ochroną przed zapętleniem (przed paintem)
  useLayoutEffect(() => {
    const modeChanged = prevModeRef.current !== mode;
    if (modeChanged) {
      setSuppressSelectionAnimations(true);
    }
    const src = mode === "visited" ? visitedCountries : wishlistCountries;
    let differs = false;
    if (localSelectedCountries.size !== src.length) differs = true;
    else {
      for (const c of src) {
        if (!localSelectedCountries.has(c)) {
          differs = true;
          break;
        }
      }
      if (!differs) {
        for (const c of localSelectedCountries) {
          if (!src.includes(c)) {
            differs = true;
            break;
          }
        }
      }
    }
    if (differs) {
      const initialSet = new Set(src);
      setLocalSelectedCountries(initialSet);
      initialVisitedCountriesRef.current = initialSet;
      setLocalCount(initialSet.size);
    } else {
      setLocalCount(localSelectedCountries.size);
    }
    if (modeChanged) {
      // Wyłącz suppression tuż po commicie, aby ręczne tapy od razu animowały
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setSuppressSelectionAnimations(false));
      });
      prevModeRef.current = mode;
    }
  }, [mode, visitedCountries, wishlistCountries]);

  // Czyszczenie licznika przy odmontowaniu
  useEffect(() => {
    return () => {
      setLocalCount(null);
    };
  }, [setLocalCount]);
  // ZASTĄP CAŁĄ FUNKCJĘ `handleSelectCountry` PONIŻSZYM KODEM:
  const dismissKeyboard = useCallback(() => {
    searchInputRef.current?.blur();
    Keyboard.dismiss();
  }, []);

  const dismissKeyboardAndUnfocus = useCallback(() => {
    if (searchInputRef.current?.isFocused()) {
      searchInputRef.current?.blur();
    }
    Keyboard.dismiss();
  }, []);
  const savingRef = useRef(false);
  const handleSelectCountry = useCallback(
    (countryCode: string) => {
      dismissKeyboard();
      setLocalSelectedCountries((currentSelected) => {
        const newSet = new Set(currentSelected);
        newSet.has(countryCode)
          ? newSet.delete(countryCode)
          : newSet.add(countryCode);
        return newSet;
      });
    },
    [dismissKeyboard]
  );
  const handleViewableItemsChanged = useCallback(() => {
    // Sprawdzamy, czy to pierwsze załadowanie (dzięki ref-owi)
    if (!hasInitialLoadFired.current) {
      hasInitialLoadFired.current = true; // Zaznaczamy, że już się uruchomiło

      // Uruchamiamy animację zanikania skeletona
      Animated.timing(skeletonOpacity, {
        toValue: 0,
        duration: 250, // Krótka, płynna animacja
        useNativeDriver: true,
      }).start(() => {
        // Po zakończeniu animacji, całkowicie usuwamy skeleton z drzewa komponentów
        setIsSkeletonVisible(false);
      });
    }
  }, [skeletonOpacity]);
  const saveForMode = useCallback(
    async (
      modeToSave: "visited" | "wishlist",
      finalSetSnapshot: Set<string>
    ) => {
      if (savingRef.current) return;
      savingRef.current = true;
      const user = auth.currentUser;
      if (!user) {
        console.error("Cannot save, user not authenticated.");
        savingRef.current = false;
        return;
      }
      const initialArray =
        modeToSave === "visited" ? visitedCountries : wishlistCountries;
      const initialSet = new Set(initialArray);

      InteractionManager.runAfterInteractions(() => {
        const add: string[] = [];
        const remove: string[] = [];
        finalSetSnapshot.forEach((c) => {
          if (!initialSet.has(c)) add.push(c);
        });
        initialSet.forEach((c) => {
          if (!finalSetSnapshot.has(c)) remove.push(c);
        });
        if (modeToSave === "visited" && (add.length || remove.length)) {
          applyCountryDiff(add, remove, { immediate: true });
        }
        const currentSelectedArray = Array.from(finalSetSnapshot);
        const userDocRef = doc(db, "users", user.uid);
        updateDoc(
          userDocRef,
          modeToSave === "visited"
            ? {
                countriesVisited: currentSelectedArray,
                ...(!fromTab && { firstLoginComplete: true }),
              }
            : {
                countriesWishlist: currentSelectedArray,
              }
        )
          .then(() => {
            console.log(`${modeToSave} countries saved successfully.`);
          })
          .catch((error) => {
            console.error("Error auto-saving countries:", error);
          })
          .finally(() => {
            savingRef.current = false;
          });
      });
    },
    [fromTab, applyCountryDiff, visitedCountries, wishlistCountries]
  );

  const handleSaveCountries = useCallback(async () => {
    return saveForMode(mode, localSelectedCountries);
  }, [saveForMode, mode, localSelectedCountries]);
  const handleSaveRef = useRef(handleSaveCountries);
  useEffect(() => {
    handleSaveRef.current = handleSaveCountries;
  }, [handleSaveCountries]);
  useEffect(() => {
    setLocalCount(localSelectedCountries.size);
  }, [localSelectedCountries]);
  // <<< GŁÓWNA ZMIANA: Obsługa stanu aplikacji (background/inactive) >>>
  // useFocusEffect(
  //   useCallback(() => {
  //     // Ta funkcja jest wywoływana, gdy ekran zyskuje fokus.
  //     // Możemy tu nasłuchiwać na zmiany stanu aplikacji.
  //     const subscription = AppState.addEventListener(
  //       "change",
  //       (nextAppState: AppStateStatus) => {
  //         if (
  //           appState.current.match(/active/) &&
  //           (nextAppState === "background" || nextAppState === "inactive")
  //         ) {
  //           console.log(
  //             "App state changed to inactive/background! Saving changes..."
  //           );
  //           handleSaveRef.current?.();
  //         }
  //         appState.current = nextAppState;
  //       }
  //     );

  //     // Ta funkcja czyszcząca jest wywoływana, gdy ekran traci fokus.
  //     return () => {
  //       subscription.remove();
  //       console.log("Screen lost focus! Saving changes...");
  //       handleSaveRef.current?.();
  //     };
  //   }, []) // Pusta tablica zależności jest tutaj poprawna
  // );
  // Wklej ten kod do komponentu ChooseCountriesScreen

  // Wklej ten kod do komponentu ChooseCountriesScreen (w miejsce poprzednich `useFocusEffect`)

  useFocusEffect(
    useCallback(() => {
      // Ta funkcja zostanie wywołana, gdy klawiatura CAŁKOWICIE się schowa.
      const onKeyboardHide = () => {
        // Sprawdzamy, czy nasz input wciąż ma fokus.
        // Czasem może go stracić z innego powodu, więc to jest dobre zabezpieczenie.
        if (searchInputRef.current?.isFocused()) {
          // Imperatywnie i natychmiastowo usuwamy fokus.
          searchInputRef.current.blur();
        }
      };

      // --- NOWY, KLUCZOWY ELEMENT: Nasłuchiwanie na zdarzenie systemowe ---
      // Rejestrujemy listener, który odpali się PO schowaniu klawiatury.
      const keyboardDidHideSubscription = Keyboard.addListener(
        "keyboardDidHide",
        onKeyboardHide
      );

      // Listener dla stanu aplikacji zostaje, bo jest potrzebny do zapisu danych.
      const appStateSubscription = AppState.addEventListener(
        "change",
        (nextAppState) => {
          if (
            appState.current.match(/active/) &&
            (nextAppState === "background" || nextAppState === "inactive")
          ) {
            handleSaveRef.current?.();
          }
          appState.current = nextAppState;
        }
      );

      // --- Funkcja czyszcząca ---
      // Jest absolutnie kluczowa, aby usunąć listenery, gdy ekran straci fokus.
      return () => {
        keyboardDidHideSubscription.remove(); // Usuwamy nasz nowy listener
        appStateSubscription.remove();
        handleSaveRef.current?.();
      };
    }, []) // Pusta tablica zależności jest tutaj poprawna,
    // ponieważ logika zależy tylko od stabilnego refa i nie musi być odtwarzana.
  );
  const renderItem = useCallback(
    ({ item }: { item: ListItem }) => {
      if ("isHeader" in item) {
        return <SectionHeader title={item.title} />;
      }
      return (
        <CountryItem
          item={item}
          onSelect={handleSelectCountry} // Przekazujemy STABILNĄ funkcję
          isSelected={localSelectedCountries.has(item.cca2)}
          modeAV={modeAV}
          suppressSelectionAnimations={suppressSelectionAnimations}
        />
      );
    },
    // Zależność od `selectedCountries` jest kluczowa, by funkcja
    // `renderItem` miała zawsze dostęp do aktualnego stanu zaznaczeń.
    // `handleSelectCountry` jest stabilne, więc nie powoduje problemów.
    [localSelectedCountries, handleSelectCountry]
  );
  const handleSearchChange = (text: string) => {
    setInputValue(text); // Aktualizuj input natychmiast
    startTransition(() => {
      setFilterQuery(text); // Tę aktualizację oznacz jako "transition"
    });
  };

  const getItemType = useCallback((item: ListItem) => {
    return "isHeader" in item ? "sectionHeader" : "row";
  }, []);
  const handleFocus = useCallback(() => {
    setIsSearchFocused(true);
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const handleBlur = useCallback(() => {
    setIsSearchFocused(false);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);
  const listExtraData = useMemo(
    () => ({ selected: localSelectedCountries, suppress: suppressSelectionAnimations }),
    [localSelectedCountries, suppressSelectionAnimations]
  );
  return (
    // <TouchableWithoutFeedback onPress={dismissKeyboard}>
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: theme.colors.background },
        fromTab ? styles.containerFromTab : styles.containerStandalone,
      ]}
    >
      {/* Informational Popup */}
      {!fromTab && isPopupVisible && (
        <Modal
          transparent={true}
          visible={isPopupVisible}
          animationType="slide"
          onRequestClose={handleClosePopup}
        >
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.modalContent,
                { backgroundColor: theme.colors.surface },
              ]}
            >
              <Text
                style={[styles.modalTitle, { color: theme.colors.primary }]}
              >
                Hey Traveller!
              </Text>
              <Text
                style={[styles.modalText, { color: theme.colors.onSurface }]}
              >
                Please choose the countries you have visited from the list
                below.
              </Text>
              <TouchableOpacity
                onPress={handleClosePopup}
                style={[
                  styles.modalButton,
                  { backgroundColor: theme.colors.primary },
                ]}
              >
                <Text
                  style={[
                    styles.modalButtonText,
                    { color: theme.colors.onPrimary },
                  ]}
                >
                  Got it
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={fromTab ? 0 : Platform.OS === "ios" ? 80 : 20}
      >
        <View style={{ flex: 1 }}>
          {/* Search Bar and Theme Toggle Button */}
          <View
            style={{
              // Te style zapewniają, że nagłówek jest na wierzchu, ma tło i padding
              zIndex: 10,
              backgroundColor: theme.colors.background, // Użyj theme.colors.background
              paddingBottom: moderateScale(2.8), // Padding jest teraz tutaj
            }}
          >
            <View
              style={[
                styles.searchAndToggleContainer,
                { backgroundColor: theme.colors.surface },
              ]}
            >
              <View
                style={[
                  styles.inputContainer, // Używa naszego nowego stylu z position: 'relative'
                  isSearchFocused && styles.inputFocused,
                ]}
              >
                {/* IKONA jest teraz pozycjonowana absolutnie wewnątrz kontenera */}
                <AntDesign
                  name="search1"
                  size={moderateScale(21.5, 0.5)}
                  color={
                    isSearchFocused
                      ? theme.colors.primary
                      : theme.dark
                        ? "#838383ff"
                        : "#888888ff"
                  }
                  style={styles.searchIcon} // <--- Nasz nowy, absolutny styl
                />

                {/* PaperTextInput NIE ma już propa 'left' */}
                <PaperTextInput
                  ref={searchInputRef}
                  label="Search Country"
                  value={inputValue}
                  onChangeText={handleSearchChange}
                  mode="flat"
                  style={styles.input} // <--- Używa naszego nowego stylu z paddingLeft
                  placeholderTextColor={theme.colors.onSurfaceVariant}
                  theme={{
                    colors: {
                      primary: isSearchFocused
                        ? theme.colors.primary
                        : theme.colors.outline,
                      background: "transparent",
                      text: theme.colors.onSurface,
                    },
                  }}
                  underlineColor="transparent"
                  underlineStyle={{ height: 0 }}
                  // right prop pozostaje bez zmian
                  right={
                    inputValue ? (
                      <PaperTextInput.Icon
                        icon={() => (
                          <MaterialIcons
                            name="close"
                            size={moderateScale(17, 0.5)}
                            color={theme.colors.outline}
                            // style={styles.iconRight}
                          />
                        )}
                        onPress={() => {
                          handleSearchChange("");
                          dismissKeyboard();
                        }}
                        style={styles.iconRight}
                      />
                    ) : null
                  }
                  autoCapitalize="none"
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                />
              </View>

              {/* Przycisk przełączający tryb visited <-> wishlist */}
              <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
                <Pressable
                  onPress={() => {
                    Animated.sequence([
                      Animated.timing(scaleValue, {
                        toValue: 0.9,
                        duration: 90,
                        useNativeDriver: true,
                      }),
                      Animated.timing(scaleValue, {
                        toValue: 1,
                        duration: 120,
                        useNativeDriver: true,
                      }),
                    ]).start(() => {
                      setSuppressSelectionAnimations(true);
                      // Zapisz zmiany w bieżącym trybie przed przełączeniem
                      const modeBefore = selectionMode;
                      const snapshotBefore = new Set(localSelectedCountries);
                      saveForMode(modeBefore, snapshotBefore);
                      // Wyznacz nowy tryb i natychmiast ustaw lokalny wybór pod nowy tryb
                      const next =
                        modeBefore === "visited" ? "wishlist" : "visited";
                      const src =
                        next === "visited" ? visitedCountries : wishlistCountries;
                      const newSet = new Set(src);
                      setLocalSelectedCountries(newSet);
                      setLocalCount(newSet.size);
                      // Przełącz tryb (ikony zsynchronizuje useLayoutEffect na modeAV)
                      setSelectionMode(next);
                      // Przywróć animacje selekcji po dwóch klatkach,
                      // aby wartości animacji w wierszach zdążyły się zsynchronizować
                      requestAnimationFrame(() => {
                        requestAnimationFrame(() =>
                          setSuppressSelectionAnimations(false)
                        );
                      });
                    });
                  }}
                  style={[
                    styles.toggleButton,
                    { backgroundColor: theme.colors.primary },
                  ]}
                >
                  <Text
                    style={{
                      color: theme.colors.onPrimary,
                      fontSize: moderateScale(11.5, 0.4),
                      fontWeight: "600",
                    }}
                  >
                    <MaterialCommunityIcons
                      name={
                        mode === "visited"
                          ? "bookmark-plus"
                          : "map-marker-check"
                      }
                      size={moderateScale(21.5, 0.5)}
                      color={theme.colors.onPrimary}
                    />
                  </Text>
                </Pressable>
              </Animated.View>
            </View>
          </View>
          {/* Country List */}
          <View
            style={{
              flex: 1,
              marginBottom: fromTab
                ? moderateScale(-15.8)
                : moderateScale(-19.8),
              marginTop: moderateScale(-5.6, 0.5), // <--- ZMIANA
            }}
          >
            {isPending ? (
              <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
              </View>
            ) : (
              // Kontener dla listy i nakładki ze skeletonem
              <View style={{ flex: 1 }}>
                <FlashList
                  data={flattenedData}
                  renderItem={renderItem}
                  keyExtractor={(item, index) =>
                    "isHeader" in item
                      ? `header-${item.title}`
                      : `country-${item.cca3}`
                  }
                  getItemType={getItemType}
                  extraData={listExtraData}
                  estimatedItemSize={ITEM_HEIGHT}
                  contentContainerStyle={{
                    paddingBottom: fromTab ? 20 : 96,
                  }}
                  overrideItemLayout={overrideItemLayout}
                  drawDistance={height * 3}
                  keyboardShouldPersistTaps="handled"
                  onScrollBeginDrag={dismissKeyboardAndUnfocus}
                  // <<< NOWE, WAŻNE PROPSY >>>
                  onViewableItemsChanged={handleViewableItemsChanged}
                  viewabilityConfig={{
                    itemVisiblePercentThreshold: 1, // Uruchom callback, gdy tylko 1% pierwszego itemu jest widoczny
                  }}
                  ListEmptyComponent={() => (
                    <View
                      style={[
                        styles.emptyContainer,
                        { flex: 1, justifyContent: "center" },
                      ]}
                    >
                      <Text style={styles.emptyText}>No countries found.</Text>
                    </View>
                  )}
                />

                {/* Skeleton renderowany jako nakładka, która zniknie */}
                {isSkeletonVisible && (
                  <Animated.View
                    style={[
                      StyleSheet.absoluteFill, // Rozciąga się na cały kontener nadrzędny
                      {
                        backgroundColor: theme.colors.background, // Ważne, aby zakryć listę pod spodem!
                        opacity: skeletonOpacity, // Kontrolujemy przezroczystość
                      },
                    ]}
                    // Wyłącza interakcję z nakładką, gdy jest niewidoczna
                    pointerEvents="none"
                  >
                    <ListSkeleton />
                  </Animated.View>
                )}
              </View>
            )}
            {/* "Save and Continue" Button */}
            {!fromTab && (
              <Animated.View
                style={[
                  styles.footer,
                  {
                    opacity: fadeAnim,
                    transform: [
                      {
                        translateY: fadeAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [moderateScale(50), 0],
                        }),
                      },
                    ],
                    bottom: isSearchFocused
                      ? -SAVE_BUTTON_MARGIN_BOTTOM - moderateScale(5) // <--- ZMIANA
                      : 0,
                  },
                ]}
              >
                <Pressable
                  onPress={() => {
                    // <<< ZMIANA: Przycisk "Continue" najpierw zapisuje, potem nawiguje
                    handleSaveRef.current();
                    router.replace("/");
                  }}
                  style={[
                    styles.saveButton,
                    { backgroundColor: theme.colors.primary },
                  ]}
                >
                  <Text
                    style={[
                      styles.saveButtonText,
                      { color: theme.colors.onPrimary },
                    ]}
                  >
                    {mode === "visited" ? "Continue" : "Save Wishlist"}
                  </Text>
                </Pressable>
              </Animated.View>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = ScaledSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 0,
  },
  countryItemOuterContainer: {
    width: "100%",
    // paddingVertical: 2,
  },
  countryItemInnerContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: ITEM_HEIGHT, // Używamy skalowalnej stałej
    paddingHorizontal: "7.5@s",
    borderRadius: "4.2@ms",
  },
  containerFromTab: {
    marginTop: "-5@mvs",
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  containerStandalone: {
    paddingTop: "30@mvs",
  },
  navigableArea: {
    // Styl dla klikalnego obszaru flagi i nazwy
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: "5@mvs",
  },
  searchAndToggleContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: "9@s", // Ten margines jest teraz poprawny, bo jest wewnątrz nagłówka
    marginBottom: "2@mvs",
    marginTop: "8.3@mvs",
  },
  inputContainer: {
    // szerokość i wysokość są zależne od ekranu, to jest OK
    borderRadius: "28@ms",
    borderWidth: 1.5,
    borderColor: "#ccc",
    flexDirection: "row",
    alignItems: "center",
    height: "44@mvs0.8", // Można zostawić procentowe lub zamienić na '50@mvs0.8'
    flex: 1,
    position: "relative",
  },
  // countryItemContainer: {
  //   // To jest główny kontener, który ma flex i border
  //   width: "100%",
  //   flexDirection: "row",
  //   alignItems: "center",
  //   height: 50,
  //   paddingHorizontal: 8,
  //   borderBottomWidth: 0.5,
  //   borderBottomColor: "#ccc",
  // },
  iconRight: {
    marginRight: "-10@s",
  },
  toggleButton: {
    width: "44@mvs0.8",
    height: "44@mvs0.8",
    borderRadius: "22@mvs0.8",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: "6.5@s",
  },
  inputFocused: {
    borderColor: "#6a1b9a", // Purple color when focused
  },
  input: {
    flex: 1,
    height: "50@mvs",
    fontSize: "13.85@ms0.4",
    backgroundColor: "transparent",
    borderRadius: 0,
    paddingLeft: "31@s",
    color: "black",
  },
  searchIcon: {
    // Styl dla naszej ikony
    position: "absolute",
    left: "15@s", // Odległość ikony od lewej krawędzi
    // WAŻNE: zIndex zapewnia, że ikona jest "nad" inputem, jeśli wystąpią problemy
    zIndex: 1,
  },
  iconLeft: {
    marginLeft: "13.4@s",
    marginRight: "-5.4@s",
  },
  // countryItemContent: {
  //   // Nowy styl dla zawartości
  //   flexDirection: "row",
  //   alignItems: "center",
  //   height: 50,
  //   paddingHorizontal: 8,
  // },
  // countryItem: { // Stary styl, teraz używany w countryItemContainer
  //   // flexDirection, alignItems, height, paddingHorizontal - przeniesione do countryItemContent
  //   borderBottomWidth: 0.5,
  //   borderBottomColor: "#ccc",
  // },
  sectionHeader: {
    paddingVertical: "3.8@mvs",
    paddingHorizontal: "7.8@s",
    width: "100%",
    marginLeft: "6.8@s",
    marginTop: "6.8@mvs",
  },
  sectionHeaderText: {
    fontSize: "15.8@ms0.4",
    fontWeight: "600",
  },
  flagWithBorder: {
    borderWidth: 1, // Zostawiamy 1px
    borderRadius: "5@ms",
    overflow: "hidden",
  },
  // countryItem: {
  //   flexDirection: "row",
  //   alignItems: "center",
  //   height: 50,
  //   paddingHorizontal: 8,
  //   borderBottomWidth: 0.5,
  //   borderBottomColor: "#ccc",
  // },
  flagContainer: {
    marginRight: "9.8@s",
    width: "30@s",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: "6.8@s",
  },
  countryText: {
    fontSize: "15.8@ms0.4",
  },
  roundCheckbox: {
    width: "19.8@ms",
    height: "19.8@ms",
    borderRadius: "10@ms",
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginRight: "6.8@s",
  },

  emptyContainer: {
    padding: "15.8@ms",
    alignItems: "center",
  },
  emptyText: {
    fontSize: "15.8@ms0.4",
    color: "#666",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    backgroundColor: "transparent",
    zIndex: 100,
  },
  saveButton: {
    paddingVertical: "10.8@mvs",
    paddingHorizontal: "29.8@s",
    alignItems: "center",
    borderRadius: "25@ms",
    width: "80%",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    marginBottom: SAVE_BUTTON_MARGIN_BOTTOM, // Używamy skalowalnej stałej
  },
  saveButtonDisabled: {
    backgroundColor: "rgba(117, 17, 181, 0.25)",
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: "15.8@ms0.4",
    fontWeight: "bold",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "80%", // Procent jest OK
    padding: "19.8@ms",
    borderRadius: "20@ms",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: "17.8@ms0.4",
    fontWeight: "bold",
    marginBottom: "9.8@mvs",
  },
  modalText: {
    fontSize: "15.8@ms0.4",
    textAlign: "center",
    marginBottom: "19.8@mvs",
  },
  modalButton: {
    paddingVertical: "9.8@mvs",
    paddingHorizontal: "19.8@s",
    borderRadius: "19.8@ms",
  },
  modalButtonText: {
    fontSize: "15.8@ms0.4",
    fontWeight: "bold",
  },
});
