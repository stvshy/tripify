// app/ranking.tsx (RankingScreen) — zoptymalizowany

import React, {
  useContext,
  useState,
  useCallback,
  useRef,
  useMemo,
  useEffect,
  memo,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  FlatList,
  LayoutAnimation,
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
import FastImage from "@d11/react-native-fast-image";
import ConfirmationModal from "../../components/ConfirmationModal";
import { storage } from "../config/storage";
import {
  COUNTRY_BY_CCA2,
  getFlagUrl,
  type CountryLite,
} from "../../components/countriesIndex";

type Country = CountryLite;

interface RankingSlot {
  id: string; // = cca2
  rank: number;
  country: Country | null;
}

const removeDuplicates = (countries: Country[]): Country[] => {
  const map = new Map<string, Country>();
  for (const c of countries) if (c?.cca2) map.set(c.cca2, c);
  return Array.from(map.values());
};

export default function RankingScreen() {
  const { isDarkTheme } = useContext(ThemeContext);
  const theme = useTheme();
  const router = useRouter();
  const { width, height } = Dimensions.get("window");

  const outerBorderColor = isDarkTheme ? "#262626" : "#E0E0E0";
  const dividerColor = isDarkTheme ? "#333333" : "#F0F0F0";
  const countryByCca2 = COUNTRY_BY_CCA2;

  // Ranking z cache (stabilne id = cca2)
  const [rankingSlots, setRankingSlots] = useState<RankingSlot[]>(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return [];
    const raw = storage.getString(`user:${uid}:ranking`);
    if (!raw) return [];
    try {
      const arr: string[] = JSON.parse(raw);
      return arr.map((cca2, idx) => ({
        id: cca2,
        rank: idx + 1,
        country: countryByCca2[cca2] || null,
      }));
    } catch {
      return [];
    }
  });

  // Visited z cache (od razu)
  const [countriesVisited, setCountriesVisited] = useState<Country[]>(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return [];
    let visitedCodes: string[] = [];
    let rankingArr: string[] = [];
    try {
      visitedCodes = JSON.parse(
        storage.getString(`user:${uid}:visited`) || "[]"
      );
    } catch {}
    try {
      rankingArr = JSON.parse(storage.getString(`user:${uid}:ranking`) || "[]");
    } catch {}
    const ranked = new Set(rankingArr);
    return visitedCodes
      .filter((code) => !ranked.has(code))
      .map((code) => countryByCca2[code])
      .filter(Boolean)
      .sort((a, b) => a.name.localeCompare(b.name)) as Country[];
  });

  const [activeRankingItemId, setActiveRankingItemId] = useState<string | null>(
    null
  );
  const [confirmAction, setConfirmAction] = useState<null | "addAll" | "clear">(
    null
  );
  const rankingVersionRef = useRef<string | null>(null);

  // Pobieramy user data PO animacji — bez blokowania przejścia
  const fetchUserData = useCallback(async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const userDocRef = doc(db, "users", currentUser.uid);
    const snap = await getDoc(userDocRef);
    if (!snap.exists()) return;

    const data = snap.data() || {};
    const visitedCodes: string[] = data.countriesVisited || [];
    const rankingRaw: string[] = data.ranking || [];

    // ranking ⊆ visited
    const rankingFiltered = rankingRaw.filter((c: string) =>
      visitedCodes.includes(c)
    );
    const visitedNotRanked = visitedCodes.filter(
      (c) => !rankingFiltered.includes(c)
    );

    const visitedList = visitedNotRanked
      .map((c) => countryByCca2[c])
      .filter(Boolean)
      .sort((a, b) => a.name.localeCompare(b.name)) as Country[];

    const slots: RankingSlot[] = rankingFiltered.map((cca2, i) => ({
      id: cca2,
      rank: i + 1,
      country: countryByCca2[cca2] || null,
    }));

    const newVersion = `${rankingFiltered.join("|")}::len:${visitedList.length}`;
    if (rankingVersionRef.current === newVersion) return;
    rankingVersionRef.current = newVersion;

    setCountriesVisited(visitedList);
    setRankingSlots(slots);

    // sync cache
    try {
      storage.set(
        `user:${currentUser.uid}:ranking`,
        JSON.stringify(rankingFiltered)
      );
      storage.set(
        `user:${currentUser.uid}:visited`,
        JSON.stringify(visitedCodes)
      );
    } catch {}
  }, [countryByCca2]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const t = InteractionManager.runAfterInteractions(() => {
        if (!cancelled) fetchUserData();
      });
      return () => {
        cancelled = true;
        // @ts-ignore
        t?.cancel?.();
      };
    }, [fetchUserData])
  );

  // Prefetch flag (po animacji)
  useEffect(() => {
    const t = InteractionManager.runAfterInteractions(() => {
      const urls = new Set<string>();
      for (const s of rankingSlots)
        if (s.country) urls.add(getFlagUrl(s.country.cca2, 40));
      for (const c of countriesVisited) urls.add(getFlagUrl(c.cca2, 40));
      try {
        FastImage.preload(
          Array.from(urls).map((uri) => ({
            uri,
            priority: FastImage.priority.low,
          }))
        );
      } catch {}
    });
    return () => {
      // @ts-ignore
      t?.cancel?.();
    };
  }, [rankingSlots, countriesVisited]);

  const handleGoBack = () => router.back();

  const handleSaveRanking = useCallback(
    async (newRankingSlots: RankingSlot[]) => {
      const ranking = newRankingSlots
        .filter((slot) => slot.country)
        .map((slot) => slot.country!.cca2);

      const currentUser = auth.currentUser;
      if (!currentUser) return;

      try {
        await updateDoc(doc(db, "users", currentUser.uid), { ranking });
        storage.set(`user:${currentUser.uid}:ranking`, JSON.stringify(ranking));
      } catch {}
    },
    []
  );

  const handleDragEnd = ({ data }: DragEndParams<RankingSlot>) => {
    const updated = data.map((it, i) => ({ ...it, rank: i + 1 }));
    setRankingSlots(updated);
    handleSaveRanking(updated);
  };

  const handleRemoveFromRanking = (index: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const slot = rankingSlots[index];
    if (!slot?.country) return;

    setCountriesVisited((prev) => {
      const next = removeDuplicates([...(prev || []), slot.country!])
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name));
      const uid = auth.currentUser?.uid;
      if (uid)
        storage.set(
          `user:${uid}:visited`,
          JSON.stringify(next.map((c) => c.cca2))
        );
      return next;
    });

    const updatedSlots = rankingSlots
      .slice(0, index)
      .concat(rankingSlots.slice(index + 1));
    const reranked = updatedSlots.map((it, i) => ({ ...it, rank: i + 1 }));
    setRankingSlots(reranked);
    handleSaveRanking(reranked);
    setActiveRankingItemId(null);
  };

  const handleAddToRanking = (country: Country) => {
    if (rankingSlots.some((s) => s.country?.cca2 === country.cca2)) return;

    const newSlot: RankingSlot = {
      id: country.cca2, // stabilny klucz = cca2
      rank: rankingSlots.length + 1,
      country,
    };
    const updated = [...rankingSlots, newSlot];
    setRankingSlots(updated);
    handleSaveRanking(updated);

    setCountriesVisited((prev) => {
      const next = (prev || []).filter((c) => c.cca2 !== country.cca2);
      const uid = auth.currentUser?.uid;
      if (uid)
        storage.set(
          `user:${uid}:visited`,
          JSON.stringify(next.map((c) => c.cca2))
        );
      return next;
    });

    setActiveRankingItemId(null);
  };

  const handleAddAllVisited = () => {
    if (!countriesVisited.length) return;
    const start = rankingSlots.length;
    const toAdd = countriesVisited.map((c, i) => ({
      id: c.cca2,
      rank: start + i + 1,
      country: c,
    }));
    const updated = [...rankingSlots, ...toAdd];
    setRankingSlots(updated);
    handleSaveRanking(updated);
    setCountriesVisited([]);
    const uid = auth.currentUser?.uid;
    if (uid) storage.set(`user:${uid}:visited`, JSON.stringify([]));
    setActiveRankingItemId(null);
  };

  const handleClearRanking = () => {
    if (!rankingSlots.length) return;
    const rankedCountries = rankingSlots
      .map((s) => s.country)
      .filter(Boolean) as Country[];
    setRankingSlots([]);
    handleSaveRanking([]);

    setCountriesVisited((prev) => {
      const next = removeDuplicates([...(prev || []), ...rankedCountries])
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name));
      const uid = auth.currentUser?.uid;
      if (uid)
        storage.set(
          `user:${uid}:visited`,
          JSON.stringify(next.map((c) => c.cca2))
        );
      return next;
    });
    setActiveRankingItemId(null);
  };

  // perf config listy
  const listPerfConfig = useMemo(() => {
    const len = rankingSlots.length;
    const full = len > 0 && len <= 160;
    const initialNum = full ? len : Math.min(18, len);
    const maxBatch = full ? len : Math.min(24, len);
    const windowSize = full
      ? Math.max(10, len)
      : Math.max(9, Math.min(25, len + 8));
    return {
      initialNum,
      maxBatch,
      windowSize,
      removeClipped: !full && len > 120,
    };
  }, [rankingSlots.length]);

  const RankingRow = memo(
    ({
      item,
      drag,
      isActive,
      index,
    }: {
      item: RankingSlot;
      drag: () => void;
      isActive: boolean;
      index: number;
    }) => {
      const removeAnimRef = useRef<Animated.Value>();
      if (!removeAnimRef.current) removeAnimRef.current = new Animated.Value(0);
      const removeAnim = removeAnimRef.current;
      useEffect(() => {
        Animated.timing(removeAnim, {
          toValue: activeRankingItemId === item.id ? 1 : 0,
          duration: 200,
          useNativeDriver: true,
        }).start();
      }, [activeRankingItemId, item.id]);

      const opacity = removeAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1],
      });
      const scale = removeAnim.interpolate({
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
            <Text
              style={[
                styles.rankNumber,
                { color: theme.colors.onSurface, fontSize: 20 },
              ]}
            >
              {index + 1}.
            </Text>
            {item.country ? (
              <View style={styles.countryInfoContainer}>
                <FastImage
                  source={{
                    uri: getFlagUrl(item.country.cca2, 40),
                    priority: FastImage.priority.normal,
                  }}
                  style={styles.flag}
                  resizeMode={FastImage.resizeMode.cover}
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
            <Animated.View style={{ opacity, transform: [{ scale }] }}>
              {activeRankingItemId === item.id && (
                <TouchableOpacity
                  onPress={() => handleRemoveFromRanking(index)}
                  style={styles.removeButton}
                >
                  <Ionicons name="close-circle" size={22} color="red" />
                </TouchableOpacity>
              )}
            </Animated.View>
          </View>
        </View>
      );
    }
  );

  const renderRankingItem = useCallback(
    ({ item, drag, isActive, getIndex }: RenderItemParams<RankingSlot>) => {
      const idx = getIndex?.() ?? 0;
      return (
        <RankingRow item={item} drag={drag} isActive={isActive} index={idx} />
      );
    },
    [activeRankingItemId, isDarkTheme, theme]
  );

  return (
    <>
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.colors.background,
            paddingBottom: countriesVisited.length === 0 ? 12 : 50,
          },
        ]}
      >
        {/* Header */}
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
          <View style={[styles.visitedContainer, { marginTop: 2 }]}>
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
              keyExtractor={(country) => `visited-${country.cca2}`}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.visitedScrollContainer}
              renderItem={({ item }) => (
                <View
                  key={`visited-${item.cca2}`}
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
                  <FastImage
                    source={{
                      uri: getFlagUrl(item.cca2, 40),
                      priority: FastImage.priority.normal,
                    }}
                    style={styles.flag}
                    resizeMode={FastImage.resizeMode.cover}
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
                countriesVisited.length > 0 ? height * 0.012 : height * 0.004,
              flex: 1,
              paddingBottom: countriesVisited.length === 0 ? 6 : 0,
            },
          ]}
        >
          {countriesVisited.length > 0 && (
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
              data={rankingSlots}
              keyExtractor={(item) => item.id}
              renderItem={renderRankingItem}
              onDragEnd={handleDragEnd}
              onDragBegin={() => setActiveRankingItemId(null)}
              activationDistance={0}
              autoscrollThreshold={90}
              autoscrollSpeed={560}
              showsVerticalScrollIndicator
              initialNumToRender={listPerfConfig.initialNum}
              maxToRenderPerBatch={listPerfConfig.maxBatch}
              windowSize={listPerfConfig.windowSize}
              updateCellsBatchingPeriod={16}
              removeClippedSubviews={listPerfConfig.removeClipped}
              dragItemOverflow
              ItemSeparatorComponent={() => (
                <View style={{ height: 1, backgroundColor: dividerColor }} />
              )}
            />
          </View>
        </View>
      </View>

      {/* Potwierdzenia */}
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
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 10,
  },
  sectionTitle: {
    fontSize: 17.2,
    marginBottom: 10,
    fontFamily: "PlusJakartaSans-Bold",
    marginLeft: 1,
  },
  visitedContainer: {
    marginLeft: -4,
    marginRight: -4,
  },
  visitedScrollContainer: {
    flexDirection: "row",
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
    borderRadius: 8,
    borderWidth: 1,
    elevation: 0,
  },
  visitedItemText: {
    fontSize: 14,
    fontFamily: "Figtree-SemiBold",
  },
  addButtonIcon: {
    marginLeft: 10,
    marginRight: -3,
  },
  rankingContainer: {
    marginBottom: -13,
    flex: 1,
  },
  rankingListWrapper: {
    borderWidth: 1,
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 10,
  },
  rankingSlot: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 0,
    borderRadius: 0,
    borderWidth: 0,
    justifyContent: "space-between",
    elevation: 0,
    maxWidth: "100%",
  },
  slotContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  rankNumber: {
    fontSize: 16,
    marginRight: 12,
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
    marginRight: 8,
  },
});
