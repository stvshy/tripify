import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ImageBackground,
  SafeAreaView,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
  Animated,
  BackHandler,
  TextInput as RNTextInput,
} from "react-native";
import * as NavigationBar from "expo-navigation-bar";
import * as SystemUI from "expo-system-ui";
import { StatusBar } from "expo-status-bar";
import {
  hideNavBar,
  showNavBar,
  cleanupNavBarTimer,
  startNavBarAutoHide,
  stopNavBarAutoHide,
} from "../utils/navigationBar";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import {
  LoginManager,
  AccessToken,
  GraphRequest,
  GraphRequestManager,
} from "react-native-fbsdk-next";
import {
  getAuth,
  FacebookAuthProvider,
  signInWithCredential,
  fetchSignInMethodsForEmail,
  signInWithEmailAndPassword,
  sendEmailVerification,
} from "firebase/auth";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  getFirestore,
  updateDoc,
} from "firebase/firestore";
import { auth, db } from "../config/firebaseConfig";
import { useAuthStore } from "../store/authStore";
import LoginHeader from "./LoginHeader";
import LoginForm from "./LoginForm";
import SocialAuthRow from "./SocialAuthRow";
import AuthFooter from "./AuthFooter";
import GradientBackdrop from "./GradientBackdrop";
import { useKeyboardAnimation } from "./useKeyboardAnimation";
import { ScaledSheet } from "react-native-size-matters";
import Reanimated, { FadeInUp, FadeInDown } from "react-native-reanimated";

const { width, height } = Dimensions.get("window");

