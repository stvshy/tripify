import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  StatusBar,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { auth, db } from "../../config/firebaseConfig"; // Upewnij się, że ścieżka jest poprawna
import { onAuthStateChanged } from "firebase/auth";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { doc, getDoc } from "firebase/firestore";
import CustomStepIndicator from "../../../components/CustomStepIndicator"; // Upewnij się, że ścieżka jest poprawna

// const { width } = Dimensions.get('window');

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

        const redirectDelay = 7000; // 7 sekund

        if (emailVerified) {
          const userDocRef = doc(db, "users", user.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            const userData = userDoc.data();
            const firstLoginComplete = userData?.firstLoginComplete;

            if (!firstLoginComplete) {
              setTimeout(() => {
                router.replace("/chooseCountries");
              }, redirectDelay);
              setLoading(false);
              return;
            }
          }
          setTimeout(() => {
            router.replace("/");
          }, redirectDelay);
        } else {
          setTimeout(() => {
            router.replace("/welcome");
          }, redirectDelay);
        }
      } else {
        setTimeout(() => {
          router.replace("/welcome");
        }, 7000); // Użyj redirectDelay także tutaj, jeśli ma być spójne
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!loading && countdown > 0) {
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev === 1) {
            clearInterval(interval);
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    } else if (countdown <= 0 && !loading) {
      // Przekierowanie jest obsługiwane w pierwszym useEffect,
      // więc tutaj możemy po prostu ukryć ekran, jeśli jest taka potrzeba,
      // ale zazwyczaj przekierowanie samo w sobie załatwi sprawę.
      // setShowSuccessScreen(false); // Można odkomentować, jeśli jest specyficzna potrzeba
    }
  }, [loading, countdown]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="green" />
      </View>
    );
  }

  if (showSuccessScreen) {
    return (
      <SafeAreaView style={styles.safeAreaContainer}>
        <View style={styles.stepperWrapper}>
          <CustomStepIndicator
            currentPosition={2}
            labels={["Register", "Username", "Success"]}
            stepCount={3}
          />
        </View>

        <View style={styles.mainContentContainer}>
          <FontAwesome name="check-circle" size={100} color="#05ad50" />
          {isVerified ? (
            <Text style={styles.messageVerified}>
              Account Created and Verified Successfully!
            </Text>
          ) : (
            <>
              <Text style={styles.messageSuccess}>
                Account Created Successfully!
              </Text>
              <Text style={styles.subMessage}>
                Please verify your email to log in
              </Text>
            </>
          )}
        </View>

        <View style={styles.footerContainer}>
          {countdown > 0 && (
            <Text style={styles.countdownText}>
              Redirecting in {countdown}...
            </Text>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  safeAreaContainer: {
    flex: 1,
    backgroundColor: "#FFF",
    // paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0, // Jeśli potrzebne
  },
  stepperWrapper: {
    width: "87.6%",
    alignSelf: "center",
    marginTop: 40,
    paddingBottom: 20, // Zmniejszono trochę, aby dać więcej miejsca treści
  },
  mainContentContainer: {
    flex: 1, // Ten kontener zajmie dostępną przestrzeń, pchając stopkę na dół
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    // paddingTop: -75, // Usunięto, pozwólmy flexboxowi zarządzać przestrzenią
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFF",
  },
  messageSuccess: {
    fontSize: 24,
    fontFamily: "Figtree-Bold", // Dodano font
    color: "#05ad50",
    textAlign: "center",
    // marginTop: 10,
    marginBottom: 20,
    // paddingTop: -5,
    marginTop: 3,
  },
  messageVerified: {
    // Dodatkowy styl, jeśli chcesz inaczej stylować zweryfikowane
    fontSize: 24,
    fontFamily: "Figtree-Bold", // Dodano font
    color: "#05ad50",
    textAlign: "center",
    marginTop: 3,
    marginBottom: 20,
    // paddingTop: -1,
  },
  subMessage: {
    fontSize: 16,
    fontFamily: "Figtree-Medium", // Dodano font
    color: "#555",
    textAlign: "center",
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  footerContainer: {
    paddingVertical: 16, // Odstęp dla stopki
    alignItems: "center", // Wyśrodkuj tekst w stopce
    width: "100%",
  },
  countdownText: {
    fontSize: 16,
    fontFamily: "Figtree-Regular", // Dodano font
    color: "#888",
  },
});
