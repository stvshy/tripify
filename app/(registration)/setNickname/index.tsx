import React, { useState, useEffect, useMemo } from "react";
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
  StatusBar,
} from "react-native";
import { TextInput } from "react-native-paper";
// import { useDebouncedCallback } from "use-debounce";

const ESTIMATED_HEADER_AREA_HEIGHT =
  Platform.OS === "ios" ? 15 : StatusBar.currentHeight || 0;
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
import { auth } from "../../config/firebaseConfig";
import { useRouter } from "expo-router";
import CustomStepIndicator from "../../../components/CustomStepIndicator"; // <<< DODANE
import { Ionicons } from "@expo/vector-icons";

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
      setErrorMessage("Nickname can only contain letters and numbers");
      setIsNicknameValid(false);
      return;
    }
    if (trimmedNickname.length > 24) {
      setErrorMessage("Nickname cannot exceed 24 characters");
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
        setErrorMessage("This nickname is already taken");
        setIsNicknameValid(false);
      } else {
        setErrorMessage(null);
        setIsNicknameValid(true);
      }
    } catch (error) {
      console.error("Firestore Query Error:", error);
      setErrorMessage("An error occurred while validating the nickname");
      setIsNicknameValid(false);
    }
  };

  const handleSetNickname = async () => {
    if (!nickname.trim()) {
      setErrorMessage("Please enter a nickname");
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
        "An error occurred while setting your nickname. Please try again"
      );
    }
  };

  const handleNicknameChange = (text: string) => {
    setNickname(text);
    setIsNicknameValid(null);
    validateNickname(text);
  };
  const isButtonDisabled =
    !nickname.trim() ||
    isNicknameValid === false ||
    (isNicknameValid === null && nickname.trim().length > 0);
  const styles = useMemo(
    () =>
      StyleSheet.create({
        background: {
          flex: 1,
        },
        // backgroundImageStyle: {
        //   resizeMode: "cover",
        //   width: "140%",
        //   height: "150%",
        //   // Użyj width i height z useWindowDimensions do obliczeń, jeśli potrzebne
        //   left: -width * 0.15, // np. -width * 0.2 lub stała wartość
        //   top: -height * 0.18, // np. -height * 0.2 lub stała wartość
        //   transform: [{ rotate: "-10deg" }],
        // },
        backgroundImageStyle: {
          resizeMode: "cover",
          width: "124%",
          height: "120%",
          left: -20,
          //   right: -10,
          top: -90, // Zakomentowane w Twoim kodzie
          transform: [
            { rotate: "-180deg" }, // Istniejąca rotacja
            { scaleY: -1 }, // Dodane pionowe odbicie lustrzane
          ],
        },
        overlay: {
          ...StyleSheet.absoluteFillObject,
          backgroundColor: "rgba(255, 255, 255, 0.1)",
        },
        safeAreaContainer: {
          flex: 1,
        },
        keyboardAvoidingViewContainer: {
          flex: 1,
          justifyContent: "space-between",
        },
        scrollView: {
          width: "100%",
        },
        scrollViewContent: {
          flexGrow: 1,
          alignItems: "center",
          paddingHorizontal: 16,
          paddingBottom: 20,
        },
        stepperWrapperInScroll: {
          width: "95.6%",
          alignSelf: "center",
          marginTop: 40,
          marginBottom: 20,
        },
        logoContainer: {
          justifyContent: "center",
          alignItems: "center",
          marginBottom: 20,
          marginTop: height * 0.03, // Użycie height z useWindowDimensions
        },
        logo: {
          width: width * 0.42, // Użycie width z useWindowDimensions
          height: height * 0.17, // Użycie height z useWindowDimensions
          marginTop: 80,
        },
        title: {
          fontSize: width * 0.065, // Użycie width z useWindowDimensions
          fontFamily: "Figtree-Bold",
          textAlign: "center",
          marginBottom: 8,
          color: "#FFEEFCFF",
        },
        subtitle: {
          fontSize: width * 0.039, // Użycie width z useWindowDimensions
          fontFamily: "Figtree-Regular",
          textAlign: "center",
          marginBottom: 19,
          color: "#FFE3F9D1",
          paddingHorizontal: 10,
        },
        inputContainer: {
          width: width * 0.89, // Użycie width z useWindowDimensions
          backgroundColor: "#f0ed8f5",
          borderRadius: 28,
          overflow: "hidden",
          marginBottom: 13,
          borderWidth: 2,
          borderColor: "transparent",
          flexDirection: "row",
          alignItems: "center",
          height: height * 0.078, // Użycie height z useWindowDimensions
        },
        input: {
          flex: 1,
          paddingLeft: 5,
          // height: "100%", // Spróbuj usunąć lub ustawić na konkretną liczbę, jeśli ostrzeżenia nadal występują
          fontSize: 15,
        },
        inputFocused: {
          borderColor: "#9002c2",
        },
        inputUnfocusedText: { marginBottom: 4 },
        iconLeft: {
          marginLeft: 12,
          marginRight: 5,
          marginTop: 9, // Dostosowanie marginesu góry, aby ikona była lepiej wyśrodkowana
        },
        iconRight: {
          marginRight: 12,
        },
        errorMessage: {
          color: "violet",
          textAlign: "center",
          marginBottom: 16,
          fontSize: 12.5,

          fontWeight: "400",
        },
        footer: {
          width: "100%",
          alignItems: "center",
          paddingVertical: 10,
          paddingBottom: Platform.OS === "ios" ? 20 : 15,
        },
        sendButton: {
          backgroundColor: "#9002c2",
          paddingVertical: 13,
          paddingHorizontal: 30,
          alignItems: "center",
          borderRadius: 25,
          width: "90%",
          elevation: 3,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 3.84,
          borderWidth: 0.3,
          borderColor: "#6a1b9a",
        },
        sendButtonDisabled: {
          opacity: 0.6,
        },
        sendButtonText: {
          color: "#FFFFFF",
          fontSize: 16,
          fontFamily: "Inter-SemiBold",
        },
      }),
    [width, height] // Zależności dla useMemo
  );

  return (
    <ImageBackground
      //   source={require("../../../assets/images/gradient2.jpg")}
      source={require("../../../assets/images/to spoko.png")}
      style={styles.background}
      imageStyle={styles.backgroundImageStyle}
      fadeDuration={0}
    >
      <View style={styles.overlay} />
      <SafeAreaView style={styles.safeAreaContainer}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardAvoidingViewContainer}
          keyboardVerticalOffset={0} // Ustawione na 0, bo stepper jest w scrollu
        >
          <ScrollView
            contentContainerStyle={styles.scrollViewContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            style={styles.scrollView}
          >
            <View style={styles.stepperWrapperInScroll}>
              <CustomStepIndicator
                currentPosition={1}
                labels={["Register", "Username", "Success"]}
                stepCount={3}
              />
            </View>
            <View style={styles.logoContainer}>
              <Image
                source={require("../../../assets/images/tripify-icon.png")}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.title}>Choose a Nickname</Text>
            <Text style={styles.subtitle}>
              This will be your unique identifier in Tripify
            </Text>
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
                    primary: isFocused.nickname ? "#9002c2" : "transparent",
                    placeholder: "#9002c2",
                    background: "#f0ed8f5",
                    text: "#000",
                  },
                  roundness: 28,
                }}
                underlineColor="transparent"
                left={
                  <TextInput.Icon
                    icon={() => (
                      <Ionicons
                        name="person"
                        size={20}
                        color={isFocused.nickname ? "#9002c2" : "#606060"}
                      />
                    )}
                    style={styles.iconLeft}
                  />
                }
                autoCapitalize="none"
                right={
                  nickname.trim() && isNicknameValid !== null ? (
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
                  ) : null
                }
              />
            </View>
            {errorMessage && (
              <Text style={styles.errorMessage}>{errorMessage}</Text>
            )}
          </ScrollView>
          <View style={styles.footer}>
            <Pressable
              onPress={handleSetNickname}
              style={[
                styles.sendButton,
                isButtonDisabled && styles.sendButtonDisabled,
              ]}
              disabled={isButtonDisabled}
            >
              <Text style={styles.sendButtonText}>Save Nickname</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
  );
}
