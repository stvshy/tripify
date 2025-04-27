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
  Modal,
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
  onRequestRemove,
  isDeleteVisible,
  onLongPress,
}: {
  item: Country;
  onRequestRemove: (countryCode: string) => void;
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
        duration: 160,
        useNativeDriver: true,
      }),
      Animated.timing(scaleValue, {
        toValue: 1,
        duration: 160,
        useNativeDriver: true,
      }),
    ]).start();

    onRequestRemove(item.cca2); // <<< ZMIANA: wywołanie onRequestRemove
  }, [scaleValue, onRequestRemove, item.cca2]);

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
              <FontAwesome name="trash" size={20} color="#c0103d" />
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
  const [removeModalVisible, setRemoveModalVisible] = useState(false);
  const [countryToRemove, setCountryToRemove] = useState<string | null>(null);
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
  const handleLongPress = useCallback((code: string) => {
    setSelectedCountryCode(code);
  }, []);

  const requestRemoveCountry = useCallback((code: string) => {
    setCountryToRemove(code);
    setRemoveModalVisible(true);
  }, []);

  // <<< ZMIANA: usunięcie kraju po potwierdzeniu
  const confirmRemoveCountry = useCallback(async () => {
    if (!countryToRemove) return;
    const updated = visitedCountriesData.filter((c) => c !== countryToRemove);
    setVisitedCountriesData(updated);
    setVisitedCountries(updated);
    setSelectedCountryCode(null); // Deselect after removal
    setRemoveModalVisible(false); // Close modal
    const user = auth.currentUser;
    if (user) {
      try {
        await updateDoc(doc(db, "users", user.uid), {
          countriesVisited: updated,
        });
      } catch (error) {
        console.error("Error updating visited countries:", error);
        Alert.alert("Error", "Could not update your visited countries list.");
        // Optionally revert state if update fails
      }
    }
    setCountryToRemove(null); // Clear state after operation
  }, [countryToRemove, visitedCountriesData, setVisitedCountries]);

  const cancelRemove = useCallback(() => {
    setRemoveModalVisible(false);
    setCountryToRemove(null); // Clear state on cancel
  }, []);

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
        onRequestRemove={requestRemoveCountry}
        isDeleteVisible={selectedCountryCode === item.cca2}
        onLongPress={handleLongPress}
      />
    ),
    [requestRemoveCountry, selectedCountryCode, handleLongPress]
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
          <Modal
            visible={removeModalVisible}
            transparent
            animationType="fade"
            onRequestClose={cancelRemove}
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
                  Remove country
                </Text>
                <Text
                  style={[styles.modalText, { color: theme.colors.onSurface }]}
                >
                  Are you sure you want to remove this country from your visited
                  list?
                </Text>
                <View style={{ flexDirection: "row", marginTop: 10 }}>
                  <TouchableOpacity
                    onPress={cancelRemove}
                    style={[
                      styles.modalButtonCancel,
                      {
                        backgroundColor: isDarkTheme ? "#dbc9f2" : "#f5e9fc",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.modalButtonText,
                        { color: theme.colors.primary },
                      ]}
                    >
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={confirmRemoveCountry}
                    style={[
                      styles.modalButton,
                      { backgroundColor: theme.colors.primary, marginLeft: 10 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.modalButtonText,
                        { color: theme.colors.onPrimary },
                      ]}
                    >
                      Remove
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </TouchableOpacity>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 0,
    // paddingTop: Platform.OS === "ios" ? 0 : 30,
  },
  containerTouchable: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  toggleButton: {
    width: height * 0.0615,
    height: height * 0.0615,
    borderRadius: (height * 0.0615) / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  countryItemContainer: {
    width: "100%",
    backgroundColor: "transparent",
  },
  sectionHeader: {
    // paddingVertical: 4,
    paddingHorizontal: 8,
    width: "100%",
    marginLeft: 7,
    marginTop: 7,
    paddingTop: 4,
    paddingBottom: 0,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: width * 0.8,
    padding: 20,
    borderRadius: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  modalText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  modalButtonCancel: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 0.19,
    borderColor: "#9d23ea",
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: "bold",
  },
});
