// ListItem.tsx
import React from 'react';
import { Text, View, StyleSheet, TouchableWithoutFeedback, ViewStyle } from 'react-native';
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
  onDrag: () => void; 
  isRanking: boolean; 
  onLongPress?: () => void; 
  style?: ViewStyle; // Dodanie właściwości style 
};

export const ListItem: React.FC<TListItemProps> = React.memo(({ item, onDrag, isRanking, onLongPress, style }) => { 
  return ( 
    <TouchableWithoutFeedback onLongPress={() => onLongPress ? onLongPress() : onDrag()}> 
      <View style={[styles.itemContainer, style]}> 
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
      </View> 
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
    flex: 1, // Umożliwia elastyczne dopasowanie w gridzie
    margin: 5,
  }, 
  innerContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 10, 
  }, 
  flagContainer: { 
    marginRight: 8,
  }, 
  descriptionContainer: { 
    flexShrink: 1, 
    flexGrow: 0,
  }, 
  description1: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: '#000', 
  }, 
  draggerContainer: { 
    marginLeft: 'auto', 
    justifyContent: 'center', 
    alignItems: 'center',
  }, 
});
