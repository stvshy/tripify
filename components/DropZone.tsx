// components/DropZone.tsx
import React, { useRef, useEffect, useContext, useState } from 'react';
import { StyleSheet, View, Text, LayoutChangeEvent } from 'react-native';
import { DragContext } from './DragContext';
import type { Country } from  '../.expo/types/country.d.ts';
import Animated, { useAnimatedStyle, withTiming, useSharedValue } from 'react-native-reanimated';

interface DropZoneProps {
  onDrop: (item: Country) => void;
}

const DropZone: React.FC<DropZoneProps> = ({ onDrop }) => {
  const { draggedItem, position, setDraggedItem } = useContext(DragContext);
  const [layout, setLayout] = useState<{ x: number; y: number; width: number; height: number }>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });
  const [isOver, setIsOver] = useState(false);
  const animatedScale = useSharedValue(1);

  const handleLayout = (event: LayoutChangeEvent) => {
    const { x, y, width, height } = event.nativeEvent.layout;
    console.log(`DropZone layout: x=${x}, y=${y}, width=${width}, height=${height}`);
    setLayout({ x, y, width, height });
  };

  useEffect(() => {
    if (draggedItem) {
      const isOverDropZone =
        position.x > layout.x &&
        position.x < layout.x + layout.width &&
        position.y > layout.y &&
        position.y < layout.y + layout.height;

      console.log(`Dragged position: (${position.x}, ${position.y})`);
      console.log(`DropZone bounds: x=${layout.x}, y=${layout.y}, width=${layout.width}, height=${layout.height}`);
      console.log(`isOverDropZone: ${isOverDropZone}`);

      setIsOver(isOverDropZone);

      if (isOverDropZone) {
        onDrop(draggedItem);
        setDraggedItem(null);
      }
    } else {
      setIsOver(false);
    }
  }, [position, draggedItem, layout, onDrop, setDraggedItem]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withTiming(isOver ? 1.1 : 1, { duration: 200 }) }],
    backgroundColor: isOver ? '#d0ffd0' : '#f0f0f0',
  }));

  return (
    <Animated.View style={[styles.dropZone, animatedStyle]} onLayout={handleLayout}>
      <Text style={styles.text}>Drop Here to Add to Ranking</Text>
      {/* Dodatkowy tekst do debugowania */}
      <Text style={styles.debugText}>
        x: {layout.x}, y: {layout.y}, w: {layout.width}, h: {layout.height}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  dropZone: {
    height: 100,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 10,
  },
  text: {
    color: '#888',
    fontSize: 16,
  },
  debugText: {
    fontSize: 10,
    color: 'red',
    marginTop: 4,
  },
});

export default DropZone;
