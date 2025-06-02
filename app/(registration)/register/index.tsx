import React, { useState, useEffect, useContext } from "react";
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
} from "react-native";
import { ActivityIndicator, TextInput } from "react-native-paper";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
} from "firebase/auth";
import { auth } from "../../config/firebaseConfig";
import { useRouter } from "expo-router";
import { getFirestore, setDoc, doc, serverTimestamp } from "firebase/firestore";
import CustomStepIndicator from "../../../components/CustomStepIndicator";
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
        ? "Please enter a valid email address."
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

    // Czyszczenie nasłuchiwaczy po odmontowaniu komponentu
    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  const handleRegister = async () => {
    setErrorMessage(null);
    setIsLoading(true); // Ustawienie spinnera na "true"

    if (!email) {
      setErrorMessage("Please enter your email address.");
      setIsLoading(false);
      return;
    }

    if (!password) {
      setErrorMessage("Please enter a password.");
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      setIsLoading(false);
      return;
    }

    if (
      !passwordRequirements.length ||
      !passwordRequirements.specialChar ||
      !passwordRequirements.upperCase ||
      !passwordRequirements.number
    ) {
      setErrorMessage("Password does not meet all requirements.");
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

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        nickname: null,
        isVerified: false,
        createdAt: serverTimestamp(),
        authProvider: "email",
        firstLoginComplete: false,
      });

      // Wysłanie e-maila weryfikacyjnego
      await sendEmailVerification(user);
      setErrorMessage(null);
      setResendTimer(60); // Ustawienie timera na 60 sekund;
      router.replace("/setNickname"); // Przekierowanie do ekranu ustawienia pseudonimu
    } catch (error: any) {
      switch (error.code) {
        case "auth/email-already-in-use":
          setErrorMessage("This email is already registered.");
          break;
        case "auth/invalid-email":
          setErrorMessage("Please enter a valid email address.");
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
        {/* KeyboardAvoidingView opakowuje teraz całą zawartość, która może być przesunięta */}
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardAvoidingViewContainer} // Zmieniony styl, aby zajmował całą dostępną przestrzeń
        >
          {/* ScrollView zawiera WSZYSTKO, co ma być scrollowalne, włącznie ze wskaźnikiem */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[
              styles.scrollViewContent,
              // Dodajemy paddingBottom do scrollViewContent, gdy klawiatura jest widoczna,
              // aby było miejsce na scroll do ostatniego inputu, jeśli footer jest długi
              // To jest alternatywa dla skomplikowanego KAV.
              // { paddingBottom: isKeyboardVisible ? keyboardHeight + 20 : 20 }
              // LUB jeśli KAV dobrze działa z "padding" na iOS, to może nie być potrzebne.
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            // Dla Androida, jeśli tło pojawia się pod klawiaturą:
            contentInsetAdjustmentBehavior="never" // Może pomóc, ale ostrożnie
          >
            {/* 1. Wskaźnik kroków jako pierwszy element w ScrollView */}
            <View style={styles.stepperWrapperInScroll}>
              <CustomStepIndicator
                currentPosition={0}
                labels={["Register", "Username", "Success"]}
                stepCount={3}
              />
            </View>

            {/* 2. Reszta treści poniżej wskaźnika, w tym samym ScrollView */}
            <View style={styles.logoContainer}>
              <Image
                source={require("../../../assets/images/tripify-icon.png")}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.title}>Create an Account in Tripify</Text>

            {emailError && <Text style={styles.errorTop}>{emailError}</Text>}

            {/* Pole do wpisania e-maila */}
            <View
              style={[
                styles.inputContainer,
                isFocused.email && styles.inputFocused,
              ]}
            >
              <TextInput
                label="Email"
                value={email}
                onChangeText={setEmail}
                onFocus={() => setIsFocused({ ...isFocused, email: true })}
                onBlur={() => setIsFocused({ ...isFocused, email: false })}
                keyboardType="email-address"
                style={[
                  styles.input,
                  !isFocused.email && styles.inputUnfocusedText,
                ]}
                theme={{
                  colors: {
                    primary: isFocused.email ? "#9002c2" : "transparent",
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
                        name="envelope"
                        size={20} // Dostosowany rozmiar
                        color={isFocused.email ? "#9002c2" : "#606060"}
                      />
                    )}
                    style={styles.iconLeft}
                  />
                }
                autoCapitalize="none"
              />
            </View>

            {/* Pole do wpisania hasła */}
            <View
              style={[
                styles.inputContainer,
                isFocused.password && styles.inputFocused,
              ]}
            >
              <TextInput
                label="Password"
                value={password}
                onChangeText={setPassword}
                onFocus={() => setIsFocused({ ...isFocused, password: true })}
                onBlur={() => setIsFocused({ ...isFocused, password: false })}
                secureTextEntry={!showPassword}
                style={[
                  styles.input,
                  !isFocused.password && styles.inputUnfocusedText,
                ]}
                theme={{
                  colors: {
                    primary: isFocused.password ? "#9002c2" : "transparent",
                    placeholder: "#6a1b9a",
                    background: "#f0ed8f5",
                    text: "#000",
                  },
                }}
                underlineColor="transparent"
                left={
                  <TextInput.Icon
                    icon={() => (
                      <FontAwesome
                        name="lock"
                        size={23} // Dostosowany rozmiar
                        color={isFocused.password ? "#9002c2" : "#606060"}
                      />
                    )}
                    style={styles.iconLeft}
                  />
                }
                right={
                  <TextInput.Icon
                    icon={showPassword ? "eye-off" : "eye"}
                    size={23}
                    onPress={() => setShowPassword(!showPassword)}
                    color={isFocused.password ? "#9002c2" : "#606060"}
                  />
                }
              />
            </View>

            {/* Pole do potwierdzenia hasła */}
            <View
              style={[
                styles.inputContainer,
                isFocused.confirmPassword && styles.inputFocused,
              ]}
            >
              <TextInput
                label="Confirm Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                onFocus={() =>
                  setIsFocused({ ...isFocused, confirmPassword: true })
                }
                onBlur={() =>
                  setIsFocused({ ...isFocused, confirmPassword: false })
                }
                secureTextEntry={!showConfirmPassword}
                style={[
                  styles.input,
                  !isFocused.confirmPassword && styles.inputUnfocusedText,
                ]}
                theme={{
                  colors: {
                    primary: isFocused.confirmPassword
                      ? "#9002c2"
                      : "transparent",
                    placeholder: "#6a1b9a",
                    background: "#f0ed8f5",
                    text: "#000",
                  },
                }}
                underlineColor="transparent"
                left={
                  <TextInput.Icon
                    icon={() => (
                      <FontAwesome
                        name="lock"
                        size={23}
                        color={
                          isFocused.confirmPassword ? "#9002c2" : "#606060"
                        }
                      />
                    )}
                    style={styles.iconLeft}
                  />
                }
                right={
                  <TextInput.Icon
                    icon={showConfirmPassword ? "eye-off" : "eye"}
                    size={23}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    color={isFocused.confirmPassword ? "#9002c2" : "#606060"}
                  />
                }
              />
            </View>

            {/* Wymogi do hasła */}
            <View
              style={[
                styles.requirementsContainer,
                { paddingBottom: requirementPaddingBottom },
              ]}
            >
              {Object.entries(passwordRequirements).map(([key, value]) => (
                <View style={styles.requirementRow} key={key}>
                  {renderValidationIcon(value)}
                  <Text
                    style={[
                      styles.requirementText,
                      value ? styles.valid : styles.invalid,
                    ]}
                  >
                    {getRequirementText(key)}
                  </Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Footer with Buttons */}
        <View style={styles.footer}>
          {errorMessage && <Text style={styles.error}>{errorMessage}</Text>}
          <Pressable
            onPress={handleRegister}
            style={[styles.registerButton, isLoading && { opacity: 0.7 }]}
            disabled={isLoading} // Wyłączenie przycisku podczas ładowania
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={styles.registerButtonText}>Create account</Text>
              {isLoading && (
                <ActivityIndicator
                  size="small"
                  color="#FFF"
                  style={{ marginLeft: 8, transform: [{ scale: 0.6 }] }}
                />
              )}
            </View>
          </Pressable>

          <Pressable
            onPress={() => router.push("/welcome")}
            style={styles.loginRedirectButton}
          >
            <Text style={styles.loginRedirectText}>
              Already have an account? Log in
            </Text>
          </Pressable>
        </View>
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
    height: height * 0.185, // Możesz dostosować, jeśli chcesz bardziej responsywne
  },
  logoContainer: {
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
    marginTop: height * 0.065, // Zmniejszony margines górny dla lepszego rozmieszczenia
    width: "100%",
  },
  title: {
    fontSize: width * 0.06, // Zastosowanie proporcjonalnej wielkości,
    fontFamily: "Figtree-Medium",
    // fontFamily: "Inter-Regular",
    textAlign: "center",
    marginBottom: 23,
    color: "#FFEEFCFF",
    // marginTop: 5,
    width: "100%",
  },
  inputContainer: {
    borderRadius: 28, // Zwiększony borderRadius dla lepszej estetyki
    overflow: "hidden",
    marginBottom: 13,
    width: width * 0.89,
    height: height * 0.08, // Ustawienie wysokości na 7% wysokości ekranu
    backgroundColor: "#f0ed8f5",
    borderWidth: 2,
    borderColor: "transparent", // Domyślny kolor obramowania
  },
  input: {
    paddingLeft: 1,
    height: 52,
    fontSize: 14,
  },
  inputFocused: {
    borderColor: "#9002c2", // Kolor obramowania w stanie fokusu
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
  },
  error: {
    color: "#f398fa", // Upewnij się, że kolor pasuje do reszty aplikacji
    marginBottom: 12,
    fontSize: 12,
    textAlign: "center",
    width: "90%",
    // paddingVertical: 15,
    // height: height * 0.01
  },
  errorTop: {
    color: "violet", // Upewnij się, że kolor pasuje do reszty aplikacji
    marginBottom: 9,
    marginTop: -10,
    fontSize: 12,
    textAlign: "center",
    width: "90%",
    // paddingVertical: 15
    // height: height * 0.01
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
    marginRight: 0.3,
    marginBottom: -20,
  },
  requirementsContainer: {
    marginTop: 6,
    // marginBottom: 20,
    width: width * 0.88,
  },
  requirementRow: {
    flexDirection: "row",
    alignItems: "center",
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
    fontSize: 12.5,
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
    backgroundColor: "#9502d4",
    paddingVertical: 12,
    paddingHorizontal: 30,
    alignItems: "center",
    borderRadius: 25,
    width: "90%",
    marginBottom: -2,
    elevation: 2, // Dodanie cienia dla efektu uniesienia (Android)
    shadowColor: "#000", // Dodanie cienia dla efektu uniesienia (iOS)
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    borderWidth: 0.3,
    borderColor: "#6a1b9a", // Dodanie obramowania w kolorze wskaźnika
  },
  registerButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  loginRedirectButton: {
    paddingTop: 10,
    marginTop: 2,
    marginBottom: -5,
  },
  loginRedirectText: {
    color: "#4a136c",
    fontSize: 14,
    textAlign: "center",
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
