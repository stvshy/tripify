// components/RankingList.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import CountryFlag from 'react-native-country-flag';
import { useTheme } from 'react-native-paper';

interface Country {
  id: string;
  cca2: string;
  name: string;
  flag: string;
  class: string;
  path: string;
}

interface RankingSlot {
  id: string;
  rank: number;
  country: Country | null;
}

interface RankingListProps {
  rankingSlots: RankingSlot[];
}

const RankingList: React.FC<RankingListProps> = ({ rankingSlots }) => {
  const theme = useTheme();

  return (
    <View>
      {rankingSlots.length === 0 ? (
        <Text style={{ color: theme.colors.onBackground }}>No ranking available.</Text>
      ) : (
        rankingSlots.map((slot) => (
          <View key={slot.id} style={[styles.rankingItemContainer, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.rank, { color: theme.colors.onSurface }]}>
              {slot.rank}.
            </Text>
            {slot.country ? (
                <>
                <CountryFlag isoCode={slot.country.cca2} size={20} style={styles.flag} />
                <Text style={[styles.countryName, { color: theme.colors.onSurface }]}>
                  {'  '}{slot.country.name}
                </Text>
                </>
            ) : (
              <Text style={[styles.countryName, { color: theme.colors.onSurface }]}>
                Unknown
              </Text>
            )}
          </View>
        ))
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  rankingItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  rank: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  countryName: {
    fontSize: 14,
  },
  flag: {
    width: 20,
    height: 15,
    borderRadius: 2,
  },
});

export default RankingList;
