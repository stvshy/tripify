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
import { FontAwesome, MaterialIcons } from "@expo/vector-icons";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { router } from "expo-router";
import { auth, db } from "../config/firebaseConfig";
import CountryFlag from "react-native-country-flag";
import { ThemeContext } from "../config/ThemeContext";
import filteredCountriesData from "../../components/filteredCountries.json";
import { useCountries } from "../config/CountryContext";

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
  const [visitedCountriesData, setVisitedCountriesData] = useState<string[]>(
    []
  );
  const [selectedCountryCode, setSelectedCountryCode] = useState<string | null>(
    null
  );
  const { toggleTheme, isDarkTheme } = useContext(ThemeContext);
  const theme = useTheme();
  const scaleValue = useRef(new Animated.Value(1)).current;
  const { visitedCountries, setVisitedCountries } = useCountries();
  const sectionListRef = useRef(null);

  useEffect(() => {
    // Fetch saved countriesVisited from Firestore
    const fetchVisitedCountries = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          const userDocRef = doc(db, "users", user.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const countriesVisited: string[] = userData?.countriesVisited || [];
            setVisitedCountriesData(countriesVisited);
            setVisitedCountries(countriesVisited); // Synchronize with context
          }
        } catch (error) {
          console.error("Error fetching visited countries:", error);
        }
      }
    };

    fetchVisitedCountries();
  }, [setVisitedCountries]);

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

  const handleLongPress = useCallback((countryCode: string) => {
    setSelectedCountryCode(countryCode);
  }, []);

  // Handle touch on main container to clear selection
  const handleContainerPress = useCallback(() => {
    if (selectedCountryCode) {
      setSelectedCountryCode(null);
    }
  }, [selectedCountryCode]);

  const handleRemoveCountry = useCallback(
    async (countryCode: string) => {
      const updatedCountries = visitedCountriesData.filter(
        (c) => c !== countryCode
      );
      setVisitedCountriesData(updatedCountries);
      setVisitedCountries(updatedCountries); // Update context
      setSelectedCountryCode(null); // Clear selection after removal

      // Update Firestore
      const user = auth.currentUser;
      if (user) {
        try {
          const userDocRef = doc(db, "users", user.uid);
          await updateDoc(userDocRef, {
            countriesVisited: updatedCountries,
          });
          console.log("Visited countries updated:", updatedCountries);
        } catch (error) {
          console.error("Error updating visited countries:", error);
          Alert.alert(
            "Error",
            "Failed to update visited countries. Please try again."
          );
        }
      }
    },
    [visitedCountriesData, setVisitedCountries]
  );

  // Processing country data
  const processedCountries = useMemo(() => {
    // Filter to only include visited countries
    const visitedCountriesObjects = filteredCountriesData.countries.filter(
      (country: Country) => visitedCountriesData.includes(country.cca2)
    );

    // Group by continent
    const grouped = visitedCountriesObjects.reduce(
      (acc: { [key in Continent]?: Country[] }, country: Country) => {
        const continent = getContinent(country.region, country.subregion);
        if (!acc[continent]) {
          acc[continent] = [];
        }
        acc[continent]!.push(country);
        return acc;
      },
      {} as { [key in Continent]?: Country[] }
    );

    // Create sections array
    const sections: { title: string; data: Country[] }[] = Object.keys(grouped)
      .map((continent) => ({
        title: continent,
        data: grouped[continent as Continent]!.sort((a: Country, b: Country) =>
          a.name.localeCompare(b.name)
        ),
      }))
      .sort((a, b) => a.title.localeCompare(b.title));

    return sections;
  }, [visitedCountriesData]);

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
    ({ section }: { section: { title: string } }) => (
      <View
        style={[
          styles.sectionHeader,
          { backgroundColor: theme.colors.surface },
        ]}
      >
        <Text
          style={[styles.sectionHeaderText, { color: theme.colors.primary }]}
        >
          {section.title}
        </Text>
      </View>
    ),
    [theme.colors.surface, theme.colors.primary]
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <TouchableOpacity
        activeOpacity={1}
        style={styles.containerTouchable}
        onPress={handleContainerPress}
      >
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.colors.onSurface }]}>
            Visited Countries
          </Text>
          {/* Round Button to Toggle Theme */}
          <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
            <TouchableOpacity
              onPress={handleToggleTheme}
              style={[
                styles.toggleButton,
                { backgroundColor: theme.colors.primary },
              ]}
            >
              {isDarkTheme ? (
                <MaterialIcons
                  name="dark-mode"
                  size={24}
                  color={theme.colors.onPrimary}
                />
              ) : (
                <MaterialIcons
                  name="light-mode"
                  size={24}
                  color={theme.colors.onPrimary}
                />
              )}
            </TouchableOpacity>
          </Animated.View>
        </View>

        <View style={styles.instructionContainer}>
          <Text
            style={[
              styles.instructionText,
              { color: theme.colors.onSurfaceVariant },
            ]}
          >
            Long press on a country to remove it from your visited countries
            list
          </Text>
        </View>

        {/* Country List */}
        <View style={{ flex: 1 }}>
          <SectionList
            ref={sectionListRef}
            sections={processedCountries}
            keyExtractor={(item) => item.cca3}
            renderItem={renderCountryItem}
            renderSectionHeader={renderSectionHeader}
            stickySectionHeadersEnabled={false}
            contentContainerStyle={{
              flexGrow: 1,
              paddingBottom: 20,
            }}
            ListEmptyComponent={() => (
              <View style={styles.emptyContainer}>
                <Text
                  style={[
                    styles.emptyText,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  You haven't visited any countries yet.
                </Text>
              </View>
            )}
          />
        </View>
      </TouchableOpacity>
    </SafeAreaView>
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
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
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
