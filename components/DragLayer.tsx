// components/DragLayer.tsx
import React, { useContext } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { DragContext } from './DragContext';
import CountryFlag from 'react-native-country-flag';

const DragLayer: React.FC = () => {
  const { draggedItem, position } = useContext(DragContext);

  if (!draggedItem) return null;

  return (
    <Animated.View style={[styles.draggedItem, { top: position.y, left: position.x }]} pointerEvents="none">
      <CountryFlag isoCode={draggedItem.cca2} size={25} style={styles.flag} />
      <Text style={styles.text}>{draggedItem.name}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  draggedItem: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#ffffffaa',
    borderRadius: 8,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    zIndex: 1000, // Upewnij się, że jest na wierzchu
  },
  flag: {
    marginRight: 8,
  },
  text: {
    fontSize: 16,
    color: '#000',
  },
});

export default DragLayer;
