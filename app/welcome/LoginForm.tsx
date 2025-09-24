import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TextInput as RNTextInput,
  TouchableOpacity,
  Pressable,
} from "react-native";
import { Button } from "react-native-paper";
import { MaterialIcons, Feather } from "@expo/vector-icons";
import { s, ScaledSheet } from "react-native-size-matters";

const { width, height } = Dimensions.get("window");

type Props = {
  identifier: string;
  setIdentifier: (text: string) => void;
  password: string;
  setPassword: (text: string) => void;
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
  isFocused: { identifier: boolean; password: boolean };
  setIsFocused: (s: { identifier: boolean; password: boolean }) => void;
  errorMessage: string | null;
  verificationMessage: string | null;
  resendTimer: number;
  resendVerificationEmail: () => void;
  onSubmit: () => void;
  loading: boolean;
  onForgotPassword: () => void;
  onInputFocus: (field: "identifier" | "password") => void;
  onInputBlur: (field: "identifier" | "password") => void;
  identifierInputRef: React.RefObject<RNTextInput>;
  passwordInputRef: React.RefObject<RNTextInput>;
};

export default function LoginForm(props: Props) {
  const {
    identifier,
    setIdentifier,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    isFocused,
    setIsFocused,
    errorMessage,
    verificationMessage,
    resendTimer,
    resendVerificationEmail,
    onSubmit,
    loading,
    onForgotPassword,
    onInputFocus,
    onInputBlur,
    identifierInputRef,
    passwordInputRef,
  } = props;

  return (
    <View>
      <Pressable
        style={[
          styles.inputContainer,
          isFocused.identifier && styles.inputFocused,
        ]}
        onPress={() => identifierInputRef.current?.focus()}
      >
        <View style={styles.inputWrapper}>
          <Feather
            name="user"
            size={s(19.5)}
            color={isFocused.identifier ? "#FFFFFF" : "rgb(228, 228, 230)"}
            style={styles.inputIcon}
          />
          <RNTextInput
            ref={identifierInputRef}
            placeholder="Nickname  /  E-mail"
            placeholderTextColor="#D1D5DB"
            value={identifier}
            onChangeText={setIdentifier}
            onFocus={() => {
              setIsFocused({ ...isFocused, identifier: true });
              onInputFocus("identifier");
            }}
            onBlur={() => {
              setIsFocused({ ...isFocused, identifier: false });
              onInputBlur("identifier");
            }}
            keyboardType="default"
            style={styles.customInput}
            autoCapitalize="none"
          />
        </View>
      </Pressable>

      <Pressable
        style={[
          styles.inputContainer,
          isFocused.password && styles.inputFocused,
        ]}
        onPress={() => passwordInputRef.current?.focus()}
      >
        <View style={styles.inputWrapper}>
          <MaterialIcons
            name="lock"
            size={s(19.8)}
            color={isFocused.password ? "#FFFFFF" : "rgb(228, 228, 230)"}
            style={[
              styles.inputIcon,
              { marginBottom: 0.8, marginLeft: -0.8, marginRight: 12.8 },
            ]}
          />
          <RNTextInput
            ref={passwordInputRef}
            placeholder="Password"
            placeholderTextColor="#D1D5DB"
            value={password}
            onChangeText={setPassword}
            onFocus={() => {
              setIsFocused({ ...isFocused, password: true });
              onInputFocus("password");
            }}
            onBlur={() => {
              setIsFocused({ ...isFocused, password: false });
              onInputBlur("password");
            }}
            secureTextEntry={!showPassword}
            style={styles.customInput}
            autoCapitalize="none"
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <MaterialIcons
              name={showPassword ? "visibility-off" : "visibility"}
              size={s(19.5)}
              color={isFocused.password ? "#FFFFFF" : "rgb(228, 228, 230)"}
              style={styles.inputIconRight}
            />
          </TouchableOpacity>
        </View>
      </Pressable>

      <View style={styles.forgotContainer}>
        <TouchableOpacity
          onPress={onForgotPassword}
          style={styles.forgotButton}
          activeOpacity={0.7}
        >
          <Text style={styles.forgotLabel}>Forgot password?</Text>
        </TouchableOpacity>
      </View>

      {verificationMessage ? (
        <TouchableOpacity
          onPress={resendVerificationEmail}
          disabled={resendTimer > 0}
          style={styles.resendButton}
          activeOpacity={resendTimer > 0 ? 1 : 0.7}
        >
          <Text
            style={[
              styles.resendLabel,
              {
                color: resendTimer > 0 ? "rgba(255, 255, 255, 0.6)" : "#FFFFFF",
              },
            ]}
          >
            {resendTimer > 0
              ? `Resend verification e-mail (${resendTimer}s)`
              : "Resend verification e-mail"}
          </Text>
        </TouchableOpacity>
      ) : null}

      <Pressable
        onPress={onSubmit}
        disabled={loading}
        style={({ pressed }: { pressed: boolean }) => [
          styles.loginButton,
          {
            opacity: loading ? 0.7 : pressed ? 0.8 : 1,
            transform: [{ scale: pressed ? 0.98 : 1 }],
          },
        ]}
      >
        <Text style={styles.buttonLabel}>
          {loading ? "Signing in..." : "Sign in"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = ScaledSheet.create({
  inputContainer: {
    borderRadius: 999,
    overflow: "hidden",
    marginBottom: "10.6@vs",
    width: width * 0.9,
    alignSelf: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: "1.8@s",
    borderColor: "transparent",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    height: "43@vs",
    paddingHorizontal: "15.7@s",
  },
  inputIcon: {
    marginRight: "11.6@s",
    marginBottom: "2.25@vs",
  },
  inputIconRight: {
    marginLeft: "11.7@s",
  },
  customInput: {
    flex: 1,
    fontSize: "14.6@ms",
    fontFamily: "PlusJakartaSans-Regular",
    color: "#E5E7EB",
    paddingVertical: 0,
    marginBottom: "3.88@vs",
  },
  inputFocused: {
    borderColor: "#FFFFFF",
  },
  inputUnfocusedText: {
    fontSize: "14.6@ms",
  },
  forgotContainer: {
    width: width * 0.9,
    alignSelf: "center",
    alignItems: "flex-end",
    marginTop: "-7.17@vs",
    marginBottom: "11.6@vs",
    marginLeft: -19,
  },
  forgotLabel: {
    color: "#FFFFFF",
    fontSize: "10.75@ms",
    fontFamily: "PlusJakartaSans-Medium",
  },
  forgotButton: {
    backgroundColor: "transparent",
  },
  resendButton: {
    marginTop: "7.5@vs",
    position: "absolute",
    top: "-44.5@vs", // Position it above the form without affecting layout
    left: 0,
    right: 0,
    zIndex: 1,
    backgroundColor: "transparent",
    alignItems: "center",
  },
  resendLabel: {
    fontSize: "12.5@ms",
    fontFamily: "PlusJakartaSans-Regular",
    textAlign: "center",
  },
  loginButton: {
    width: width * 0.9,
    height: "42@vs",
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 999,
    marginTop: "7.2@vs",
    alignSelf: "center",
  },
  buttonLabel: {
    fontSize: "13.8@ms",
    fontFamily: "PlusJakartaSans-SemiBold",
    color: "#4F21A5",
  },
});
