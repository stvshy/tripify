import React from "react";
import { View, Text, Pressable } from "react-native";
import { ScaledSheet } from "react-native-size-matters";

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

const styles = ScaledSheet.create({
  footer: {
    width: "100%",
    alignItems: "center",
    paddingVertical: "10@vs",
    zIndex: 10, // Przyciski na wierzchu
  },
  sendButton: {
    backgroundColor: "#7511b5",
    paddingVertical: "9@vs",
    paddingHorizontal: "30@s",
    alignItems: "center",
    borderRadius: "25@s",
    width: "90%",
    marginBottom: "10@vs",
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
    fontSize: "16@ms",
    fontFamily: "PlusJakartaSans-SemiBold",
    marginBottom: "3.5@vs",
  },
  backButton: {
    paddingVertical: "10@vs",
    marginBottom: "-5@vs",
  },
  backButtonPressed: {
    opacity: 0.7, // Zmniejszona przezroczystość przy naciśnięciu
    transform: [{ scale: 0.95 }], // Lekkie zmniejszenie
  },
  backButtonText: {
    color: "#4a136c",
    fontSize: "14@ms",
    textAlign: "center",
    fontFamily: "PlusJakartaSans-Medium",
  },
});

export default ActionButtons;
