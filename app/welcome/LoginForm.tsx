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
            color={isFocused.identifier ? "#FFFFFF" : "#D1D5DB"}
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
            color={isFocused.password ? "#FFFFFF" : "#D1D5DB"}
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
              color={isFocused.password ? "#FFFFFF" : "#D1D5DB"}
              style={styles.inputIconRight}
            />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.forgotContainer}>
        <Button
          mode="text"
          onPress={onForgotPassword}
          labelStyle={styles.forgotLabel}
        >
          Forgot password?
        </Button>
      </View>

      {verificationMessage ? (
        <>
          <Text style={styles.verificationMessage}>{verificationMessage}</Text>
          <Button
            mode="text"
            onPress={resendVerificationEmail}
            disabled={resendTimer > 0}
            style={styles.resendButton}
            labelStyle={{ color: resendTimer > 0 ? "#A68EAC" : "#FFFFFF" }}
          >
            {resendTimer > 0
              ? `Resend verification email (${resendTimer}s)`
              : "Resend verification email"}
          </Button>
        </>
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
    marginTop: -16.5,
    marginBottom: 6,
  },
  forgotLabel: {
    color: "#FFFFFF",
    fontSize: 11.6,
    fontFamily: "PlusJakartaSans-Medium",
  },
  verificationMessage: {
    color: "#E5E7EB",
    fontSize: 12,
    fontFamily: "PlusJakartaSans-Regular",
    textAlign: "center",
  },
  resendButton: {
    marginTop: 6,
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
