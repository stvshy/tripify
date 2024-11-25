// ListItem.tsx
import React from 'react';
import { Text, View, StyleSheet, TouchableWithoutFeedback, ViewStyle } from 'react-native';
import { DraxView } from 'react-native-drax';
import { Ionicons } from '@expo/vector-icons';
import CountryFlag from 'react-native-country-flag';

export type TItem = { 
  id: string; 
  title: string; 
  singer: string; 
  imageSrc: string; 
};

export type TListItemProps = { 
  item: TItem; 
  onDrag: (item: TItem) => void; 
  isRanking: boolean; 
  onLongPress?: (item: TItem) => void; 
  style?: ViewStyle; // Dodanie właściwości style 
};

export const ListItem: React.FC<TListItemProps> = React.memo(({ item, onDrag, isRanking, onLongPress, style }) => { 
  return ( 
    <TouchableWithoutFeedback onLongPress={() => onLongPress ? onLongPress(item) : onDrag(item)}> 
      <DraxView 
        style={[styles.itemContainer, style]} // Zastosowanie dodatkowych stylów 
        draggingStyle={styles.dragging} 
        dragPayload={item} 
        onDragStart={() => onDrag(item)} 
        renderContent={() => (
          <View style={styles.innerContainer}>
            <View style={styles.flagContainer}>
              <CountryFlag isoCode={item.imageSrc} size={20} />
            </View>
            <View style={styles.descriptionContainer}>
              <Text style={styles.description1}>{item.title}</Text>
            </View>
            {isRanking && (
              <View style={styles.draggerContainer}>
                <Ionicons name="reorder-three" size={20} color="#000" />
              </View>
            )}
          </View>
        )}
      /> 
    </TouchableWithoutFeedback> 
  ); 
});

const styles = StyleSheet.create({ 
  itemContainer: { 
    backgroundColor: '#fff', 
    borderRadius: 8, 
    overflow: 'hidden', 
    elevation: 2, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 1 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 2, 
  }, 
  innerContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 5, 
  }, 
  flagContainer: { 
    marginRight: 8, // Stały margines między flagą a nazwą
  }, 
  descriptionContainer: { 
    flexShrink: 1, 
    flexGrow: 0,
  }, 
  description1: { 
    fontSize: 12, 
    fontWeight: '600', 
    color: '#000', 
  }, 
  draggerContainer: { 
    marginLeft: 'auto', // Wyrównanie ikony do prawej
    justifyContent: 'center', 
    alignItems: 'center',
  }, 
  dragging: { 
    opacity: 0.7, 
    transform: [{ scale: 1.05 }], 
  }, 
});
