import React, { memo, useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useTheme } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import CountryFlag from "react-native-country-flag";
import { COUNTRY_BY_CCA2 } from "../countriesIndex";

type VisitedCountryPillProps = {
  id: string; // cca2
  onAdd: (id: string) => void;
  isDark: boolean;
  onInteractHide?: () => void;
};

const VisitedCountryPill = ({
  id,
  onAdd,
  isDark,
  onInteractHide,
}: VisitedCountryPillProps) => {
  const theme = useTheme();
  const country = useMemo(() => COUNTRY_BY_CCA2[id], [id]);

  if (!country) return null;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? "#171717" : theme.colors.surface,
          borderColor: isDark ? "#1f1f1f" : "#e0e0e0",
        },
      ]}
    >
      <CountryFlag isoCode={country.cca2} size={24} style={styles.flag} />
      <Text
        style={[
          styles.name,
          { color: isDark ? "#fff" : theme.colors.onSurface },
        ]}
      >
        {country.name}
      </Text>
      <TouchableOpacity
        onPress={() => {
          onInteractHide?.();
          onAdd(id);
        }}
        style={styles.addButtonIcon}
      >
        <Ionicons name="add-circle" size={23} color="green" />
      </TouchableOpacity>
    </View>
  );
};

export default memo(VisitedCountryPill);

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginLeft: 4,
    marginRight: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  flag: {
    width: 24,
    height: 16,
    borderRadius: 2,
  },
  name: {
    fontFamily: "Figtree-SemiBold",
    fontSize: 14,
    marginLeft: 6,
  },
  addButtonIcon: {
    marginLeft: 10,
    marginRight: -3,
  },
});
