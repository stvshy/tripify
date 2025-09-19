import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ImageBackground,
  SafeAreaView,
  Dimensions,
  Platform,
  Pressable,
  TouchableWithoutFeedback,
  Keyboard,
  TextInput as RNTextInput,
  Animated,
  BackHandler,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth, db } from "../config/firebaseConfig";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useRouter } from "expo-router";

const { width, height } = Dimensions.get("window");

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState({ email: false });
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [isContentShifted, setIsContentShifted] = useState(false);
  const router = useRouter();

  // Animacja dla przesunięcia zawartości
  const contentTranslateY = useRef(new Animated.Value(0)).current;
  // Ref do TextInput żeby móc go programowo odfocusować
  const textInputRef = useRef<RNTextInput>(null);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      "keyboardDidShow",
      () => {
        setIsKeyboardVisible(true);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      "keyboardDidHide",
      () => {
        setIsKeyboardVisible(false);
        // Gdy klawiatura się chowa, programowo usuwamy focus z inputu (jak w community/index.tsx)
        textInputRef.current?.blur();
        // Resetuj pozycję zawartości gdy klawiatura się chowa - płynniej
        setIsContentShifted(false);
        Animated.timing(contentTranslateY, {
          toValue: 0,
          duration: 250, // Bardziej płynna animacja powrotu
          useNativeDriver: true,
        }).start();
      }
    );

    // Obsługa przycisku back na Androidzie - proste podejście jak w community/index.tsx
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (isFocused.email) {
          // Jeśli TextInput jest sfokusowany, po prostu odfokusuj go
          textInputRef.current?.blur();
          return true; // Zapobiegamy domyślnemu zachowaniu
        }
        return false; // Pozwalamy na domyślne zachowanie (np. wyjście z ekranu)
      }
    );

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
      backHandler.remove();
    };
  }, [contentTranslateY]);

  const handleInputFocus = () => {
    setIsFocused({ ...isFocused, email: true });

    // Za każdym razem przesuń zawartość do góry
    setIsContentShifted(true);

    // Zatrzymaj poprzednią animację i natychmiastowo ustaw na pozycję startową
    contentTranslateY.stopAnimation();
    contentTranslateY.setValue(0);

    // Rozpocznij animację przesunięcia do góry
    Animated.timing(contentTranslateY, {
      toValue: -60, // Przesuń zawartość o 80px do góry
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      // Dopiero po zakończeniu animacji zawartości, pozwól klawiaturze się pokazać
      // Klawiatura pokaże się automatycznie po focus na TextInput
    });
  };

  const handleInputBlur = () => {
    setIsFocused({ ...isFocused, email: false });
  };

  const handleScreenPress = () => {
    if (isFocused.email) {
      // Programowo odfocusuj TextInput
      textInputRef.current?.blur();
      Keyboard.dismiss();
      // Płynna animacja powrotu gdy klikamy poza TextInput
      setIsContentShifted(false);
      Animated.timing(contentTranslateY, {
        toValue: 0,
        duration: 250, // Bardziej płynna animacja powrotu
        useNativeDriver: true,
      }).start();
      setIsFocused({ email: false });
    }
  };

  const handlePasswordReset = async () => {
    setMessage(null);
    setError(null);

    if (!email) {
      setError("Please enter your email address.");
      return;
    }

    try {
      // Sprawdzanie, czy email istnieje w Firestore
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", email));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setError("No account found with this email.");
        return;
      }

      // Sprawdzenie, czy konto jest zweryfikowane
      const userData = querySnapshot.docs[0].data();
      if (!userData.isVerified) {
        setError("This account has not been verified.");
        return;
      }

      // Wysłanie linku resetu hasła
      await sendPasswordResetEmail(auth, email);
      setMessage("A password reset link has been sent to your email.");
    } catch (error: any) {
      console.log("Password reset error:", error.code, error.message);
      if (error.code === "permission-denied") {
        setError("Permission denied. Please check your Firestore rules.");
      } else {
        setError("An error occurred. Please try again later.");
      }
    }
  };

  return (
    <Pressable style={styles.fullScreen} onPress={handleScreenPress}>
      <ImageBackground
        source={require("../../assets/images/to spoko.png")}
        style={styles.background}
        imageStyle={{
          resizeMode: "cover",
          width: "130%",
          height: "110%",
          left: -10,
          transform: [{ rotate: "-180deg" }],
        }}
        fadeDuration={0}
      >
        <View style={styles.overlay} />
        <SafeAreaView style={styles.container}>
          <Animated.View
            style={[
              styles.contentContainer,
              {
                transform: [{ translateY: contentTranslateY }],
              },
            ]}
          >
            <View style={styles.logoContainer}>
              <Image
                source={require("../../assets/images/tripify-icon.png")}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.title}>Forgot your password?</Text>
            <Text style={styles.subtitle}>
              Please enter your email address to receive a password reset link.
            </Text>

            {/* Email Input */}
            <Pressable
              style={[
                styles.inputContainer,
                isFocused.email && styles.inputFocused,
              ]}
              onPressIn={(e) => e.stopPropagation()}
            >
              <View style={styles.inputWrapper}>
                <Feather
                  name="mail"
                  size={20}
                  color={isFocused.email ? "#FFFFFF" : "#D1D5DB"}
                  style={styles.inputIcon}
                />
                <RNTextInput
                  ref={textInputRef}
                  placeholder="Email"
                  placeholderTextColor="#D1D5DB"
                  value={email}
                  onChangeText={setEmail}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                  keyboardType="email-address"
                  style={styles.customInput}
                  autoCapitalize="none"
                  blurOnSubmit={true}
                  returnKeyType="done"
                />
              </View>
            </Pressable>
          </Animated.View>

          {/* Komunikaty - poza Animated.View żeby nie wpływały na pozycję zawartości */}
          {message && <Text style={styles.successMessage}>{message}</Text>}
          {error && <Text style={styles.errorMessage}>{error}</Text>}

          {/* Stopka z przyciskami */}
          <View style={styles.footer}>
            <Pressable
              onPress={handlePasswordReset}
              style={styles.sendButton}
              onPressIn={(e) => e.stopPropagation()}
            >
              <Text style={styles.sendButtonText}>Send reset link</Text>
            </Pressable>

            <Pressable
              onPress={() => router.push("/welcome")}
              style={styles.backButton}
              onPressIn={(e) => e.stopPropagation()}
            >
              <Text style={styles.backButtonText}>Back to login</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </ImageBackground>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  background: {
    flex: 1,
    resizeMode: "cover",
  },
  container: {
    flex: 1,
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    paddingBottom: 10,
    backgroundColor: "rgba(0, 0, 0, 0.02)",
  },
  contentContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: width * 0.5,
    height: height * 0.2,
  },
  logoContainer: {
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    marginTop: 20,
  },
  title: {
    fontSize: width * 0.058,
    textAlign: "center",
    marginBottom: 10,
    color: "#FFEEFCFF",
    fontFamily: "PlusJakartaSans-Bold",
  },
  subtitle: {
    fontSize: width * 0.04,
    textAlign: "center",
    marginBottom: 20,
    color: "#FFE3F9D1",
    marginTop: 5,
    fontFamily: "PlusJakartaSans-Regular",
  },
  inputContainer: {
    borderRadius: 999,
    overflow: "hidden",
    marginBottom: 12,
    width: width * 0.9,
    alignSelf: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 2,
    borderColor: "transparent",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    height: 48,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  customInput: {
    flex: 1,
    fontSize: 14.8,
    fontFamily: "PlusJakartaSans-Regular",
    color: "#E5E7EB",
    paddingVertical: 0,
  },
  inputFocused: {
    borderColor: "#FFFFFF",
  },
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
    zIndex: 10,
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
    zIndex: 10,
  },
  footer: {
    width: "100%",
    alignItems: "center",
    paddingVertical: 10,
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
  sendButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    // fontWeight: "bold",
    fontFamily: "PlusJakartaSans-SemiBold",
    marginBottom: 3.5,
  },
  backButton: {
    paddingVertical: 10,
    marginBottom: -5,
  },
  backButtonText: {
    color: "#4a136c",
    fontSize: 14,
    textAlign: "center",
    fontFamily: "PlusJakartaSans-Medium",
  },
});
