// ListItem.tsx
import React from 'react';
import { Text, View, StyleSheet, Dimensions } from 'react-native';
import { DraxView } from 'react-native-drax';
import { Ionicons } from '@expo/vector-icons';
import CountryFlag from 'react-native-country-flag';

export type TItem = {
  id: string;
  title: string; // Full country name
  singer: string; // Not needed for countries
  imageSrc: string; // Flag code (e.g., 'US')
};

export type TListItemProps = {
  item: TItem;
  onDrag: (item: TItem) => void;
  isRanking: boolean; // Indicates if the item is in ranking
};

export const ListItem: React.FC<TListItemProps> = ({ item, onDrag, isRanking }) => {
  return (
    <DraxView
      style={styles.itemContainer}
      draggingStyle={styles.dragging}
      dragPayload={item}
      longPressDelay={150}
      onDragStart={() => onDrag(item)}
      renderContent={() => (
        <View style={styles.innerContainer}>
          <View style={styles.flagContainer}>
            <CountryFlag isoCode={item.imageSrc} size={25} />
          </View>
          <View style={styles.descriptionContainer}>
            <Text style={styles.description1}>{item.title}</Text>
          </View>
          {isRanking && (
            <View style={styles.draggerContainer}>
              <Ionicons name="reorder-three" size={24} color="#000" />
            </View>
          )}
        </View>
      )}
    />
  );
};

const ITEM_WIDTH = Dimensions.get('window').width * 0.6;
const ITEM_HEIGHT = 60;

const styles = StyleSheet.create({
  itemContainer: {
    width: ITEM_WIDTH,
    height: ITEM_HEIGHT,
    marginRight: 10,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2, // For Android shadow
    shadowColor: '#000', // For iOS shadow
    shadowOffset: { width: 0, height: 2 }, // For iOS shadow
    shadowOpacity: 0.1, // For iOS shadow
    shadowRadius: 4, // For iOS shadow
  },
  innerContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  flagContainer: {
    width: '20%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  descriptionContainer: {
    width: '60%',
    justifyContent: 'center',
  },
  description1: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  draggerContainer: {
    width: '20%',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  dragging: {
    opacity: 0.2,
  },
});
