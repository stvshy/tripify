import React, { useState, useEffect, useRef, useCallback } from "react";
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
  Keyboard,
  BackHandler,
  TextInput as RNTextInput,
  Animated,
} from "react-native";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth, db } from "../config/firebaseConfig";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useRouter } from "expo-router";
import EmailInput from "./EmailInput";
import ActionButtons from "./ActionButtons";
import StatusMessages from "./StatusMessages";
import { useKeyboardAnimation } from "./useKeyboardAnimation";

const { width, height } = Dimensions.get("window");

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState({ email: false });
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [isContentShifted, setIsContentShifted] = useState(false);
  const router = useRouter();

  // Hook dla animacji
  const { contentTranslateY, animateToTop, animateToBottom, resetAnimation } =
    useKeyboardAnimation();
  // Ref do TextInput żeby móc go programowo odfocusować
  const textInputRef = useRef<RNTextInput>(null);

  // Memoized handlers
  const handleKeyboardHide = useCallback(() => {
    setIsKeyboardVisible(false);
    textInputRef.current?.blur();
    setIsContentShifted(false);
    animateToBottom();
  }, [animateToBottom]);

  const handleBackPress = useCallback(() => {
    if (isFocused.email) {
      textInputRef.current?.blur();
      return true;
    }
    return false;
  }, [isFocused.email]);

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

  const handleInputFocus = useCallback(() => {
    setIsFocused((prev) => ({ ...prev, email: true }));
    setIsContentShifted(true);
    resetAnimation();
    animateToTop();
  }, [resetAnimation, animateToTop]);

  const handleInputBlur = useCallback(() => {
    setIsFocused((prev) => ({ ...prev, email: false }));
  }, []);

  const handleScreenPress = useCallback(() => {
    if (isFocused.email) {
      textInputRef.current?.blur();
      Keyboard.dismiss();
      setIsContentShifted(false);
      animateToBottom();
      setIsFocused({ email: false });
    }
  }, [isFocused.email, animateToBottom]);

  const handlePasswordReset = useCallback(async () => {
    setMessage(null);
    setError(null);

    if (!email) {
      setError("Please enter your email address.");
      return;
    }

    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", email));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setError("No account found with this email.");
        return;
      }

      const userData = querySnapshot.docs[0].data();
      if (!userData.isVerified) {
        setError("This account has not been verified.");
        return;
      }

      await sendPasswordResetEmail(auth, email);
      setMessage("A password reset link has been sent to your email.");
    } catch (error: any) {
      if (error.code === "permission-denied") {
        setError("Permission denied. Please check your Firestore rules.");
      } else {
        setError("An error occurred. Please try again later.");
      }
    }
  }, [email]);

  const handleBackToLogin = useCallback(() => {
    router.push("/welcome");
  }, [router]);

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

            <EmailInput
              ref={textInputRef}
              email={email}
              onEmailChange={setEmail}
              isFocused={isFocused.email}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
            />
          </Animated.View>

          <StatusMessages message={message} error={error} />
          <ActionButtons
            onSendReset={handlePasswordReset}
            onBackToLogin={handleBackToLogin}
          />
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
});
