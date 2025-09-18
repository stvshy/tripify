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
  InteractionManager,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { ThemeContext } from "../config/ThemeContext";
import { useTheme } from "react-native-paper";
import { getDoc, doc, updateDoc } from "firebase/firestore";
import { db, auth } from "../config/firebaseConfig";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import DraggableFlatList, {
  RenderItemParams,
  DragEndParams,
} from "react-native-draggable-flatlist";
import { storage } from "../config/storage";
import ConfirmationModal from "../../components/ConfirmationModal";
import RankingRow from "../../components/ranking/RankingRow";
import VisitedCountriesBar from "../../components/ranking/VisitedCountriesBar";
import { COUNTRY_BY_CCA2, getFlagUrl } from "../../components/countriesIndex";
import FastImage from "@d11/react-native-fast-image";

const sortIdsByName = (ids: string[]) =>
  ids
    .slice()
    .sort((a, b) =>
      (COUNTRY_BY_CCA2[a]?.name || "").localeCompare(
        COUNTRY_BY_CCA2[b]?.name || ""
      )
    );

const SEPARATOR_HEIGHT = 1;

export default function RankingScreen() {
  const { isDarkTheme, toggleTheme } = useContext(ThemeContext);
  const theme = useTheme();
  const router = useRouter();
  const [visitedIds, setVisitedIds] = useState<string[]>(() => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return [];
      const rawVisited = storage.getString(`user:${uid}:visited`);
      const rawRanking = storage.getString(`user:${uid}:ranking`);
      const visitedCodes: string[] = rawVisited ? JSON.parse(rawVisited) : [];
      const rankingArr: string[] = rawRanking ? JSON.parse(rawRanking) : [];
      return sortIdsByName(
        visitedCodes.filter((code) => !rankingArr.includes(code))
      );
    } catch {
      return [];
    }
  });
  const [rankingIds, setRankingIds] = useState<string[]>(() => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return [];
      const raw = storage.getString(`user:${uid}:ranking`);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });
  const hydrationRef = useRef(false);
  const [confirmAction, setConfirmAction] = useState<null | "addAll" | "clear">(
    null
  );
  const rankingVersionRef = useRef<string | null>(null);

  const { width, height } = Dimensions.get("window");
  // Colors for cohesive ranking container & dividers
  const outerBorderColor = isDarkTheme ? "#262626" : "#E0E0E0";
  const dividerColor = isDarkTheme ? "#333333" : "#F0F0F0";

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

    // visitedIds bez tych z rankingu
    const visitedList = sortIdsByName(
      visitedCodes.filter((code) => !rankingFiltered.includes(code))
    );
    // Wersja danych (ranking + liczba visited) dla szybkiego porównania
    const newVersion = `${rankingFiltered.join("|")}::v:${visitedList.length}`;
    if (rankingVersionRef.current === newVersion) {
      // Nic się nie zmieniło – nie aktualizujemy stanu (utrzymujemy instant render już zamontowanych elementów)
      return;
    }
    rankingVersionRef.current = newVersion;
    setVisitedIds(visitedList);
    // Persist visited codes for instant next load
    try {
      storage.set(
        `user:${currentUser.uid}:visited`,
        JSON.stringify(visitedCodes)
      );
    } catch {}

    // Defer rankingIds set to after interactions if already hydrated once - reduces first paint lag
    if (hydrationRef.current) {
      setRankingIds(rankingFiltered);
    } else {
      InteractionManager.runAfterInteractions(() => {
        hydrationRef.current = true;
        setRankingIds(rankingFiltered);
      });
    }
    // Keep cache in sync so next open is instant
    try {
      storage.set(
        `user:${currentUser.uid}:ranking`,
        JSON.stringify(rankingFiltered)
      );
    } catch {}
  }, []);

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

  const handleSaveRanking = async (newRankingIds: string[]) => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      const userDocRef = doc(db, "users", currentUser.uid);
      await updateDoc(userDocRef, { ranking: newRankingIds });
      // Optimistically update local cache for instant subsequent loads
      try {
        storage.set(
          `user:${currentUser.uid}:ranking`,
          JSON.stringify(newRankingIds)
        );
      } catch {}
    }
  };

  const handleDragEnd = ({ data }: DragEndParams<string>) => {
    setRankingIds(data);
    handleSaveRanking(data);
  };

  const handleRemoveFromRanking = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setVisitedIds((prev) => {
      const exists = prev.includes(id);
      const next = exists ? prev : sortIdsByName([...prev, id]);
      try {
        const uid = auth.currentUser?.uid;
        if (uid) storage.set(`user:${uid}:visited`, JSON.stringify(next));
      } catch {}
      return next;
    });
    setRankingIds((prev) => {
      const next = prev.filter((x) => x !== id);
      handleSaveRanking(next);
      return next;
    });
  };

  const renderRankingItem = useCallback(
    ({ item, drag, isActive, getIndex }: RenderItemParams<string>) => {
      const idx = (getIndex && getIndex()) || 0;
      return (
        <RankingRow
          id={item}
          index={idx}
          drag={drag}
          isActive={isActive}
          onRemove={handleRemoveFromRanking}
        />
      );
    },
    [handleRemoveFromRanking]
  );

  const handleAddToRanking = (id: string) => {
    if (rankingIds.includes(id)) return;
    const nextRanking = [...rankingIds, id];
    setRankingIds(nextRanking);
    handleSaveRanking(nextRanking);
    setVisitedIds((prev) => {
      const next = prev.filter((x) => x !== id);
      try {
        const uid = auth.currentUser?.uid;
        if (uid) storage.set(`user:${uid}:visited`, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const handleAddAllVisited = () => {
    if (visitedIds.length === 0) return;
    const newRanking = [...rankingIds, ...visitedIds];
    setRankingIds(newRanking);
    handleSaveRanking(newRanking);
    setVisitedIds([]);
    try {
      const uid = auth.currentUser?.uid;
      if (uid) storage.set(`user:${uid}:visited`, JSON.stringify([]));
    } catch {}
  };

  const handleClearRanking = () => {
    if (rankingIds.length === 0) return;
    const nextVisited = sortIdsByName([...visitedIds, ...rankingIds]);
    setRankingIds([]);
    handleSaveRanking([]);
    setVisitedIds(nextVisited);
    try {
      const uid = auth.currentUser?.uid;
      if (uid) storage.set(`user:${uid}:visited`, JSON.stringify(nextVisited));
    } catch {}
  };

  // Memoizowana konfiguracja listy dla wydajności i uniknięcia tworzenia nowych obiektów na każdy render
  const listPerfConfig = useMemo(() => {
    const len = rankingIds.length;
    const initialNum = len; // wszystkie od razu
    const maxBatch = len;
    const windowSize = Math.max(21, len);
    return {
      initialNum,
      maxBatch,
      windowSize,
      removeClipped: false,
    };
  }, [rankingIds.length]);

  // Prefetch flags after interactions
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      const urls = new Set<string>();
      for (const id of rankingIds) urls.add(getFlagUrl(id, 40));
      for (const id of visitedIds) urls.add(getFlagUrl(id, 40));
      const sources = Array.from(urls).map((uri) => ({
        uri,
        priority: FastImage.priority.low,
      }));
      try {
        FastImage.preload(sources);
      } catch {}
    });
    return () => {
      // @ts-ignore
      task?.cancel?.();
    };
  }, [rankingIds, visitedIds]);

  return (
    <>
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.colors.background,
            paddingBottom: visitedIds.length === 0 ? 12 : 50,
          },
        ]}
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
            onPress={() => rankingIds.length && setConfirmAction("clear")}
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
        <VisitedCountriesBar
          ids={visitedIds}
          onAdd={handleAddToRanking}
          onAddAll={() => setConfirmAction("addAll")}
          isDark={isDarkTheme}
        />

        {/* Ranking */}
        <View
          style={[
            styles.rankingContainer,
            {
              // Kiedy lista visited jest pusta, ranking bliżej góry
              marginTop:
                visitedIds.length > 0 ? height * 0.012 : height * 0.004,
              flex: 1,
              paddingBottom: visitedIds.length === 0 ? 6 : 0,
            },
          ]}
        >
          {visitedIds.length > 0 && (
            <Text
              style={[
                styles.sectionTitle,
                { color: theme.colors.onBackground },
              ]}
            >
              Ranking
            </Text>
          )}
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
              data={rankingIds}
              keyExtractor={(id) => id}
              renderItem={renderRankingItem}
              onDragEnd={handleDragEnd}
              activationDistance={12}
              autoscrollThreshold={90}
              autoscrollSpeed={560}
              showsVerticalScrollIndicator={true}
              initialNumToRender={listPerfConfig.initialNum}
              maxToRenderPerBatch={listPerfConfig.maxBatch}
              windowSize={listPerfConfig.windowSize}
              updateCellsBatchingPeriod={0}
              removeClippedSubviews={false}
              dragItemOverflow
              ItemSeparatorComponent={() => (
                <View
                  style={{
                    height: SEPARATOR_HEIGHT,
                    backgroundColor: dividerColor,
                  }}
                />
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
