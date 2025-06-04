import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Image,
  ImageBackground,
  SafeAreaView,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { TextInput, Button } from "react-native-paper";
import { FontAwesome } from "@expo/vector-icons";
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
import { LinearGradient } from "expo-linear-gradient";

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

  useEffect(() => {
    if (resendTimer > 0) {
      const timerId = setInterval(
        () => setResendTimer((prev: number) => prev - 1),
        1000
      );
      return () => clearInterval(timerId);
    }
  }, [resendTimer]);

  useEffect(() => {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (identifier && isEmail(identifier.trim().toLowerCase())) {
      setEmailError(
        emailPattern.test(identifier.trim().toLowerCase())
          ? null
          : "Please enter a valid email address."
      );
    } else {
      setEmailError(null);
    }
  }, [identifier]);

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
      setErrorMessage("Please enter your email or nickname.");
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
        console.log("Email found from nickname:", email);
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
        console.log("Email not verified");
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
              console.log("Verification email sent and emailSentAt updated");
              setVerificationMessage(
                "A verification email has been sent to your email address. Please verify to log in."
              );
              setResendTimer(60); // Ustaw cooldown na 60 sekund
            } catch (emailError) {
              console.error("Failed to send verification email:", emailError);
              setErrorMessage(
                "Failed to send verification email. Please try again later."
              );
            }
          } else {
            setVerificationMessage(
              "Your account has not yet been verified. Please check your email inbox for the verification link."
            );
          }
        }

        setErrorMessage("Please verify your email to log in.");
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
        // Jeśli użytkownik potwierdził e-mail, ale `isVerified` jest `false` w Firestore, zaktualizuj to pole
        if (!isVerifiedInDb && user.emailVerified) {
          await updateDoc(userDocRef, { isVerified: true });
          console.log("User verified in Firestore.");
        }

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
        setErrorMessage("No account was found with this email or nickname.");
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
          "Verification email resent. Please check your inbox."
        );
        setResendTimer(60);
      } catch (error) {
        console.error("Error resending email verification:", error);
        setErrorMessage(
          "Failed to resend verification email. Please try again later."
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
                console.log("Error fetching Facebook email:", error);
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
            `An account with this email is already associated with another login method. Please log in with: ${signInMethods[0]}.`
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
    <ImageBackground
      source={require("../../assets/images/gradient13.png")}
      style={styles.background}
      imageStyle={{
        resizeMode: "cover",
        width: "140%",
        height: "110%",
        left: "-16%",
      }}
      fadeDuration={0}
      blurRadius={10}
    >
      {/* Bardziej neutralny gradient, aby nie wpływać na kolory */}
      {/* <LinearGradient
        colors={["rgba(255, 255, 255, 0.05)", "rgba(255, 255, 255, 0)"]}
        style={StyleSheet.absoluteFillObject}
      /> */}

      <View style={styles.overlay} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <SafeAreaView style={styles.container}>
          <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
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
            <Text style={styles.title}>Welcome to Tripify!</Text>
            <Text style={styles.subtitle}>
              Log in or create an account to start your journey!
            </Text>

            <View
              style={[
                styles.inputContainer,
                isFocused.identifier && styles.inputFocused,
              ]}
            >
              <TextInput
                label="Email or Nickname"
                value={identifier}
                onChangeText={setIdentifier}
                onFocus={() => setIsFocused({ ...isFocused, identifier: true })}
                onBlur={() => setIsFocused({ ...isFocused, identifier: false })}
                keyboardType="default"
                style={[
                  styles.input,
                  !isFocused.identifier && styles.inputUnfocusedText,
                ]}
                autoCapitalize="none"
                theme={{
                  colors: {
                    primary: isFocused.identifier ? "#6a1b9a" : "transparent",
                    placeholder: "#6a1b9a",
                  },
                }}
                underlineColor="transparent"
                textAlignVertical="center" // Wyśrodkowanie tekstu w pionie
                left={
                  <TextInput.Icon
                    icon="account"
                    size={25}
                    style={styles.icon}
                    color={isFocused.identifier ? "#6a1b9a" : "#606060"}
                  />
                }
              />
            </View>

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
                    primary: isFocused.password ? "#6a1b9a" : "transparent",
                    placeholder: "#6a1b9a",
                  },
                }}
                underlineColor="transparent"
                textAlignVertical="center" // Wyśrodkowanie tekstu w pionie
                left={
                  <TextInput.Icon
                    icon="lock"
                    size={25}
                    style={styles.icon}
                    color={isFocused.password ? "#6a1b9a" : "#606060"}
                  />
                }
                right={
                  <TextInput.Icon
                    icon={showPassword ? "eye-off" : "eye"}
                    onPress={() => setShowPassword(!showPassword)}
                    color={isFocused.password ? "#6a1b9a" : "#606060"}
                  />
                }
              />
            </View>

            {/* Wyświetlanie komunikatów */}
            {errorMessage && <Text style={styles.error}>{errorMessage}</Text>}
            {verificationMessage && (
              <>
                <Text style={styles.verificationMessage}>
                  {verificationMessage}
                </Text>
                <Button
                  mode="text"
                  onPress={resendVerificationEmail}
                  disabled={resendTimer > 0}
                  style={styles.resendButton}
                  labelStyle={{
                    color: resendTimer > 0 ? "#A68EAC" : "#e9bfec",
                  }} // Ustaw kolor tekstu
                >
                  {resendTimer > 0
                    ? `Resend Verification Email (${resendTimer}s)`
                    : "- Resend Verification Email -"}
                </Button>
              </>
            )}

            <Button
              mode="contained"
              onPress={handleLogin}
              style={styles.loginButton}
              labelStyle={styles.buttonLabel}
              loading={isLoading} // spinner
            >
              Log in
            </Button>

            <Button
              mode="contained"
              onPress={() => router.push("/(registration)/register")}
              style={styles.registerButton}
              labelStyle={styles.buttonLabel}
            >
              Create your account
            </Button>

            <View style={styles.separatorContainer}>
              <View style={styles.line} />
              <Text style={styles.orText}>or</Text>
              <View style={styles.line} />
            </View>

            <Button
              mode="text"
              onPress={handleFacebookLogin}
              style={styles.facebookButton}
              icon={() => (
                <FontAwesome name="facebook" size={24} color="#FFF" />
              )}
              labelStyle={styles.facebookButtonText}
            >
              Continue with Facebook
            </Button>
          </ScrollView>

          <View style={styles.footer}>
            <Button
              mode="text"
              onPress={() => router.push("/forgotPassword")}
              style={styles.forgotPasswordButton}
              labelStyle={styles.forgotPasswordLabel}
            >
              Forgot password?
            </Button>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    // backgroundColor: "rgba(255, 0, 225, 0.09)",
    backgroundColor: "rgba(0, 179, 255, 0.02)",
  },
  container: {
    flex: 1,
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 10,
    marginTop: height * 0.015,
  },
  scrollView: {
    width: "100%",
  },
  resendButton: {
    marginTop: 6,
    color: "#B10CBD",
  },
  verificationMessage: {
    color: "#da94df",
    fontSize: 12,
    textAlign: "center",
  },
  logo: {
    width: width * 0.5,
    height: height * 0.2,
  },
  logoContainer: {
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    marginTop: 63,
  },
  title: {
    fontSize: width * 0.06,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
    color: "#FFEEFCFF",
  },
  subtitle: {
    fontSize: width * 0.037,
    textAlign: "center",
    marginBottom: 20,
    color: "#FFE3F9D1",
    marginTop: 7,
  },
  inputContainer: {
    borderRadius: 25,
    overflow: "hidden",
    marginBottom: 13,
    width: width * 0.89,
    justifyContent: "center",
    alignSelf: "center",
  },

  input: {
    height: height * 0.07,
    fontSize: height * 0.022,
    paddingLeft: 1,
    textAlignVertical: "center",
  },
  inputFocused: {
    borderColor: "#6a1b9a",
    borderWidth: 2,
  },
  inputUnfocusedText: {
    fontSize: 14,
  },
  icon: {
    marginLeft: 10,
  },
  error: {
    color: "violet",
    fontSize: 12,
    textAlign: "center",
    // marginTop: -5,
    marginBottom: 5,
  },
  loginButton: {
    width: width * 0.89,
    height: height * 0.054,
    backgroundColor: "#7511b5",
    justifyContent: "center",
    borderRadius: 25,
    marginTop: 8,
    alignSelf: "center",
  },
  registerButton: {
    width: width * 0.89,
    height: height * 0.054,
    backgroundColor: "#5b0d8d",
    justifyContent: "center",
    borderRadius: 25,
    marginTop: 11,
    borderWidth: 1.1,
    borderColor: "#340850",
    alignSelf: "center",
  },
  buttonLabel: {
    fontSize: 12.5,
    lineHeight: 14,
    color: "#FFFFFF",
    textAlign: "center",
  },
  facebookButton: {
    backgroundColor: "#4267B2",
    width: width * 0.89,
    height: height * 0.054,
    justifyContent: "center",
    borderRadius: 25,
    alignSelf: "center",
  },
  facebookButtonText: {
    color: "#FFF",
    fontSize: 12.5,
    lineHeight: 18,
  },
  separatorContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 9,
    width: "100%",
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: "#d3d3d3",
  },
  orText: {
    marginHorizontal: 10,
    color: "#bebebe",
    fontSize: 14,
  },
  footer: {
    width: "100%",
    alignItems: "center",
    marginTop: -5,
    marginBottom: -10,
  },
  forgotPasswordButton: {},
  forgotPasswordLabel: {
    fontSize: 13,
    color: "#4a136c",
  },
  background: {
    flex: 1,
    resizeMode: "cover",
  },
});
