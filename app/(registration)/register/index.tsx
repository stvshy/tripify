import React, { useState, useEffect, useContext, useCallback } from "react";
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
  Keyboard,
  StatusBar,
  BackHandler,
  TextInput as RNTextInput,
  TouchableOpacity,
} from "react-native";
import { ActivityIndicator } from "react-native-paper";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
} from "firebase/auth";
import { auth } from "../../config/firebaseConfig";
import { useRouter } from "expo-router";
import { getFirestore, setDoc, doc, serverTimestamp } from "firebase/firestore";
import CustomStepIndicator from "../../../components/CustomStepIndicator";
import { Feather, Ionicons, MaterialIcons } from "@expo/vector-icons";
import RegisterHeader from "./RegisterHeader";
import RegisterForm from "./RegisterForm";
import RegisterFooter from "./RegisterFooter";
import { useAuthStore, UserProfileData } from "@/app/store/authStore";
import { ScrollViewIndicator } from "@fanchenbao/react-native-scroll-indicator";
const { width, height } = Dimensions.get("window");
const db = getFirestore();
const ESTIMATED_STEPPER_HEIGHT = 70;
export default function RegisterScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const scrollViewPaddingBottom = errorMessage ? 50 : 0;
  const scrollViewMarginTop = errorMessage ? 0 : 0;
  const scrollViewPaddingTop = errorMessage ? height * 0.022 : 0;
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const requirementPaddingBottom = isKeyboardVisible ? 20 : 0;
  const [isLoading, setIsLoading] = useState(false);
  //   const stepperHeight = useContext(StepperHeightContext);
  const router = useRouter();

  const [passwordRequirements, setPasswordRequirements] = useState({
    length: false,
    specialChar: false,
    upperCase: false,
    number: false,
  });
  const [resendTimer, setResendTimer] = useState(0);

  const [isFocused, setIsFocused] = useState({
    email: false,
    password: false,
    confirmPassword: false,
  });
  const primaryError = emailError || errorMessage;

  // Timer odliczający czas do ponownego wysłania maila
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
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    setEmailError(
      email && !emailPattern.test(email)
        ? "Please enter a valid e-mail address"
        : null
    );
  }, [email]);

  useEffect(() => {
    setPasswordRequirements({
      length: password.length >= 6,
      specialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
      upperCase: /[A-Z]/.test(password),
      number: /[0-9]/.test(password),
    });
  }, [password]);
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      "keyboardDidShow",
      () => {
        setKeyboardVisible(true); // Klawiatura jest widoczna
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      "keyboardDidHide",
      () => {
        setKeyboardVisible(false); // Klawiatura została ukryta
      }
    );

    // Obsługa systemowego przycisku back
    const handleBackPress = () => {
      router.replace("/welcome");
      return true;
    };
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      handleBackPress
    );

    // Czyszczenie nasłuchiwaczy po odmontowaniu komponentu
    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
      backHandler.remove();
    };
  }, [router]);
  const { setFirebaseUser, setUserProfile } = useAuthStore();
  const handleRegister = async () => {
    setErrorMessage(null);
    setIsLoading(true); // Ustawienie spinnera na "true"

    if (!email) {
      setErrorMessage("Please enter your e-mail address");
      setIsLoading(false);
      return;
    }

    if (!password) {
      setErrorMessage("Please enter a password");
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match");
      setIsLoading(false);
      return;
    }

    if (
      !passwordRequirements.length ||
      !passwordRequirements.specialChar ||
      !passwordRequirements.upperCase ||
      !passwordRequirements.number
    ) {
      setErrorMessage("Password does not meet all requirements");
      setIsLoading(false);
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      // ZMIANA ZACZYNA SIĘ TUTAJ

      // 1. Przygotuj dane profilu, które zapiszesz
      const newUserProfile: UserProfileData = {
        nickname: null,
        firstLoginComplete: false,
        emailVerified: user.emailVerified, // Będzie `false`
      };

      // 2. Zapisz dokument w Firestore
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        nickname: newUserProfile.nickname,
        isVerified: user.emailVerified,
        createdAt: serverTimestamp(),
        authProvider: "email",
        firstLoginComplete: newUserProfile.firstLoginComplete,
      });

      // 3. Zaktualizuj globalny stan (store) OD RAZU
      setFirebaseUser(user);
      setUserProfile(newUserProfile);

      // 4. Wyślij e-mail weryfikacyjny
      await sendEmailVerification(user);

      // 5. Przekieruj - teraz RootLayout będzie miał już aktualne dane ze store'u
      router.replace("/setNickname");
    } catch (error: any) {
      switch (error.code) {
        case "auth/email-already-in-use":
          setErrorMessage("This e-mail is already registered.");
          break;
        case "auth/invalid-email":
          setErrorMessage("Please enter a valid e-mail address.");
          break;
        case "auth/weak-password":
          setErrorMessage("The password is too weak.");
          break;
        default:
          setErrorMessage("An unknown error occurred. Please try again.");
      }
    } finally {
      setIsLoading(false); // Wyłączenie spinnera po zakończeniu
    }
  };

  const renderValidationIcon = (isValid: boolean) => (
    <FontAwesome
      name={isValid ? "check-circle" : "times-circle"}
      size={18}
      color={isValid ? "#00dea8" : "#a43267"}
      style={styles.iconRequirement}
    />
  );
  const fallbackIndicatorHeight = Platform.select({
    ios: (StatusBar.currentHeight || 0) + 44 + 15, // SafeAreaView na iOS często już uwzględnia pasek statusu. 44 to typowa wysokość nagłówka, 15 paddingi wskaźnika.
    android: (StatusBar.currentHeight || 24) + 15 + 15 + 15, // Pasek statusu + paddingTop z _layout + paddingBottom z _layout + dodatkowy mały margines
    default: 80, // Zwiększony fallback
  });
  //   const currentPaddingTop =
  //     stepperHeight > 0 ? stepperHeight : fallbackIndicatorHeight;
  //   const [effectivePaddingTop, setEffectivePaddingTop] = useState(
  //     fallbackIndicatorHeight
  //   );

  //   useEffect(() => {
  //     if (stepperHeight > 0) {
  //       setEffectivePaddingTop(stepperHeight);
  //     } else {
  //       // Jeśli indicatorHeight to wciąż 0, użyj fallbacku.
  //       // Można by to jeszcze bardziej zoptymalizować, aby nie ustawiać jeśli już jest fallbackiem.
  //       setEffectivePaddingTop(fallbackIndicatorHeight);
  //     }
  //   }, [stepperHeight, fallbackIndicatorHeight]);
  return (
    <ImageBackground
      source={require("../../../assets/images/register2.png")}
      style={styles.background}
      imageStyle={styles.backgroundImageStyle}
      fadeDuration={0}
    >
      <View style={styles.overlay} />
      <SafeAreaView style={styles.screenContainer}>
        {/* iOS: KAV padding; Android: bez KAV (eliminacja artefaktu nad klawiaturą) */}
        {Platform.OS === "ios" ? (
          <KeyboardAvoidingView
            behavior="padding"
            keyboardVerticalOffset={0}
            style={styles.keyboardAvoidingViewContainer}
          >
            <ScrollViewIndicator
              position="right"
              indStyle={{
                backgroundColor: "#FFFFFF",
                width: 3,
                borderRadius: 2,
                opacity: isKeyboardVisible ? 1 : 0,
              }}
              containerStyle={{ flex: 1, alignSelf: "stretch" }}
              scrollViewProps={{
                style: styles.scrollView,
                contentContainerStyle: [
                  styles.scrollViewContent,
                  { paddingBottom: isKeyboardVisible ? 60 : 6 },
                ],
                keyboardShouldPersistTaps: "handled",
                showsVerticalScrollIndicator: false,
                contentInsetAdjustmentBehavior: "never",
                indicatorStyle: "white",
              }}
            >
              <View style={styles.stepperWrapperInScroll}>
                <CustomStepIndicator
                  currentPosition={0}
                  labels={["Register", "Username", "Success"]}
                  stepCount={3}
                />
              </View>

              <RegisterHeader
                title="Create an Account in Tripify"
                errorMessage={primaryError}
              />

              <RegisterForm
                email={email}
                setEmail={setEmail}
                password={password}
                setPassword={setPassword}
                confirmPassword={confirmPassword}
                setConfirmPassword={setConfirmPassword}
                showPassword={showPassword}
                setShowPassword={setShowPassword}
                showConfirmPassword={showConfirmPassword}
                setShowConfirmPassword={setShowConfirmPassword}
                isFocused={isFocused}
                setIsFocused={setIsFocused}
                passwordRequirements={passwordRequirements}
                renderValidationIcon={renderValidationIcon}
              />
              {isKeyboardVisible && <View style={{ height: 40 }} />}
            </ScrollViewIndicator>
          </KeyboardAvoidingView>
        ) : (
          <View style={styles.keyboardAvoidingViewContainer}>
            <ScrollViewIndicator
              position="right"
              indStyle={{
                backgroundColor: "#FFFFFF",
                width: 3,
                borderRadius: 2,
                opacity: isKeyboardVisible ? 1 : 0,
              }}
              containerStyle={{ flex: 1, alignSelf: "stretch" }}
              scrollViewProps={{
                style: styles.scrollView,
                contentContainerStyle: [
                  styles.scrollViewContent,
                  { paddingBottom: isKeyboardVisible ? 60 : 0 },
                  isKeyboardVisible ? { minHeight: height + 128 } : null,
                ],
                keyboardShouldPersistTaps: "handled",
                showsVerticalScrollIndicator: false,
                overScrollMode: "always",
                removeClippedSubviews: false,
                scrollEventThrottle: 16,
                keyboardDismissMode: "interactive",
                nestedScrollEnabled: true,
              }}
            >
              <View style={styles.stepperWrapperInScroll}>
                <CustomStepIndicator
                  currentPosition={0}
                  labels={["Register", "Username", "Success"]}
                  stepCount={3}
                />
              </View>

              <RegisterHeader
                title="Create an Account in Tripify"
                errorMessage={primaryError}
              />

              <RegisterForm
                email={email}
                setEmail={setEmail}
                password={password}
                setPassword={setPassword}
                confirmPassword={confirmPassword}
                setConfirmPassword={setConfirmPassword}
                showPassword={showPassword}
                setShowPassword={setShowPassword}
                showConfirmPassword={showConfirmPassword}
                setShowConfirmPassword={setShowConfirmPassword}
                isFocused={isFocused}
                setIsFocused={setIsFocused}
                passwordRequirements={passwordRequirements}
                renderValidationIcon={renderValidationIcon}
              />
              {isKeyboardVisible && <View style={{ height: 40 }} />}
            </ScrollViewIndicator>
          </View>
        )}

        {/* Footer with Buttons */}
        <RegisterFooter
          isLoading={isLoading}
          onSubmit={handleRegister}
          onGoToLogin={() => router.replace("/welcome")}
        />
      </SafeAreaView>
    </ImageBackground>
  );
}

