import React, { memo, useCallback, useMemo, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useTheme } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import CountryFlag from "react-native-country-flag";
import { COUNTRY_BY_CCA2 } from "../countriesIndex";

type RankingRowProps = {
  id: string; // cca2
  index: number;
  drag: () => void;
  isActive: boolean;
  onRemove: (id: string) => void;
};

const ROW_FLAG_SIZE = 22;

const RankingRow = ({
  id,
  index,
  drag,
  isActive,
  onRemove,
}: RankingRowProps) => {
  const theme = useTheme();
  const [showRemove, setShowRemove] = useState(false);

  const country = useMemo(() => COUNTRY_BY_CCA2[id], [id]);

  const onPressRow = useCallback(() => {
    setShowRemove((prev) => !prev);
  }, []);

  const handleRemove = useCallback(() => {
    onRemove(id);
  }, [id, onRemove]);

  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: isActive
            ? theme.dark
              ? "#333333"
              : "#e9e9e9"
            : theme.colors.surface,
        },
      ]}
    >
      <TouchableOpacity
        style={styles.rowContent}
        onPress={onPressRow}
        onLongPress={drag}
        delayLongPress={250}
        disabled={isActive}
        activeOpacity={0.8}
      >
        <Text style={[styles.rank, { color: theme.colors.onSurface }]}>
          {" "}
          {index + 1}.{" "}
        </Text>
        {country ? (
          <View style={styles.countryInfo}>
            <CountryFlag
              isoCode={country.cca2}
              size={ROW_FLAG_SIZE}
              style={styles.flag}
            />
            <Text
              style={[styles.countryName, { color: theme.colors.onSurface }]}
            >
              {country.name}
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
            Drop here
          </Text>
        )}
      </TouchableOpacity>
      {showRemove && (
        <TouchableOpacity
          onPress={handleRemove}
          style={styles.removeBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close-circle" size={22} color="red" />
        </TouchableOpacity>
      )}
    </View>
  );
};

export default memo(RankingRow);

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  rowContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  rank: {
    fontFamily: "Figtree-SemiBold",
    fontSize: 16,
    marginRight: 12,
  },
  countryInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  flag: {
    width: ROW_FLAG_SIZE,
    height: Math.round(ROW_FLAG_SIZE * 0.72),
    borderRadius: 2,
  },
  countryName: {
    fontFamily: "Figtree-SemiBold",
    fontSize: 16,
    marginLeft: 8,
  },
  removeBtn: {
    marginRight: 8,
  },
});
