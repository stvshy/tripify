import React from 'react';
import { View, StyleSheet } from 'react-native';

const CustomScrollbar = () => (
  <View style={styles.scrollbar}>
    {/* Możesz dodać tutaj dodatkowe elementy graficzne */}
  </View>
);

const styles = StyleSheet.create({
  scrollbar: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 10,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
});

export default CustomScrollbar;
