import React from "react";
import { Text } from "react-native";
import { ScaledSheet } from "react-native-size-matters";

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

const styles = ScaledSheet.create({
  successMessage: {
    color: "#50baa1",
    textAlign: "center",
    marginBottom: "16@vs",
    fontSize: "12@ms",
    fontFamily: "PlusJakartaSans-Regular",
    position: "absolute",
    bottom: "120@vs", // Pozycjonowane względem dolnej części ekranu
    left: 0,
    right: 0,
    zIndex: 5, // Zmniejszony zIndex żeby nie przesłaniał przycisków
  },
  errorMessage: {
    color: "violet",
    textAlign: "center",
    marginBottom: "16@vs",
    fontSize: "12.5@ms",
    fontFamily: "PlusJakartaSans-Regular",
    position: "absolute",
    bottom: "120@vs", // Pozycjonowane względem dolnej części ekranu
    left: 0,
    right: 0,
    zIndex: 5, // Zmniejszony zIndex żeby nie przesłaniał przycisków
  },
});

export default StatusMessages;
