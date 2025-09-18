import React, { memo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { useTheme } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
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
            onPress={() => onAddAll()}
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
              <Ionicons name="add" size={16} color={theme.colors.primary} />
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
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.listPadding, styles.fallbackRow]}
      >
        {ids.map((id) => (
          <VisitedCountryPill
            key={`visited-${id}`}
            id={id}
            onAdd={onAdd}
            isDark={isDark}
          />
        ))}
      </ScrollView>
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
    paddingBottom: 8.4,
  },
  addAllBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    marginBottom: 7,
    marginRight: -6,
  },
  listPadding: {
    paddingTop: 1,
    paddingBottom: 1,
  },
  fallbackRow: {
    flexDirection: "row",
    alignItems: "center",
  },
});
