import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";

interface ActionButtonsProps {
  onSendReset: () => void;
  onBackToLogin: () => void;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({
  onSendReset,
  onBackToLogin,
}) => {
  return (
    <View style={styles.footer}>
      <Pressable
        onPress={onSendReset}
        style={({ pressed }) => [
          styles.sendButton,
          pressed && styles.sendButtonPressed,
        ]}
        onPressIn={(e) => e.stopPropagation()}
      >
        <Text style={styles.sendButtonText}>Send reset link</Text>
      </Pressable>

      <Pressable
        onPress={onBackToLogin}
        style={({ pressed }) => [
          styles.backButton,
          pressed && styles.backButtonPressed,
        ]}
        onPressIn={(e) => e.stopPropagation()}
      >
        <Text style={styles.backButtonText}>Back to login</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  footer: {
    width: "100%",
    alignItems: "center",
    paddingVertical: 10,
    zIndex: 10, // Przyciski na wierzchu
  },
  sendButton: {
    backgroundColor: "#7511b5",
    paddingVertical: 9,
    paddingHorizontal: 30,
    alignItems: "center",
    borderRadius: 25,
    width: "90%",
    marginBottom: 10,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  sendButtonPressed: {
    backgroundColor: "#5a0d8a", // Ciemniejszy kolor przy naciśnięciu
    opacity: 0.9,
    transform: [{ scale: 0.98 }], // Lekkie zmniejszenie
  },
  sendButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "PlusJakartaSans-SemiBold",
    marginBottom: 3.5,
  },
  backButton: {
    paddingVertical: 10,
    marginBottom: -5,
  },
  backButtonPressed: {
    opacity: 0.7, // Zmniejszona przezroczystość przy naciśnięciu
    transform: [{ scale: 0.95 }], // Lekkie zmniejszenie
  },
  backButtonText: {
    color: "#4a136c",
    fontSize: 14,
    textAlign: "center",
    fontFamily: "PlusJakartaSans-Medium",
  },
});

export default ActionButtons;