const getRequirementText = (key: string) => {
  switch (key) {
    case "length":
      return "Password must be at least 6 characters";
    case "specialChar":
      return "Password must contain at least one special character";
    case "upperCase":
      return "Password must contain at least one uppercase letter";
    case "number":
      return "Password must contain at least one number";
    default:
      return "";
  }
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  background: {
    flex: 1,
    // resizeMode: "cover",
  },
  backgroundImageStyle: {
    // Dodane dla imageStyle z ImageBackground
    resizeMode: "cover",
  },
  //   container: {
  //     flex: 1,
  //     justifyContent: "space-between", // Rozmieszczenie zawartości od góry do dołu
  //     alignItems: "center",
  //     padding: 16,
  //     // backgroundColor: "rgba(255, 255, 255, 0.08)",
  //   },
  keyboardAvoidingView: {
    flex: 1,
    width: "100%",
  },
  scrollView: {
    flex: 1, // ScrollView musi wypełnić KAV
    width: "100%", // Upewnij się, że ScrollView zajmuje całą szerokość
    // paddingBottom: -30,
  },
  scrollViewContent: {
    flexGrow: 1, // Pozwala kontenerowi rosnąć i wypełniać ScrollView, umożliwiając scroll
    alignItems: "center", // Utrzymuje centrowanie elementów w poziomie
    // justifyContent: "center", // USUŃ LUB ZAKOMENTUJ TĘ LINIĘ
    // marginTop: 10, // Możesz dostosować lub usunąć, jeśli niepotrzebne
    // marginBottom: 5, // Możesz dostosować lub usunąć
    // paddingBottom: -30, // Dodaj trochę przestrzeni na dole przewijanej zawartości
  },
  logo: {
    width: "40%", // Procentowa szerokość
    height: height * 0.183, // Możesz dostosować, jeśli chcesz bardziej responsywne
  },
  logoContainer: {
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
    marginTop: height * 0.061, // Zmniejszony margines górny dla lepszego rozmieszczenia
    width: "100%",
  },
  title: {
    fontSize: width * 0.064,
    fontFamily: "Figtree-Medium",
    textAlign: "center",
    // marginBottom: 30.2,
    color: "#FFFFFF",
    width: "100%",
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
    marginBottom: 2.6,
  },
  inputIconRight: {
    marginLeft: 12,
  },
  customInput: {
    flex: 1,
    fontSize: 14.8,
    fontFamily: "PlusJakartaSans-Regular",
    color: "#E5E7EB",
    paddingVertical: 0,
    marginBottom: 4,
  },
  inputFocused: {
    borderColor: "#FFFFFF",
  },
  inputUnfocusedText: {
    // Możesz dodać dodatkowe style dla tekstu w unfocused state, jeśli potrzebujesz
  },
  iconLeft: {
    marginLeft: 10,
  },
  iconRight: {
    marginRight: 10,
  },
  iconRequirement: {
    marginRight: 8,
    fontSize: 16,
    marginTop: 2,
  },
  error: {
    color: "#F472B6",
    marginBottom: 10,
    fontSize: 13,
    textAlign: "center",
    width: "90%",
    fontFamily: "PlusJakartaSans-Regular",
  },
  errorHolder: {
    minHeight: 33,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  errorTop: {
    color: "#F472B6",
    marginBottom: 6,
    marginTop: 0,
    fontSize: 13,
    textAlign: "center",
    width: "90%",
    fontFamily: "PlusJakartaSans-Regular",
  },
  keyboardAvoidingViewContainer: {
    // KAV opakowujący ScrollView
    flex: 1,
    backgroundColor: "transparent", // DODAJ TĘ LINIĘ
  },
  stepperWrapperInScroll: {
    // Wrapper dla wskaźnika, gdy jest w ScrollView
    width: "88%", // Aby zajął całą szerokość i paddingi działały poprawnie
    marginTop: 40, // Większy padding, gdy jest częścią scrolla
    // paddingHorizontal: 0, // PaddingHorizontal będzie z scrollViewContent
    // backgroundColor: 'rgba(0,0,0,0.1)', // Test
    // marginLeft: 8.8,
    marginRight: 2.3,
    marginBottom: -20,
  },
  requirementsContainer: {
    marginTop: 6,
    // marginBottom: 20,
    width: width * 0.88,
    marginLeft: -14,
  },
  requirementRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 5,
  },
  screenContainer: {
    // Główny SafeAreaView dla ekranu
    flex: 1,
    // paddingTop NIE JEST POTRZEBNY TUTAJ, bo wskaźnik jest wewnątrz
    // justifyContent: "space-between", // Możesz potrzebować, jeśli KAV i footer mają się rozłożyć
    justifyContent: "space-between", // WAŻNE: Upewnij się, że to jest aktywne
    backgroundColor: "transparent", // DODAJ TĘ LINIĘ
  },
  stepperWrapper: {
    // Ten wrapper zawiera wskaźnik i dba o jego paddingi
    paddingVertical: 15,
    paddingHorizontal: 20,
    // backgroundColor: 'rgba(0,0,0,0.1)', // Dla testu, aby zobaczyć jego obszar
    // Nie potrzebuje position: absolute
  },
  requirementText: {
    fontSize: 13.6,
    fontFamily: "PlusJakartaSans-Regular",
    flex: 1,
    flexWrap: "wrap",
  },
  valid: {
    color: "#b0f5e5",
  },
  invalid: {
    color: "#fcc7e8",
  },
  footer: {
    width: "100%", // Upewnij się, że footer zajmuje całą szerokość
    alignItems: "center",
    paddingTop: 9,
    paddingBottom: 16,
    // marginBottom: 16,
    // Możesz dodać tło lub inne style, jeśli potrzebujesz
  },
  registerButton: {
    width: width * 0.9,
    height: 47,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    borderRadius: 999,
    marginTop: 8,
    alignSelf: "center",
  },
  registerButtonInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 47,
  },
  registerButtonText: {
    fontSize: 14,
    fontFamily: "PlusJakartaSans-SemiBold",
    color: "#4F21A5",
  },
  authFooterContainer: {
    width: "100%",
    alignItems: "center",
    paddingTop: 16,
    paddingBottom: 20,
  },
  authFooterText: {
    color: "#D1D5DB",
    fontSize: 13,
    fontFamily: "PlusJakartaSans-Regular",
  },
  authFooterLink: {
    color: "#FFFFFF",
    fontFamily: "PlusJakartaSans-SemiBold",
  },
  scrollViewWithError: {
    marginBottom: 60, // Bazowy margines + 20 pikseli
  },
  safeAreaContainer: {
    // Zmieniona nazwa z 'container' dla jasności
    flex: 1, // Musi wypełnić ImageBackground (minus obszary systemowe i nasz paddingTop)
    justifyContent: "space-between",
    alignItems: "center",
    // Usunięto padding: 16, ponieważ paddingTop jest dynamiczny,
    // a inne paddingi można dodać bardziej szczegółowo.
    paddingHorizontal: 16, // Zachowujemy padding boczny
    // paddingBottom: Platform.OS === 'ios' ? 0 : 10, // Można dostosować lub przenieść do footera
  },
});