export default function WelcomeScreen() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [verificationMessage, setVerificationMessage] = useState<string | null>(
    null
  );
  const [resendTimer, setResendTimer] = useState<number>(0);
  const [isFocused, setIsFocused] = useState({
    identifier: false,
    password: false,
  });
  const [isLoading, setIsLoading] = useState<boolean>(false); // Dodany spinner
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [isContentShifted, setIsContentShifted] = useState(false);
  const { setUserProfile } = useAuthStore();

  // Hook dla animacji
  const { contentTranslateY, animateToTop, animateToBottom, resetAnimation } =
    useKeyboardAnimation();

  // Refs do TextInputów żeby móc je programowo odfocusować
  const identifierInputRef = useRef<RNTextInput>(null);
  const passwordInputRef = useRef<RNTextInput>(null);
  useEffect(() => {
    if (resendTimer > 0) {
      const timerId = setInterval(
        () => setResendTimer((prev: number) => prev - 1),
        1000
      );
      return () => clearInterval(timerId);
    }
  }, [resendTimer]);

  // Prefer SystemBars to control transient nav bar; keep helpers as fallback
  useEffect(() => {
    hideNavBar();
    startNavBarAutoHide();
    return () => {
      cleanupNavBarTimer();
      stopNavBarAutoHide();
    };
  }, []);

  // Ensure nav bar is hidden immediately on screen focus (prevents brief icon flash)
  useFocusEffect(
    useCallback(() => {
      hideNavBar();
      startNavBarAutoHide();
      return () => {
        cleanupNavBarTimer();
        stopNavBarAutoHide();
      };
    }, [])
  );

  useEffect(() => {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (identifier && isEmail(identifier.trim().toLowerCase())) {
      setEmailError(
        emailPattern.test(identifier.trim().toLowerCase())
          ? null
          : "Please enter a valid e-mail address."
      );
    } else {
      setEmailError(null);
    }
  }, [identifier]);

  // Memoized handlers
  const handleKeyboardHide = useCallback(() => {
    setIsKeyboardVisible(false);
    identifierInputRef.current?.blur();
    passwordInputRef.current?.blur();
    setIsContentShifted(false);
    animateToBottom();
  }, [animateToBottom]);

  const handleBackPress = useCallback(() => {
    if (isFocused.identifier) {
      // Natychmiastowe odfocusowanie - najwyższy priorytet
      identifierInputRef.current?.blur();
      setIsFocused({ identifier: false, password: false });
      // Animacje po odfocusowaniu
      setIsContentShifted(false);
      animateToBottom();
      return true;
    }
    if (isFocused.password) {
      // Natychmiastowe odfocusowanie - najwyższy priorytet
      passwordInputRef.current?.blur();
      setIsFocused({ identifier: false, password: false });
      // Animacje po odfocusowaniu
      setIsContentShifted(false);
      animateToBottom();
      return true;
    }
    return false;
  }, [isFocused.identifier, isFocused.password, animateToBottom]);

  const handleInputFocus = useCallback(
    (field: "identifier" | "password") => {
      setIsFocused((prev) => ({ ...prev, [field]: true }));
      if (!isContentShifted) {
        setIsContentShifted(true);
        resetAnimation();
        animateToTop();
      }
    },
    [resetAnimation, animateToTop, isContentShifted]
  );

  const handleInputBlur = useCallback((field: "identifier" | "password") => {
    setIsFocused((prev) => ({ ...prev, [field]: false }));
  }, []);

  const handleScreenPress = useCallback(
    (event: any) => {
      if (isFocused.identifier || isFocused.password) {
        // Check click position - only dismiss keyboard if clicked above subtitle area
        const { pageY } = event.nativeEvent;
        const subtitleAreaHeight = height * 0.25; // Approximate height to subtitle area

        if (pageY < subtitleAreaHeight) {
          identifierInputRef.current?.blur();
          passwordInputRef.current?.blur();
          Keyboard.dismiss();
          setIsContentShifted(false);
          animateToBottom();
          setIsFocused({ identifier: false, password: false });
        }
      }
    },
    [isFocused.identifier, isFocused.password, animateToBottom]
  );

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      "keyboardDidShow",
      () => {
        setIsKeyboardVisible(true);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      "keyboardDidHide",
      handleKeyboardHide
    );
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      handleBackPress
    );

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
      backHandler.remove();
    };
  }, [handleKeyboardHide, handleBackPress]);

  const validatePassword = () => {
    if (password.length === 0) {
      setErrorMessage("Please enter your password.");
      return false;
    }
    if (password.length < 6) {
      setErrorMessage("Your password must contain at least 6 characters.");
      return false;
    }
    if (!/[A-Z]/.test(password)) {
      setErrorMessage(
        "Your password must include at least one uppercase letter."
      );
      return false;
    }
    if (!/[0-9]/.test(password)) {
      setErrorMessage(
        "Your password must include at least one numeric character."
      );
      return false;
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      setErrorMessage(
        "Your password must include at least one special character."
      );
      return false;
    }
    return true;
  };

  const isEmail = (input: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);

  const handleLogin = async () => {
    setErrorMessage(null);
    setVerificationMessage(null);
    setIsLoading(true); // Rozpoczęcie ładowania

    // Walidacja identyfikatora (e-mail lub pseudonim)
    const emailLower = identifier.trim().toLowerCase();
    const identifierIsEmail = isEmail(emailLower);

    if (identifier.length === 0) {
      setErrorMessage("Please enter your e-mail or nickname.");
      setIsLoading(false);
      return;
    }
    // Walidacja hasła
    if (!validatePassword()) {
      setIsLoading(false);
      return;
    }

    let email = emailLower;

    // Walidacja formatu e-maila, jeśli identyfikator jest e-mailem

    console.log(
      `Identifier: ${identifier}, Email Lowercased: ${emailLower}, Is Email: ${identifierIsEmail}`
    );

    try {
      if (!identifierIsEmail) {
        console.log("Identifier is a nickname");
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("nickname", "==", email));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          setErrorMessage("No account found with this nickname.");
          console.log("No account found with this nickname");
          setIsLoading(false);
          return;
        }

        const userData = querySnapshot.docs[0].data();
        email = userData.email;
        console.log("E-mail found from nickname:", email);
      }

      console.log("Attempting to sign in with email:", email);
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;
      console.log("User signed in:", user.uid);

      if (!user.emailVerified) {
        console.log("E-mail not verified");
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();

          // Sprawdzanie, kiedy ostatnio wysłano e-mail weryfikacyjny
          const emailSentAt = userData.emailSentAt;
          if (emailSentAt) {
            const elapsedSeconds = Math.floor(
              (Date.now() - emailSentAt) / 1000
            );
            const remainingTime = 60 - elapsedSeconds;
            if (remainingTime > 0) {
              setResendTimer(remainingTime);
              console.log("Resend timer set to:", remainingTime);
            }
          }

          // Jeśli jeszcze nie wysłano e-maila lub cooldown minął, wyślij e-mail
          if (!emailSentAt || (Date.now() - emailSentAt) / 1000 >= 60) {
            try {
              await sendEmailVerification(user);
              await updateDoc(userDocRef, { emailSentAt: Date.now() });
              console.log("Verification e-mail sent and e-mailSentAt updated");
              setVerificationMessage(
                "A verification e-mail has been sent to your e-mail address. Please verify to log in."
              );
              setResendTimer(60); // Ustaw cooldown na 60 sekund
            } catch (emailError) {
              console.error("Failed to send verification e-mail:", emailError);
              setErrorMessage(
                "Failed to send verification e-mail. Please try again later."
              );
            }
          } else {
            setVerificationMessage(
              "Your account has not yet been verified. Please check your e-mail inbox for the verification link."
            );
          }
        }

        setErrorMessage("Please verify your e-mail to log in.");
        setIsLoading(false);
        return;
      }

      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const nickname = userData?.nickname;
        const isVerifiedInDb = userData?.isVerified;
        const firstLoginComplete = userData?.firstLoginComplete;

        // <<-- ZMIANA 3: Zaktualizuj stan w Zustand PRZED nawigacją!
        // To jest najważniejsza poprawka.
        setUserProfile({
          nickname: userData.nickname,
          firstLoginComplete: userData.firstLoginComplete,
          emailVerified: user.emailVerified, // Używamy świeżej wartości z obiektu 'user'
        });

        if (!nickname) {
          console.log("Nickname not set, redirecting to setNickname");
          router.replace("/setNickname");
          setIsLoading(false);
          return;
        }

        if (!firstLoginComplete) {
          console.log(
            "User needs to complete country selection, redirecting to chooseCountries"
          );
          router.replace("/chooseCountries");
          setIsLoading(false);
          return;
        }

        // Jeśli doszliśmy tutaj, wszystko jest OK
        console.log(
          "WelcomeScreen: Login successful, all checks passed. REPLACING to / (which should be (tabs)/index)"
        );
        router.replace("/"); // Lub router.replace("/(tabs)/");
        setIsLoading(false);
        return;
      }
    } catch (error: any) {
      console.log("Login error:", error.code, error.message);

      if (error.code === "auth/too-many-requests") {
        setErrorMessage("Too many login attempts. Try again later.");
      } else if (
        error.code === "auth/user-not-found" ||
        error.code === "auth/invalid-email"
      ) {
        setErrorMessage("No account was found with this e-mail or nickname.");
      } else if (error.code === "auth/wrong-password") {
        setErrorMessage("The password you entered is incorrect.");
      } else {
        setErrorMessage("The password you entered is incorrect.");
      }
    } finally {
      setIsLoading(false); // Zakończenie ładowania
    }
  };
  // Funkcja ponownego wysyłania maila
  const resendVerificationEmail = async () => {
    const user = auth.currentUser;
    if (user && !user.emailVerified && resendTimer === 0) {
      try {
        await sendEmailVerification(user);
        await updateDoc(doc(db, "users", user.uid), {
          emailSentAt: Date.now(),
        });
        setVerificationMessage(
          "Verification e-mail resent. Please check your inbox."
        );
        setResendTimer(60);
      } catch (error) {
        console.error("Error resending e-mail verification:", error);
        setErrorMessage(
          "Failed to resend verification e-mail. Please try again later."
        );
      }
    }
  };

  const handleFacebookLogin = async () => {
    try {
      const result = await LoginManager.logInWithPermissions([
        "public_profile",
        "email",
      ]);
      if (result.isCancelled) {
        Alert.alert("Login canceled");
        return;
      }

      const data = await AccessToken.getCurrentAccessToken();
      if (!data) {
        Alert.alert("Error", "Failed to obtain access token.");
        return;
      }

      const facebookCredential = FacebookAuthProvider.credential(
        data.accessToken
      );

      const getFacebookEmail = async () => {
        return new Promise<string | null>((resolve) => {
          const request = new GraphRequest(
            "/me?fields=email",
            {},
            (error, result) => {
              if (error) {
                console.log("Error fetching Facebook e-mail:", error);
                resolve(null);
              } else if (result && result.email) {
                resolve(result.email as string);
              } else {
                resolve(null);
              }
            }
          );
          new GraphRequestManager().addRequest(request).start();
        });
      };

      const email = await getFacebookEmail();
      if (email) {
        const signInMethods = await fetchSignInMethodsForEmail(auth, email);
        if (
          signInMethods.length > 0 &&
          !signInMethods.includes("facebook.com")
        ) {
          Alert.alert(
            "Account exists",
            `An account with this e-mail is already associated with another login method. Please log in with: ${signInMethods[0]}.`
          );
          return;
        }
      }

      const userCredential = await signInWithCredential(
        auth,
        facebookCredential
      );
      const user = userCredential.user;

      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists() && userDoc.data()?.nickname) {
        router.replace("/");
      } else {
        router.replace("/setNickname");
      }
    } catch (error: any) {
      console.error("Facebook login error:", error);
      Alert.alert("Login error", "An error occurred during Facebook login.");
    }
  };

  return (
    <TouchableWithoutFeedback onPress={handleScreenPress}>
      <View style={styles.background}>
        {/* SystemBars removed to avoid native module requirement in current build */}
        <GradientBackdrop />
        <SafeAreaView style={styles.container}>
          <KeyboardAvoidingView
            // behavior={Platform.OS === "ios" ? "padding" : "padding"}
            style={styles.keyboardAvoidingViewContainer}
            // keyboardVerticalOffset={Platform.OS === "ios" ? 0 : -32}
          >
            <Animated.View
              style={[
                styles.contentContainer,
                {
                  transform: [{ translateY: contentTranslateY }],
                },
              ]}
            >
              <Reanimated.View
                entering={FadeInUp.duration(700).springify()}
                style={styles.headerWrapper}
              >
                <LoginHeader
                  errorMessage={errorMessage}
                  verificationMessage={verificationMessage}
                />
              </Reanimated.View>

              <Reanimated.View
                entering={FadeInDown.delay(150).duration(700).springify()}
                style={styles.formWrapper}
              >
                <LoginForm
                  identifier={identifier}
                  setIdentifier={setIdentifier}
                  password={password}
                  setPassword={setPassword}
                  showPassword={showPassword}
                  setShowPassword={setShowPassword}
                  isFocused={isFocused}
                  setIsFocused={setIsFocused}
                  errorMessage={errorMessage}
                  verificationMessage={verificationMessage}
                  resendTimer={resendTimer}
                  resendVerificationEmail={resendVerificationEmail}
                  onSubmit={handleLogin}
                  loading={isLoading}
                  onForgotPassword={() => router.push("/forgotPassword")}
                  onInputFocus={handleInputFocus}
                  onInputBlur={handleInputBlur}
                  identifierInputRef={identifierInputRef}
                  passwordInputRef={passwordInputRef}
                />
              </Reanimated.View>

              <Reanimated.View
                entering={FadeInDown.delay(350).duration(700).springify()}
              >
                <SocialAuthRow onContinueWithFacebook={handleFacebookLogin} />
              </Reanimated.View>
            </Animated.View>
          </KeyboardAvoidingView>

          <Reanimated.View
            entering={FadeInDown.delay(550).duration(700).springify()}
          >
            <AuthFooter
              onCreateAccount={() => router.push("/(registration)/register")}
            />
          </Reanimated.View>
        </SafeAreaView>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = ScaledSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: "9.7@vs",
    marginTop: "10.2@vs",
  },
  keyboardAvoidingViewContainer: {
    flex: 1,
    width: "100%",
  },
  contentContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerWrapper: {
    alignItems: "center",
    marginTop: "58@vs",
  },
  formWrapper: {
    marginTop: "22@vs",
  },
  background: {
    flex: 1,
    backgroundColor: "#111827",
  },
});
