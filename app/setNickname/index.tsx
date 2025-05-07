import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ImageBackground,
  SafeAreaView,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
  Alert,
  BackHandler,
} from "react-native";
import { TextInput } from "react-native-paper";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import {
  getFirestore,
  doc,
  setDoc,
  getDocs,
  collection,
  query,
  where,
  getDoc,
} from "firebase/firestore";
import { sendEmailVerification } from "firebase/auth";
import { auth } from "../config/firebaseConfig";
import { useRouter } from "expo-router";

const { width, height } = Dimensions.get("window");
const db = getFirestore();

export default function SetNicknameScreen() {
  const [nickname, setNickname] = useState("");
  const [isNicknameValid, setIsNicknameValid] = useState<null | boolean>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [verificationMessage, setVerificationMessage] = useState<string | null>(
    null
  );
  const [resendTimer, setResendTimer] = useState(0);
  const [isFocused, setIsFocused] = useState({ nickname: false });
  const router = useRouter();

  // Zmniejsz licznik co sekundę
  useEffect(() => {
    if (resendTimer > 0) {
      const timerId = setInterval(
        () => setResendTimer((prev) => prev - 1),
        1000
      );
      return () => clearInterval(timerId);
    }
  }, [resendTimer]);

  useEffect(() => {
    const backAction = () => {
      setErrorMessage("You must set your nickname to continue.");
      return true; // Zatrzymuje akcję cofania
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );

    return () => backHandler.remove();
  }, []);

  // Sprawdzenie, czy użytkownik ma już ustawiony nickname
  useEffect(() => {
    const checkUserNickname = async () => {
      const user = auth.currentUser;
      if (user) {
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists() && userDoc.data()?.nickname) {
          router.replace("/"); // Przekieruj na stronę główną, jeśli nick jest już ustawiony
        }
      }
    };
    checkUserNickname();
  }, [router]);

  const validateNickname = async (nickname: string) => {
    const trimmedNickname = nickname.trim();
    if (!/^[a-zA-Z0-9]*$/.test(trimmedNickname)) {
      setErrorMessage("Nickname can only contain letters and numbers.");
      setIsNicknameValid(false);
      return;
    }
    if (trimmedNickname.length > 24) {
      setErrorMessage("Nickname cannot exceed 24 characters.");
      setIsNicknameValid(false);
      return;
    }

    try {
      const lowerCaseNickname = trimmedNickname.toLowerCase();
      const nicknameQuery = query(
        collection(db, "users"),
        where("nickname", "==", lowerCaseNickname)
      );
      const querySnapshot = await getDocs(nicknameQuery);

      if (!querySnapshot.empty) {
        setErrorMessage("This nickname is already taken.");
        setIsNicknameValid(false);
      } else {
        setErrorMessage(null);
        setIsNicknameValid(true);
      }
    } catch (error) {
      console.error("Firestore Query Error:", error);
      setErrorMessage("An error occurred while validating the nickname.");
      setIsNicknameValid(false);
    }
  };

  const handleSetNickname = async () => {
    if (!nickname.trim()) {
      setErrorMessage("Please enter a nickname.");
      return;
    }

    if (!isNicknameValid) {
      return;
    }

    try {
      const user = auth.currentUser;
      if (user) {
        const userDocRef = doc(db, "users", user.uid);
        await setDoc(
          userDocRef,
          { nickname: nickname.toLowerCase(), emailSentAt: Date.now() },
          { merge: true }
        );
        setNickname(nickname);

        router.replace("/success");
      }
    } catch (error) {
      setErrorMessage(
        "An error occurred while setting your nickname. Please try again."
      );
    }
  };

  const handleNicknameChange = (text: string) => {
    setNickname(text);
    setIsNicknameValid(null);
    validateNickname(text);
  };

  return (
    <ImageBackground
      source={require("../../assets/images/gradient2.jpg")}
      style={styles.background}
      imageStyle={{
        resizeMode: "cover",
        width: "140%",
        height: "150%",
        left: -80,
        top: -150,
        transform: [{ rotate: "-10deg" }],
      }}
      fadeDuration={0}
    >
      <View style={styles.overlay} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <SafeAreaView style={styles.container}>
          <ScrollView
            contentContainerStyle={styles.scrollViewContent}
            keyboardShouldPersistTaps="handled"
            style={styles.scrollView}
          >
            <View style={styles.logoContainer}>
              <Image
                source={require("../../assets/images/tripify-icon.png")}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.title}>Choose a Nickname</Text>
            <Text style={styles.subtitle}>
              Please enter a unique nickname to continue.
            </Text>

            {/* Nickname Input */}
            <View
              style={[
                styles.inputContainer,
                isFocused.nickname && styles.inputFocused,
              ]}
            >
              <TextInput
                label="Nickname"
                value={nickname}
                onChangeText={handleNicknameChange}
                onFocus={() => setIsFocused({ ...isFocused, nickname: true })}
                onBlur={() => setIsFocused({ ...isFocused, nickname: false })}
                style={[
                  styles.input,
                  !isFocused.nickname && styles.inputUnfocusedText,
                ]}
                theme={{
                  colors: {
                    primary: isFocused.nickname ? "#6a1b9a" : "transparent",
                    placeholder: "#6a1b9a",
                    background: "#f0ed8f5",
                    text: "#000",
                    error: "red",
                  },
                }}
                underlineColor="transparent"
                left={
                  <TextInput.Icon
                    icon={() => (
                      <FontAwesome
                        name="user"
                        size={20}
                        color={isFocused.nickname ? "#6a1b9a" : "#606060"}
                      />
                    )}
                    style={styles.iconLeft}
                  />
                }
                autoCapitalize="none"
                right={
                  isNicknameValid !== null && (
                    <TextInput.Icon
                      icon={() => (
                        <FontAwesome
                          name={
                            isNicknameValid ? "check-circle" : "times-circle"
                          }
                          size={20}
                          color={isNicknameValid ? "#0ab958" : "#b41151"}
                        />
                      )}
                      style={styles.iconRight}
                    />
                  )
                }
              />
            </View>

            {/* Komunikaty */}
            {errorMessage && (
              <Text style={styles.errorMessage}>{errorMessage}</Text>
            )}
            {verificationMessage && (
              <Text style={styles.successMessage}>{verificationMessage}</Text>
            )}
          </ScrollView>

          {/* Footer with Buttons */}
          <View style={styles.footer}>
            <Pressable
              onPress={handleSetNickname}
              style={styles.sendButton}
              disabled={resendTimer > 0}
            >
              <Text style={styles.sendButtonText}>
                {resendTimer > 0
                  ? `Save Nickname (Resend in ${resendTimer}s)`
                  : "Save Nickname"}
              </Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
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
    justifyContent: "space-between", // Distribute content from top to bottom
    alignItems: "center",
    padding: 16,
    paddingBottom: 10, // Smaller bottom padding, controlled by footer
  },
  scrollView: {
    width: "100%", // Ensure ScrollView takes full width
  },
  scrollViewContent: {
    flexGrow: 1,
    justifyContent: "center", // Adjust as needed
    alignItems: "center",
  },
  logo: {
    width: width * 0.5,
    height: height * 0.2,
  },
  logoContainer: {
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    marginTop: 20, // Reduced top margin for better placement
  },
  title: {
    fontSize: width * 0.06, // Proportional size
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10, // Reduced bottom margin to accommodate subtitle
    color: "#FFEEFCFF",
  },
  subtitle: {
    fontSize: width * 0.04, // Slightly smaller than title
    textAlign: "center",
    marginBottom: 20,
    color: "#FFE3F9D1",
    marginTop: 5,
  },
  inputContainer: {
    width: width * 0.89,
    backgroundColor: "#f0ed8f5",
    borderRadius: 28, // Increased borderRadius for better aesthetics
    overflow: "hidden",
    marginBottom: 13,
    borderWidth: 2,
    borderColor: "transparent", // Default border color
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    flex: 1,
    paddingLeft: 10,
    height: 52,
    fontSize: 15,
  },
  inputFocused: {
    borderColor: "#6a1b9a", // Border color when focused
  },
  inputUnfocusedText: {
    // Additional styles for unfocused state text if needed
  },
  iconLeft: {
    marginLeft: 10,
  },
  validationIcon: {
    // marginRight: -10,
    // marginLeft: 10,
  },
  successMessage: {
    color: "#50baa1",
    textAlign: "center",
    marginBottom: 16,
    fontSize: 12,
  },
  errorMessage: {
    color: "violet",
    textAlign: "center",
    marginBottom: 16,
    fontSize: 12,
  },
  footer: {
    width: "100%", // Ensure footer takes full width
    alignItems: "center",
    paddingVertical: 10,
  },
  sendButton: {
    backgroundColor: "#7511b5",
    paddingVertical: 12,
    paddingHorizontal: 30,
    alignItems: "center",
    borderRadius: 25,
    width: "90%",
    marginBottom: 10,
    elevation: 2, // Shadow effect for Android
    shadowColor: "#000", // Shadow effect for iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  sendButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  backButton: {
    paddingVertical: 10,
    marginBottom: -5,
  },
  backButtonText: {
    color: "#4a136c",
    fontSize: 14,
    textAlign: "center",
  },
  iconRight: {
    // marginLeft: 10,
  },
});
