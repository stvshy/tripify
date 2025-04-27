import React, {
  useState,
  useMemo,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from "react";
import {
  View,
  Text,
  SectionList,
  StyleSheet,
  Dimensions,
  Platform,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  Animated,
} from "react-native";
import { useTheme } from "react-native-paper";
import { FontAwesome, MaterialIcons, Ionicons } from "@expo/vector-icons";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { router, Stack, useRouter } from "expo-router";
import { auth, db } from "../../config/firebaseConfig";
import CountryFlag from "react-native-country-flag";
import { ThemeContext } from "../../config/ThemeContext";
import filteredCountriesData from "../../../components/filteredCountries.json";
import { useCountries } from "../../config/CountryContext";
import { SharedValue, useSharedValue } from "react-native-reanimated";

const { width, height } = Dimensions.get("window");

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
  path: string;
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
const totalCountries = filteredCountriesData.countries.length;
// CountryItem component
const CountryItem = React.memo(function CountryItem({
  item,
  onRemove,
  isDeleteVisible,
  onLongPress,
}: {
  item: Country;
  onRemove: (countryCode: string) => void;
  isDeleteVisible: boolean;
  onLongPress: (countryCode: string) => void;
}) {
  const theme = useTheme();
  const scaleValue = useRef(new Animated.Value(1)).current;

  const handleLongPress = useCallback(() => {
    onLongPress(item.cca2);
  }, [onLongPress, item.cca2]);

  const handleRemovePress = useCallback(() => {
    Animated.sequence([
      Animated.timing(scaleValue, {
        toValue: 0.8,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(scaleValue, {
        toValue: 1,
        duration: 80,
        useNativeDriver: true,
      }),
    ]).start();

    Alert.alert(
      "Remove Country",
      `Are you sure you want to remove ${item.name} from your visited countries?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            onRemove(item.cca2);
          },
        },
      ]
    );
  }, [scaleValue, onRemove, item.cca2, item.name]);

  const handleNavigateToCountry = useCallback(() => {
    router.push(`/country/${item.id}`);
  }, [router, item.id]);

  // Dynamic colors based on the theme
  const flagBorderColor = theme.colors.outline;

  return (
    <TouchableOpacity
      onPress={handleNavigateToCountry}
      onLongPress={handleLongPress}
      style={styles.countryItemContainer}
      activeOpacity={0.7}
      delayLongPress={300}
    >
      <View
        style={[
          styles.countryItem,
          {
            backgroundColor: theme.colors.surface,
            borderRadius: 8,
          },
        ]}
      >
        {/* FLAGA */}
        <View
          style={[
            styles.flagContainer,
            styles.flagWithBorder,
            { borderColor: flagBorderColor },
          ]}
        >
          <CountryFlag isoCode={item.cca2} size={25} />
        </View>

        {/* NAZWA */}
        <View style={{ marginLeft: 5 }}>
          <Text style={[styles.countryText, { color: theme.colors.onSurface }]}>
            {item.name}
          </Text>
        </View>

        {/* SPACER */}
        <View style={{ flex: 1 }} />

        {/* DELETE ICON */}
        {isDeleteVisible && (
          <Animated.View
            style={{
              transform: [{ scale: scaleValue }],
            }}
          >
            <TouchableOpacity
              onPress={handleRemovePress}
              style={styles.deleteButton}
            >
              <FontAwesome name="trash" size={20} color="#FF3B30" />
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>
    </TouchableOpacity>
  );
});

export default function ChooseVisitedCountriesScreen() {
  // ─── 1. HOOKS I STANY ───────────────────────────────────────────
  const router = useRouter();
  const { toggleTheme, isDarkTheme } = useContext(ThemeContext);
  const theme = useTheme();
  const scaleValue = useSharedValue(1) as SharedValue<number>;
  const { setVisitedCountries } = useCountries();

  const [visitedCountriesData, setVisitedCountriesData] = useState<string[]>(
    []
  );
  const [selectedCountryCode, setSelectedCountryCode] = useState<string | null>(
    null
  );

  // ─── 2. FETCH DATA ─────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const user = auth.currentUser;
      if (!user) return;
      const docRef = doc(db, "users", user.uid);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const arr = snap.data().countriesVisited || [];
        setVisitedCountriesData(arr);
        setVisitedCountries(arr);
      }
    })();
  }, [setVisitedCountries]);

  // ─── 3. CALLBACKI ────────────────────────────────────────────
  const handleGoBack = useCallback(() => router.back(), [router]);
  const handleToggleTheme = useCallback(() => {
    // animacja przed przełączeniem
    scaleValue.value = 0.9;
    setTimeout(() => {
      scaleValue.value = 1;
      toggleTheme();
    }, 100);
  }, [scaleValue, toggleTheme]);

  const handleLongPress = useCallback((code: string) => {
    setSelectedCountryCode(code);
  }, []);

  const handleRemoveCountry = useCallback(
    async (code: string) => {
      Alert.alert("Remove Country", "Are you sure?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            const updated = visitedCountriesData.filter((c) => c !== code);
            setVisitedCountriesData(updated);
            setVisitedCountries(updated);
            setSelectedCountryCode(null);
            const user = auth.currentUser;
            if (user)
              await updateDoc(doc(db, "users", user.uid), {
                countriesVisited: updated,
              });
          },
        },
      ]);
    },
    [visitedCountriesData, setVisitedCountries]
  );

  // ─── 4. PRZYGOTOWANIE DANYCH DO LISTY ────────────────────────
  const processedCountries = useMemo(() => {
    const objs = filteredCountriesData.countries.filter((c: Country) =>
      visitedCountriesData.includes(c.cca2)
    );
    const grouped: Record<string, Country[]> = {};
    objs.forEach((c) => {
      const continent = getContinent(c.region, c.subregion);
      (grouped[continent] ||= []).push(c);
    });
    return Object.entries(grouped)
      .map(([title, data]) => ({ title, data }))
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [visitedCountriesData]);

  // ─── 5. RENDERY ───────────────────────────────────────────────
  const renderCountryItem = useCallback(
    ({ item }: { item: Country }) => (
      <CountryItem
        item={item}
        onRemove={handleRemoveCountry}
        isDeleteVisible={selectedCountryCode === item.cca2}
        onLongPress={handleLongPress}
      />
    ),
    [handleRemoveCountry, selectedCountryCode, handleLongPress]
  );

  const renderSectionHeader = useCallback(
    ({ section: { title } }: { section: { title: string } }) => (
      <View
        style={[
          styles.sectionHeader,
          { backgroundColor: theme.colors.surface },
        ]}
      >
        <Text
          style={[styles.sectionHeaderText, { color: theme.colors.primary }]}
        >
          {title}
        </Text>
      </View>
    ),
    [theme.colors.surface, theme.colors.primary]
  );

  // ─── 6. JSX ───────────────────────────────────────────────────
  return (
    <>
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <TouchableOpacity
          style={styles.containerTouchable}
          activeOpacity={1}
          onPress={() => setSelectedCountryCode(null)}
        >
          <View style={styles.instructionContainer}>
            <Text
              style={[
                styles.instructionText,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              Long-press to remove a country
            </Text>
          </View>

          <SectionList
            sections={processedCountries}
            keyExtractor={(item) => item.cca3}
            renderItem={renderCountryItem}
            renderSectionHeader={renderSectionHeader}
            contentContainerStyle={{ paddingBottom: 20 }}
            ListEmptyComponent={() => (
              <View style={styles.emptyContainer}>
                <Text
                  style={[
                    styles.emptyText,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  You haven’t visited any countries yet.
                </Text>
              </View>
            )}
          />
        </TouchableOpacity>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 0,
    paddingTop: Platform.OS === "ios" ? 0 : 30,
  },
  containerTouchable: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    flex: 1,
    textAlign: "center",
  },
  toggleButton: {
    width: height * 0.0615,
    height: height * 0.0615,
    borderRadius: (height * 0.0615) / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  instructionContainer: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  instructionText: {
    fontSize: 14,
    fontStyle: "italic",
  },
  countryItemContainer: {
    width: "100%",
    backgroundColor: "transparent",
  },
  sectionHeader: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    width: "100%",
    marginLeft: 7,
    marginTop: 7,
  },
  headerLeftContainer: {},
  sectionHeaderText: {
    fontSize: 16,
    fontWeight: "600",
  },
  flagWithBorder: {
    borderWidth: 1,
    borderRadius: 5,
    overflow: "hidden",
  },
  countryItem: {
    flexDirection: "row",
    alignItems: "center",
    height: 50,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: "#ccc",
  },
  flagContainer: {
    marginRight: 10,
    width: 30,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 7,
  },
  countryText: {
    fontSize: 16,
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 7,
  },
  emptyContainer: {
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  emptyText: {
    fontSize: 16,
  },
});
