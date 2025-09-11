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
import { storage } from "../config/storage";
import ConfirmationModal from "../../components/ConfirmationModal";

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
  const [countriesVisited, setCountriesVisited] = useState<Country[]>(() => {
    // Instant hydrate visited countries from cache (minus any cached ranking)
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return [];
      const rawVisited = storage.getString(`user:${uid}:visited`);
      if (!rawVisited) return [];
      let visitedCodes: string[] = [];
      try {
        visitedCodes = JSON.parse(rawVisited) || [];
      } catch {
        visitedCodes = [];
      }
      let rankingArr: string[] = [];
      try {
        const rawRanking = storage.getString(`user:${uid}:ranking`);
        rankingArr = rawRanking ? JSON.parse(rawRanking) : [];
      } catch {
        rankingArr = [];
      }
      const byId = new Map(countriesData.countries.map((c: any) => [c.id, c]));
      const visitedCountries = visitedCodes
        .filter((code) => !rankingArr.includes(code))
        .map((cca2) => {
          const base = byId.get(cca2);
          return base
            ? {
                ...base,
                cca2: base.id,
                flag: `https://flagcdn.com/w40/${base.id.toLowerCase()}.png`,
              }
            : null;
        })
        .filter(Boolean) as Country[];
      const unique = removeDuplicates(visitedCountries);
      unique.sort((a, b) => a.name.localeCompare(b.name));
      return unique;
    } catch {
      return [];
    }
  });
  const [rankingSlots, setRankingSlots] = useState<RankingSlot[]>(() => {
    // Instant hydrate from MMKV cache so the screen doesn't flash empty
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return [];
      const raw = storage.getString(`user:${uid}:ranking`);
      if (!raw) return [];
      const rankingArr: string[] = JSON.parse(raw);
      // Build a quick lookup from static countries data
      const byId = new Map(countriesData.countries.map((c: any) => [c.id, c]));
      return rankingArr.map((cca2, index) => {
        const base = byId.get(cca2);
        const country: Country | null = base
          ? {
              ...base,
              cca2: base.id,
              flag: `https://flagcdn.com/w40/${base.id.toLowerCase()}.png`,
            }
          : null;
        return { id: generateUniqueId(), rank: index + 1, country };
      });
    } catch {
      return [];
    }
  });
  const [activeRankingItemId, setActiveRankingItemId] = useState<string | null>(
    null
  ); // Nowy stan
  const [confirmAction, setConfirmAction] = useState<null | "addAll" | "clear">(
    null
  );

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
    const deduped = removeDuplicates(visited);
    deduped.sort((a, b) => a.name.localeCompare(b.name));
    setCountriesVisited(deduped);
    // Persist visited codes for instant next load
    try {
      storage.set(
        `user:${currentUser.uid}:visited`,
        JSON.stringify(visitedCodes)
      );
    } catch {}

    // budujemy rankingSlots z przefiltrowanego rankingFiltered
    // Zbuduj sloty tylko dla znanych krajów (usuń potencjalne puste rekordy)
    const slotsKnown = rankingFiltered
      .map((cca2) => {
        const country = mappedCountries.find((c) => c.cca2 === cca2) || null;
        return country
          ? ({ id: generateUniqueId(), rank: 0, country } as RankingSlot)
          : null;
      })
      .filter(Boolean) as RankingSlot[];
    const newSlots: RankingSlot[] = slotsKnown.map((s, idx) => ({
      ...s,
      rank: idx + 1,
    }));
    setRankingSlots(newSlots);
    // Keep cache in sync so next open is instant
    try {
      storage.set(
        `user:${currentUser.uid}:ranking`,
        JSON.stringify(rankingFiltered)
      );
    } catch {}
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
      // Optimistically update local cache for instant subsequent loads
      try {
        storage.set(`user:${currentUser.uid}:ranking`, JSON.stringify(ranking));
      } catch {}
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
        let next = prev;
        if (!prev.some((c) => c.id === slot.country!.id)) {
          next = [...prev, slot.country!];
        }
        // Always keep alphabetical order
        next = removeDuplicates(next)
          .slice()
          .sort((a, b) => a.name.localeCompare(b.name));
        // Persist visited cache for instant next load
        try {
          const uid = auth.currentUser?.uid;
          if (uid) {
            storage.set(
              `user:${uid}:visited`,
              JSON.stringify(next.map((c) => c.cca2))
            );
          }
        } catch {}
        return next;
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
      <View
        style={[
          styles.rankingSlot,
          {
            backgroundColor: isActive
              ? isDarkTheme
                ? "#333333"
                : "#e9e9e9"
              : theme.colors.surface,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.slotContent}
          onPress={() =>
            setActiveRankingItemId((prev) =>
              prev === item.id ? null : item.id
            )
          }
          onLongPress={drag}
          delayLongPress={250}
          disabled={isActive}
          activeOpacity={0.8}
        >
          {/** Wyświetl rank wg bieżącego indexu listy, aby uniknąć dziur w numeracji */}
          {(() => {
            const displayRank = index !== undefined ? index + 1 : item.rank;
            return (
              <Text
                style={[
                  styles.rankNumber,
                  { color: theme.colors.onSurface, fontSize: 20 },
                ]}
              >
                {displayRank}.
              </Text>
            );
          })()}
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
        </TouchableOpacity>
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
        </View>
      </View>
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
    setCountriesVisited((prev) => {
      const next = removeDuplicates(prev.filter((c) => c.id !== country.id));
      next.sort((a, b) => a.name.localeCompare(b.name));
      // Persist visited cache for instant next load
      try {
        const uid = auth.currentUser?.uid;
        if (uid) {
          storage.set(
            `user:${uid}:visited`,
            JSON.stringify(next.map((c) => c.cca2))
          );
        }
      } catch {}
      return next;
    });
    setActiveRankingItemId(null); // Resetowanie aktywnego elementu po dodaniu
  };

  const handleAddAllVisited = () => {
    if (countriesVisited.length === 0) return;
    const toAdd = countriesVisited;
    const startIndex = rankingSlots.length;
    const newSlots: RankingSlot[] = [
      ...rankingSlots,
      ...toAdd.map((country, i) => ({
        id: generateUniqueId(),
        rank: startIndex + i + 1,
        country,
      })),
    ];
    setRankingSlots(newSlots);
    handleSaveRanking(newSlots);
    setCountriesVisited([]);
    try {
      const uid = auth.currentUser?.uid;
      if (uid) storage.set(`user:${uid}:visited`, JSON.stringify([]));
    } catch {}
    setActiveRankingItemId(null);
  };

  const handleClearRanking = () => {
    if (rankingSlots.length === 0) return;
    const rankedCountries = rankingSlots
      .map((s) => s.country)
      .filter(Boolean) as Country[];
    setRankingSlots([]);
    handleSaveRanking([]);
    setActiveRankingItemId(null);
    setCountriesVisited((prev) => {
      const next = removeDuplicates([...prev, ...rankedCountries])
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name));
      try {
        const uid = auth.currentUser?.uid;
        if (uid)
          storage.set(
            `user:${uid}:visited`,
            JSON.stringify(next.map((c) => c.cca2))
          );
      } catch {}
      return next;
    });
  };

  return (
    <>
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
            onPress={() => rankingSlots.length && setConfirmAction("clear")}
            style={{ padding: 6, marginRight: -10 }}
          >
            <Ionicons
              name="trash-outline"
              size={24}
              color={theme.colors.onBackground}
            />
          </TouchableOpacity>
        </View>

        {/* Visited Countries */}
        {countriesVisited.length > 0 && (
          <View style={[styles.visitedContainer, { marginTop: 5 }]}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingRight: 6,
              }}
            >
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
              {countriesVisited.length >= 2 && (
                <TouchableOpacity
                  onPress={() => setConfirmAction("addAll")}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={{
                    paddingVertical: 6,
                    paddingHorizontal: 10,
                    borderRadius: 20,
                    backgroundColor: theme.colors.surface,
                    borderWidth: 1,
                    borderColor: theme.colors.primary,
                    marginBottom: 7,
                    marginRight: -6,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Ionicons
                      name="add"
                      size={16}
                      color={theme.colors.primary}
                    />
                    <Text
                      style={{
                        marginLeft: 6,
                        color: theme.colors.primary,
                        fontFamily: "Figtree-SemiBold",
                      }}
                    >
                      Add all
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>
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
              // Kiedy lista visited jest pusta, ranking bliżej góry
              marginTop:
                countriesVisited.length > 0 ? height * 0.012 : height * 0.003,
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
              onDragBegin={() => {
                setActiveRankingItemId(null);
              }} // Wyczyść stan aktywnego elementu przy starcie drag
              activationDistance={0}
              autoscrollThreshold={80}
              autoscrollSpeed={500}
              showsVerticalScrollIndicator={true}
              // Lżejsza konfiguracja wirtualizacji żeby ekran szybciej działał przy dużych listach
              initialNumToRender={16}
              maxToRenderPerBatch={16}
              windowSize={10}
              updateCellsBatchingPeriod={40}
              removeClippedSubviews={false}
              ItemSeparatorComponent={() => (
                <View style={{ height: 1, backgroundColor: dividerColor }} />
              )}
            />
          </View>
        </View>
      </View>
      {/* Confirmation modals for bulk actions */}
      <ConfirmationModal
        visible={confirmAction === "addAll"}
        title="Add all countries"
        message="Do you want to add all remaining visited countries to the ranking?"
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => {
          handleAddAllVisited();
          setConfirmAction(null);
        }}
        confirmText="Add all"
        cancelText="Cancel"
      />
      <ConfirmationModal
        visible={confirmAction === "clear"}
        title="Clear ranking"
        message="Do you want to remove ALL countries from the ranking? They will return to Visited."
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => {
          handleClearRanking();
          setConfirmAction(null);
        }}
        confirmText="Clear"
        cancelText="Cancel"
        isDestructive
      />
    </>
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
    paddingVertical: 10,
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
    fontSize: 16,
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
    fontSize: 16,
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
