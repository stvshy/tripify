import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TextInput as RNTextInput,
  TouchableOpacity,
} from "react-native";
import { Button } from "react-native-paper";
import { MaterialIcons, Feather } from "@expo/vector-icons";

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
      <View
        style={[
          styles.inputContainer,
          isFocused.identifier && styles.inputFocused,
        ]}
      >
        <View style={styles.inputWrapper}>
          <Feather
            name="user"
            size={20}
            color={isFocused.identifier ? "theme.colors.primary" : "#FFFFFF"}
            style={styles.inputIcon}
          />
          <RNTextInput
            ref={identifierInputRef}
            placeholder="Nickname  /  Email"
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
      </View>

      <View
        style={[
          styles.inputContainer,
          isFocused.password && styles.inputFocused,
        ]}
      >
        <View style={styles.inputWrapper}>
          <MaterialIcons
            name="lock"
            size={20}
            color={isFocused.password ? "theme.colors.primary" : "#FFFFFF"}
            style={styles.inputIcon}
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
              size={20}
              color={isFocused.password ? "theme.colors.primary" : "#FFFFFF"}
              style={styles.inputIconRight}
            />
          </TouchableOpacity>
        </View>
      </View>

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
              { color: resendTimer > 0 ? "#A68EAC" : "#FFFFFF" },
            ]}
          >
            {resendTimer > 0
              ? `Resend verification email (${resendTimer}s)`
              : "Resend verification email"}
          </Text>
        </TouchableOpacity>
      ) : null}

      <Button
        mode="contained"
        onPress={onSubmit}
        style={styles.loginButton}
        labelStyle={styles.buttonLabel}
        loading={loading}
      >
        Sign in
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
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
  inputIconRight: {
    marginLeft: 12,
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
  inputUnfocusedText: {
    fontSize: 14,
  },
  forgotContainer: {
    width: width * 0.9,
    alignSelf: "center",
    alignItems: "flex-end",
    marginTop: -8,
    marginBottom: 12.7,
    marginLeft: -19,
  },
  forgotLabel: {
    color: "#FFFFFF",
    fontSize: 11,
    fontFamily: "PlusJakartaSans-Medium",
  },
  forgotButton: {
    backgroundColor: "transparent",
  },
  resendButton: {
    marginTop: 1.5,
    position: "absolute",
    top: -50, // Position it above the form without affecting layout
    left: 0,
    right: 0,
    zIndex: 1,
    backgroundColor: "transparent",
    alignItems: "center",
  },
  resendLabel: {
    fontSize: 12.6,
    fontFamily: "PlusJakartaSans-Regular",
    textAlign: "center",
  },
  loginButton: {
    width: width * 0.9,
    height: 47,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    borderRadius: 999,
    marginTop: 8,
    alignSelf: "center",
  },
  buttonLabel: {
    fontSize: 14,
    fontFamily: "PlusJakartaSans-SemiBold",
    color: "#4F21A5",
  },
});
