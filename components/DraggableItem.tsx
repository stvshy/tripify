// components/DraggableItem.tsx
import React, { useContext } from 'react';
import { StyleSheet, Text } from 'react-native';
import { PanGestureHandler, PanGestureHandlerGestureEvent } from 'react-native-gesture-handler';
import Animated, { useAnimatedGestureHandler, useAnimatedStyle, useSharedValue, withSpring, runOnJS } from 'react-native-reanimated';
import type { Country } from  '../.expo/types/country.d.ts';
import { DragContext } from './DragContext';
import CountryFlag from 'react-native-country-flag';

interface DraggableItemProps {
  item: Country;
}

const DraggableItem: React.FC<DraggableItemProps> = ({ item }) => {
  const { setDraggedItem, setPosition } = useContext(DragContext);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const gestureHandler = useAnimatedGestureHandler<PanGestureHandlerGestureEvent, { startX: number; startY: number }>({
    onStart: (_, ctx) => {
      ctx.startX = translateX.value;
      ctx.startY = translateY.value;
      runOnJS(setDraggedItem)(item); // Ustawiamy przeciągany element
    },
    onActive: (event, ctx) => {
      translateX.value = ctx.startX + event.translationX;
      translateY.value = ctx.startY + event.translationY;
      runOnJS(setPosition)({ x: event.absoluteX, y: event.absoluteY }); // Aktualizujemy pozycję
    },
    onEnd: () => {
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
      runOnJS(setDraggedItem)(null); // Usuwamy przeciągany element z kontekstu
    },
  });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  return (
    <PanGestureHandler onGestureEvent={gestureHandler}>
      <Animated.View style={[styles.item, animatedStyle]}>
        <CountryFlag isoCode={item.cca2} size={20} style={styles.flag} />
        <Text style={styles.text}>{item.name}</Text>
      </Animated.View>
    </PanGestureHandler>
  );
};

const styles = StyleSheet.create({
  item: {
    padding: 8,
    backgroundColor: '#fff',
    margin: 5,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    maxWidth: '80%', // Dynamic width
  },
  flag: {
    marginRight: 8,
  },
  text: {
    fontSize: 14,
    color: '#000',
  },
});

export default DraggableItem;
