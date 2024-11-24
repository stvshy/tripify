// ListItem.tsx
import React from 'react';
import { Image, Text, View, StyleSheet, Dimensions } from 'react-native';
import { DraxView } from 'react-native-drax';
import { Ionicons } from '@expo/vector-icons';

export type TItem = {
  id: string;
  title: string;
  singer: string;
  imageSrc: string;
};

export type TListItemProps = {
  item: TItem;
  onDrag: (item: TItem) => void;
};

export const ListItem: React.FC<TListItemProps> = ({ item, onDrag }) => {
  return (
    <DraxView
      style={styles.itemContainer}
      draggingStyle={styles.dragging}
      dragPayload={item}
      longPressDelay={150}
      onDragStart={() => onDrag(item)}
      onDragEnd={() => {}}
      renderContent={() => (
        <View style={styles.innerContainer}>
          <View style={styles.imageContainer}>
            {item.imageSrc ? (
              <Image
                source={{ uri: item.imageSrc }}
                style={styles.image}
                resizeMode="cover"
              />
            ) : (
              <Ionicons name="flag" size={40} color="#fff" />
            )}
          </View>
          <View style={styles.descriptionContainer}>
            <Text style={styles.description1}>{item.title}</Text>
            {/* If singer is not needed, you can remove this line */}
            {/* <Text style={styles.description2}>{item.singer}</Text> */}
          </View>
          <View style={styles.draggerContainer}>
            <Ionicons name="reorder-three" size={24} color="#FFFFFF" />
          </View>
        </View>
      )}
    />
  );
};

const ITEM_WIDTH = Dimensions.get('window').width * 0.6;
const ITEM_HEIGHT = 80;

const styles = StyleSheet.create({
  itemContainer: {
    width: ITEM_WIDTH,
    height: ITEM_HEIGHT,
    marginRight: 10,
    backgroundColor: '#1C1C1C',
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 2, // For Android shadow
    shadowColor: '#000', // For iOS shadow
    shadowOffset: { width: 0, height: 2 }, // For iOS shadow
    shadowOpacity: 0.2, // For iOS shadow
    shadowRadius: 4, // For iOS shadow
  },
  innerContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  imageContainer: {
    width: '25%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#333',
    borderRadius: 6,
    padding: 5,
  },
  image: {
    width: 40,
    height: 40,
    borderRadius: 6,
  },
  descriptionContainer: {
    width: '55%',
    justifyContent: 'center',
    paddingLeft: 10,
  },
  description1: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  description2: {
    color: '#808080',
    fontSize: 12,
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
