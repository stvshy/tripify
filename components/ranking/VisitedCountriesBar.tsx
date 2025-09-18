import React, { memo, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useTheme } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
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
  const [flashOpacity, setFlashOpacity] = useState(0);

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
      {/* Fallback row underneath to avoid blank while FlashList measures */}
      {flashOpacity < 1 && (
        <View style={[styles.listPadding, styles.fallbackRow]}>
          {ids.slice(0, 12).map((id) => (
            <VisitedCountryPill
              key={`fallback-${id}`}
              id={id}
              onAdd={onAdd}
              isDark={isDark}
            />
          ))}
        </View>
      )}
      <View style={{ opacity: flashOpacity }}>
        <FlashList
          data={ids}
          keyExtractor={(cca2) => `visited-${cca2}`}
          horizontal
          estimatedItemSize={140}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listPadding}
          renderItem={({ item }) => (
            <VisitedCountryPill id={item} onAdd={onAdd} isDark={isDark} />
          )}
          onContentSizeChange={() => setFlashOpacity(1)}
          ListEmptyComponent={null}
        />
      </View>
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
  listPadding: {
    paddingTop: 1,
    paddingBottom: 1,
  },
  fallbackRow: {
    flexDirection: "row",
    alignItems: "center",
  },
});
