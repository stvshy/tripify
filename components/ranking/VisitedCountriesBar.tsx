import React, { memo } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useTheme } from "react-native-paper";
import VisitedCountryPill from "./VisitedCountryPill";

type VisitedCountriesBarProps = {
  ids: string[]; // cca2 list not in ranking
  onAdd: (id: string) => void;
  onAddAll: () => void;
  isDark: boolean;
};

const VisitedCountriesBar = ({
  ids,
  onAdd,
  onAddAll,
  isDark,
}: VisitedCountriesBarProps) => {
  const theme = useTheme();

  if (ids.length === 0) return null;

  return (
    <View style={[styles.container, { marginTop: 2 }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: theme.colors.onBackground }]}>
          Visited Countries
        </Text>
        {ids.length >= 2 && (
          <TouchableOpacity
            onPress={onAddAll}
            style={styles.addAllBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text
              style={{
                color: theme.colors.primary,
                fontFamily: "Figtree-SemiBold",
              }}
            >
              Add all
            </Text>
          </TouchableOpacity>
        )}
      </View>
      <FlatList
        data={ids}
        keyExtractor={(cca2) => `visited-${cca2}`}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <VisitedCountryPill id={item} onAdd={onAdd} isDark={isDark} />
        )}
      />
    </View>
  );
};

export default memo(VisitedCountriesBar);

const styles = StyleSheet.create({
  container: {
    marginLeft: -4,
    marginRight: -4,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingRight: 6,
  },
  title: {
    fontSize: 17.2,
    marginLeft: 4,
    fontFamily: "PlusJakartaSans-Bold",
  },
  addAllBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    marginBottom: 7,
    marginRight: -6,
  },
  listContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 1,
    paddingBottom: 1,
  },
});
