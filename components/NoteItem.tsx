import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CountryFlag from 'react-native-country-flag';
import { useTheme } from 'react-native-paper';

interface NoteItemProps {
  note: {
    id: string;
    countryCca2: string;
    noteText: string;
  };
  onDelete: (id: string) => void;
}

const NoteItem: React.FC<NoteItemProps> = ({ note, onDelete }) => {
  const theme = useTheme();
  return (
    <View style={[styles.noteItem, { backgroundColor: theme.colors.surface }]}>
      <CountryFlag isoCode={note.countryCca2} size={25} style={styles.noteFlag} />
      <View style={styles.noteTextContainer}>
        <Text style={[styles.noteCountryName, { color: theme.colors.onBackground }]}>
          {note.countryCca2}
        </Text>
        <Text style={[styles.noteText, { color: theme.colors.onBackground }]}>
          {note.noteText}
        </Text>
      </View>
      <TouchableOpacity onPress={() => onDelete(note.id)}>
        <Ionicons name="trash" size={24} color="red" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  noteItem: {
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
  noteFlag: {
    marginRight: 10,
  },
  noteTextContainer: {
    flex: 1,
  },
  noteCountryName: {
    fontSize: 16,
    fontWeight: '600',
  },
  noteText: {
    fontSize: 14,
    marginTop: 2,
  },
});

export default NoteItem;
