import React, {
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  Animated,
  ScrollView,
  TouchableWithoutFeedback,
  LayoutAnimation,
  Platform,
  FlatList,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { ThemeContext } from "../config/ThemeContext";
import { useTheme } from "react-native-paper";
import { getDoc, doc, updateDoc, onSnapshot } from "firebase/firestore";
import { db, auth } from "../config/firebaseConfig";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import countriesData from "../../assets/maps/countries.json";
import CountryFlag from "react-native-country-flag";
import DraggableFlatList, {
  RenderItemParams,
  DragEndParams,
} from "react-native-draggable-flatlist";

interface Country {
  id: string;
  cca2: string;
  name: string;
  // Add other fields as necessary
}

interface RankingSlot {
  id: string;
  rank: number;
  country: Country | null;
}

const removeDuplicates = (countries: Country[]): Country[] => {
  const unique = new Map<string, Country>();
  countries.forEach((c) => {
    unique.set(c.id, c); // Użyj `c.id` jako klucza, zakładając, że jest unikalne
  });
  return Array.from(unique.values());
};

// Funkcja generująca unikalne id
const generateUniqueId = () =>
  `rank-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export default function RankingScreen() {
  const { isDarkTheme, toggleTheme } = useContext(ThemeContext);
  const theme = useTheme();
  const router = useRouter();
  const [countriesVisited, setCountriesVisited] = useState<Country[]>([]);
  const [rankingSlots, setRankingSlots] = useState<RankingSlot[]>([]);
  const [activeRankingItemId, setActiveRankingItemId] = useState<string | null>(
    null
  ); // Nowy stan

  const { width, height } = Dimensions.get("window");
  // Colors for cohesive ranking container & dividers
  const outerBorderColor = isDarkTheme ? "#262626" : "#E0E0E0";
  const dividerColor = isDarkTheme ? "#333333" : "#F0F0F0";

  const mappedCountries: Country[] = useMemo(() => {
    return countriesData.countries.map((country) => ({
      ...country,
      cca2: country.id,
      flag: `https://flagcdn.com/w40/${country.id.toLowerCase()}.png`,
    }));
  }, []);

  // 1. Zamiast definiować wewnątrz useEffect, deklarujemy tutaj:
  const fetchUserData = useCallback(async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const userDocRef = doc(db, "users", currentUser.uid);
    const userDoc = await getDoc(userDocRef);
    if (!userDoc.exists()) return;
    const userData = userDoc.data();

    const visitedCodes: string[] = userData.countriesVisited || [];
    const rankingRaw: string[] = userData.ranking || [];

    // filtrujemy ranking tak, aby zostawić tylko te kody, które są w visitedCodes
    const rankingFiltered = rankingRaw.filter((code) =>
      visitedCodes.includes(code)
    );

    // budujemy countriesVisited bez tych, co w rankingu
    const visited = mappedCountries.filter(
      (c) => visitedCodes.includes(c.cca2) && !rankingFiltered.includes(c.cca2)
    );
    setCountriesVisited(removeDuplicates(visited));

    // budujemy rankingSlots z przefiltrowanego rankingFiltered
    setRankingSlots(
      rankingFiltered.map((cca2, idx) => ({
        id: generateUniqueId(),
        rank: idx + 1,
        country: mappedCountries.find((c) => c.cca2 === cca2) || null,
      }))
    );
  }, [mappedCountries]);

  // 2) wywołujemy przy mount
  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  // 3) i przy każdym powrocie na ekran
  useFocusEffect(
    useCallback(() => {
      fetchUserData();
    }, [fetchUserData])
  );

  const handleGoBack = () => {
    router.back();
  };

  const handleSaveRanking = async (newRankingSlots: RankingSlot[]) => {
    const ranking = newRankingSlots
      .filter((slot) => slot.country !== null)
      .map((slot) => slot.country!.cca2);
    const currentUser = auth.currentUser;
    if (currentUser) {
      const userDocRef = doc(db, "users", currentUser.uid);
      await updateDoc(userDocRef, { ranking: ranking });
    }
  };

  const handleDragEnd = ({ data }: DragEndParams<RankingSlot>) => {
    const updatedSlots = data.map((item, index) => ({
      ...item,
      rank: index + 1,
    }));
    setRankingSlots(updatedSlots);
    handleSaveRanking(updatedSlots);
    // Nie resetujemy tutaj aktywnego elementu, aby dłużej utrzymać widoczność przycisku usuwania.
  };

  const handleRemoveFromRanking = (index: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const slot = rankingSlots[index];
    if (slot.country) {
      setCountriesVisited((prev) => {
        // Sprawdź, czy kraj już istnieje w `countriesVisited`
        if (!prev.some((c) => c.id === slot.country!.id)) {
          return [...prev, slot.country!];
        }
        return prev;
      });
      const updatedSlots = [...rankingSlots];
      updatedSlots.splice(index, 1); // Usunięcie slotu
      // Zaktualizuj rangi
      const reRankedSlots = updatedSlots.map((item, idx) => ({
        ...item,
        rank: idx + 1,
      }));
      setRankingSlots(reRankedSlots);
      handleSaveRanking(reRankedSlots);
      setActiveRankingItemId(null); // Resetowanie aktywnego elementu
    }
  };

  const renderRankingItem = ({
    item,
    getIndex,
    drag,
    isActive,
  }: RenderItemParams<RankingSlot>) => {
    const index = getIndex(); // Pobranie indeksu za pomocą getIndex()
    const removeAnim = useRef(new Animated.Value(0)).current; // Animacja dla przycisku "x"

    useEffect(() => {
      if (activeRankingItemId === item.id) {
        Animated.timing(removeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      } else {
        Animated.timing(removeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }
    }, [activeRankingItemId, item.id, removeAnim]);

    const removeOpacity = removeAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    });

    const removeScale = removeAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.5, 1],
    });

    return (
      <TouchableOpacity
        style={[
          styles.rankingSlot,
          {
            backgroundColor:
              isActive || activeRankingItemId === item.id
                ? isDarkTheme
                  ? "#333333"
                  : "#e9e9e9"
                : theme.colors.surface,
          },
        ]}
        onLongPress={() => setActiveRankingItemId(item.id)}
        delayLongPress={300}
        disabled={!item.country}
        activeOpacity={0.8}
      >
        <View style={styles.slotContent}>
          <Text
            style={[
              styles.rankNumber,
              { color: theme.colors.onSurface, fontSize: 20 },
            ]}
          >
            {item.rank}.
          </Text>
          {item.country ? (
            <View style={styles.countryInfoContainer}>
              <CountryFlag
                isoCode={item.country.cca2}
                size={22}
                style={styles.flag}
              />
              <Text
                style={[
                  styles.countryNameText,
                  { color: theme.colors.onSurface, marginLeft: 8 },
                ]}
              >
                {item.country.name}
              </Text>
            </View>
          ) : (
            <Text
              style={{
                color: theme.colors.onSurface,
                fontStyle: "italic",
                fontSize: 12,
              }}
            >
              Drop Here
            </Text>
          )}
        </View>
        <View style={styles.actionContainer}>
          {/* Animowany przycisk "x" */}
          <Animated.View
            style={{
              opacity: removeOpacity,
              transform: [{ scale: removeScale }],
            }}
          >
            {activeRankingItemId === item.id && (
              <TouchableOpacity
                onPress={() =>
                  index !== undefined ? handleRemoveFromRanking(index) : null
                }
                style={styles.removeButton}
              >
                <Ionicons name="close-circle" size={24} color="red" />
              </TouchableOpacity>
            )}
          </Animated.View>
          <TouchableOpacity
            style={styles.dragHandle}
            hitSlop={{ top: 16, bottom: 16, left: 6, right: 16 }}
            onPressIn={() => {
              setActiveRankingItemId(null); // Resetowanie aktywnego elementu podczas przeciągania
              drag();
            }}
          >
            <Ionicons
              name="reorder-three"
              size={24}
              color={theme.colors.onSurface}
            />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const handleAddToRanking = (country: Country) => {
    // Opcjonalnie: Zapobiegaj dodawaniu tego samego kraju więcej niż raz
    if (rankingSlots.some((slot) => slot.country?.cca2 === country.cca2)) {
      Alert.alert(
        "Duplicate Entry",
        `${country.name} is already in the ranking.`
      );
      return;
    }

    const newSlot: RankingSlot = {
      id: generateUniqueId(), // Użyj unikalnego id
      rank: rankingSlots.length + 1,
      country: country,
    };

    const updatedSlots = [...rankingSlots, newSlot];
    setRankingSlots(updatedSlots);
    handleSaveRanking(updatedSlots);
    // Usuń kraj z listy "Visited Countries" i upewnij się, że nie ma duplikatów
    setCountriesVisited((prev) =>
      removeDuplicates(prev.filter((c) => c.id !== country.id))
    );
    setActiveRankingItemId(null); // Resetowanie aktywnego elementu po dodaniu
  };

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      {/* Header aligned with Friend Requests style */}
      <View
        style={[
          styles.header,
          {
            paddingTop: height * 0.0238,
            paddingBottom: 10,
            marginHorizontal: -4.5,
          },
        ]}
      >
        <TouchableOpacity
          onPress={handleGoBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={{ padding: 8, marginLeft: -10 }}
        >
          <MaterialIcons
            name="arrow-back-ios"
            size={21}
            color={theme.colors.onBackground}
            style={{ marginTop: -0.2 }}
          />
        </TouchableOpacity>
        <Text
          style={{
            fontSize: 19.5,
            fontWeight: "600",
            fontFamily: "Figtree-Regular",
            color: theme.colors.onBackground,
          }}
        >
          Rank Countries
        </Text>
        <TouchableOpacity
          onPress={toggleTheme}
          style={{ padding: 6, marginRight: -10 }}
        >
          <Ionicons
            name={isDarkTheme ? "sunny" : "moon"}
            size={24}
            color={theme.colors.onBackground}
          />
        </TouchableOpacity>
      </View>

      {/* Visited Countries */}
      {countriesVisited.length > 0 && (
        <View style={[styles.visitedContainer, { marginTop: 5 }]}>
          <Text
            style={[
              styles.sectionTitle,
              {
                color: theme.colors.onBackground,
                marginLeft: 4,
                paddingBottom: -1,
              },
            ]}
          >
            Visited Countries
          </Text>
          <FlatList
            data={countriesVisited}
            keyExtractor={(country) => `visited-${country.id}`}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.visitedScrollContainer}
            renderItem={({ item }) => (
              <View
                key={`visited-${item.id}`}
                style={[
                  styles.visitedItemContainer,
                  {
                    backgroundColor: isDarkTheme
                      ? "#171717"
                      : theme.colors.surface,
                    borderColor: isDarkTheme ? "#1f1f1f" : "#e0e0e0",
                  },
                ]}
              >
                <CountryFlag
                  isoCode={item.cca2}
                  size={24}
                  style={styles.flag}
                />
                <Text
                  style={[
                    styles.visitedItemText,
                    {
                      color: isDarkTheme ? "#fff" : theme.colors.onSurface,
                      marginLeft: 6,
                    },
                  ]}
                >
                  {item.name}
                </Text>
                <TouchableOpacity
                  onPress={() => handleAddToRanking(item)}
                  style={styles.addButtonIcon}
                >
                  <Ionicons name="add-circle" size={23} color="green" />
                </TouchableOpacity>
              </View>
            )}
          />
        </View>
      )}

      {/* Ranking */}
      <View
        style={[
          styles.rankingContainer,
          {
            marginTop:
              countriesVisited.length > 0 ? height * 0.012 : height * 0.012,
            flex: 1,
          },
        ]}
      >
        <Text
          style={[styles.sectionTitle, { color: theme.colors.onBackground }]}
        >
          Ranking
        </Text>
        <View
          style={[
            styles.rankingListWrapper,
            {
              backgroundColor: theme.colors.surface,
              borderColor: outerBorderColor,
            },
          ]}
        >
          <DraggableFlatList
            data={rankingSlots}
            keyExtractor={(item) => item.id}
            renderItem={renderRankingItem}
            onDragEnd={handleDragEnd}
            activationDistance={0} // Wyłącz przypadkową aktywację drag przy minimalnym ruchu; przeciąganie tylko przez uchwyt
            onDragBegin={() => setActiveRankingItemId(null)} // Na wszelki wypadek wyczyść stan aktywnego elementu przy starcie drag
            scrollEnabled={true}
            showsVerticalScrollIndicator={true}
            ItemSeparatorComponent={() => (
              <View style={{ height: 1, backgroundColor: dividerColor }} />
            )}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 50,
    flex: 1, // Zajmuje całą przestrzeń
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 10, // Zmniejszenie paddingu poziomego
  },
  headerButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20, // Zwiększony rozmiar fontu
    fontWeight: "700",
  },
  sectionTitle: {
    fontSize: 17.2, // Zwiększenie rozmiaru fontu
    marginBottom: 10, // Zwiększenie marginesu
    // fontWeight: "600",
    fontFamily: "PlusJakartaSans-Bold",
    marginLeft: 1,
  },
  visitedContainer: {
    // marginBottom: 5, // Zachowany margines dolny
    marginLeft: -4,
    marginRight: -4,
  },
  visitedScrollContainer: {
    flexDirection: "row",
    // flexWrap: 'wrap',
    alignItems: "center",
    paddingTop: 1,
    paddingBottom: 1,
  },
  visitedItemContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginLeft: 4,
    marginRight: 4,
    borderRadius: 8, // Zwiększenie promienia
    borderWidth: 1,
    // Switch to border styling to match app style; avoid heavy shadows
    elevation: 0,
  },
  visitedItemText: {
    fontSize: 14, // Zwiększenie rozmiaru fontu
    // fontWeight: "600",
    fontFamily: "Figtree-SemiBold",
  },
  addButtonIcon: {
    marginLeft: 10, // Zwiększenie marginesu
    marginRight: -3,
  },
  rankingContainer: {
    marginBottom: -13, // Zachowany margines dolny
    flex: 1, // Pozwól na rozciąganie
  },
  rankingListWrapper: {
    borderWidth: 1,
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 10,
  },
  rankingSlot: {
    flexDirection: "row", // Ustawienie elementów w wierszu
    alignItems: "center",
    paddingVertical: 3,
    paddingHorizontal: 12,
    marginBottom: 0,
    borderRadius: 0,
    borderWidth: 0,
    justifyContent: "space-between", // Rozłożenie przestrzeni między elementami
    backgroundColor: "#fff",
    // Remove heavy shadows; use borders for consistency
    elevation: 0,
    maxWidth: "100%", // Opcjonalnie: Ustawienie maksymalnej szerokości
  },
  slotContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1, // Pozwól na rozciąganie
  },
  rankNumber: {
    fontSize: 15.5,
    marginRight: 12, // Zwiększenie marginesu
    // fontWeight: "bold",
    fontFamily: "Figtree-SemiBold",
  },
  countryInfoContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  flag: {
    width: 22,
    height: 16,
    borderRadius: 2,
  },
  countryNameText: {
    fontFamily: "Figtree-SemiBold",
    fontSize: 15.5,
  },
  actionContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  removeButton: {
    marginRight: 8, // Zwiększenie marginesu po prawej stronie
  },
  dragHandle: {
    padding: 10, // Większy obszar dotyku
    marginLeft: 4, // Zmniejszenie marginesu
  },
});
