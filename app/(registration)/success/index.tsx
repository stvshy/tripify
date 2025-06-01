// File: app/(registration)/success/index.tsx
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
// Zaktualizowana ścieżka importu
import { auth, db } from "../../config/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { doc, getDoc } from "firebase/firestore";

export default function RegistrationSuccessScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isVerified, setIsVerified] = useState(false);
  const [countdown, setCountdown] = useState(7);
  const [showSuccessScreen, setShowSuccessScreen] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        await user.reload();
        const emailVerified = user.emailVerified;
        setIsVerified(emailVerified);

        if (emailVerified) {
          const userDocRef = doc(db, "users", user.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            const userData = userDoc.data();
            const firstLoginComplete = userData?.firstLoginComplete;

            if (!firstLoginComplete) {
              setTimeout(() => {
                // Upewnij się, że ścieżka jest poprawna
                router.replace("/chooseCountries");
              }, 7000);
              setLoading(false); // Dodano setLoading(false) tutaj
              return;
            }
          }
          setTimeout(() => {
            router.replace("/");
          }, 7000);
        } else {
          setTimeout(() => {
            router.replace("/welcome");
          }, 7000);
        }
      } else {
        setTimeout(() => {
          router.replace("/welcome");
        }, 7000);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!loading) {
      const interval = setInterval(() => {
        setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);

      if (countdown === 0) {
        // setShowSuccessScreen(false); // Możesz to zostawić lub usunąć,
        // jeśli chcesz, aby treść zniknęła
        // przed przekierowaniem.
        // Przekierowanie i tak nastąpi z pierwszego useEffect.
      }

      return () => clearInterval(interval);
    }
  }, [loading, countdown]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="green" />
      </View>
    );
  }

  // Jeśli showSuccessScreen jest fałsz, nic nie renderuj (lub pusty View)
  // To zachowanie jest zgodne z Twoim oryginalnym kodem.
  if (!showSuccessScreen && countdown === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <FontAwesome name="check-circle" size={100} color="green" />
      {isVerified ? (
        <Text style={styles.message}>
          Account Created and Verified Successfully!
        </Text>
      ) : (
        <>
          <Text style={styles.message}>Account Created Successfully!</Text>
          <Text style={styles.subMessage}>
            Please verify your email to log in.
          </Text>
        </>
      )}
      <Text style={styles.countdown}>
        Redirecting in {countdown} seconds...
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#FFF", // Tło dla samego ekranu sukcesu
  },
  message: {
    fontSize: 24,
    fontWeight: "bold",
    color: "green",
    textAlign: "center",
    marginVertical: 20,
  },
  subMessage: {
    fontSize: 16,
    color: "#555",
    textAlign: "center",
    marginTop: 10,
  },
  countdown: {
    fontSize: 16,
    color: "#888",
    marginTop: 20,
  },
});
