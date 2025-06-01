// app/(registration)/_layout.tsx (BARDZO PROSTY)
import React from "react";
import { View, StyleSheet } from "react-native";
import { Slot } from "expo-router";

export default function RegistrationGroupLayout() {
  return (
    // Ten View jest opcjonalny, jeśli Slot/ekrany dzieci same zarządzają swoim tłem i flex:1
    // Ale może być przydatny jako wspólny kontener, jeśli chcesz dodać coś jeszcze do tego layoutu później.
    <View style={styles.container}>
      <Slot />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent", // Pozwala tłu ekranu dziecka być widocznym
  },
});
