// components/NoteItem.tsx

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CountryFlag from 'react-native-country-flag';
import { useTheme } from 'react-native-paper';

interface NoteItemProps {
  note: {
    id: string;
    countryCca2: string;
    noteText: string;
    createdAt: any;
  };
  onDelete: (noteId: string) => void;
  country?: {
    id: string;
    name: string;
    officialName: string;
    cca2: string;
    cca3: string;
    region: string;
    subregion: string;
    class: string | null;
    path: string;
  };
}

const NoteItem: React.FC<NoteItemProps> = ({ note, onDelete, country }) => {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      {country ? (
        <View style={styles.countryInfo}>
          <CountryFlag isoCode={country.cca2} size={25} />
          <Text style={[styles.countryName, { color: theme.colors.onSurface }]}>{country.name}</Text>
        </View>
      ) : (
        <View style={styles.countryInfo}>
          <Text style={{ color: theme.colors.onSurface }}>Unknown Country</Text>
        </View>
      )}
      <Text style={[styles.noteText, { color: theme.colors.onSurface }]}>{note.noteText}</Text>
      <TouchableOpacity onPress={() => onDelete(note.id)}>
        <Ionicons name="trash" size={24} color="red" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  countryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  countryName: {
    marginLeft: 5,
    fontSize: 16,
    fontWeight: '600',
  },
  noteText: {
    flex: 1,
    fontSize: 14,
    marginRight: 10,
  },
});

export default NoteItem;
