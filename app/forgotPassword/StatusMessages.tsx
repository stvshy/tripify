import React from "react";
import { Text, StyleSheet } from "react-native";

interface StatusMessagesProps {
  message: string | null;
  error: string | null;
}

const StatusMessages: React.FC<StatusMessagesProps> = ({ message, error }) => {
  if (!message && !error) return null;

  return (
    <>
      {message && <Text style={styles.successMessage}>{message}</Text>}
      {error && <Text style={styles.errorMessage}>{error}</Text>}
    </>
  );
};

const styles = StyleSheet.create({
  successMessage: {
    color: "#50baa1",
    textAlign: "center",
    marginBottom: 16,
    fontSize: 12,
    fontFamily: "PlusJakartaSans-Regular",
    position: "absolute",
    bottom: 120, // Pozycjonowane względem dolnej części ekranu
    left: 0,
    right: 0,
    zIndex: 5, // Zmniejszony zIndex żeby nie przesłaniał przycisków
  },
  errorMessage: {
    color: "violet",
    textAlign: "center",
    marginBottom: 16,
    fontSize: 12.5,
    fontFamily: "PlusJakartaSans-Regular",
    position: "absolute",
    bottom: 120, // Pozycjonowane względem dolnej części ekranu
    left: 0,
    right: 0,
    zIndex: 5, // Zmniejszony zIndex żeby nie przesłaniał przycisków
  },
});

export default StatusMessages;
