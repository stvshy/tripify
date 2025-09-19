import React, { forwardRef } from "react";
import {
  View,
  TextInput as RNTextInput,
  StyleSheet,
  Dimensions,
} from "react-native";
import { Feather } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

interface EmailInputProps {
  email: string;
  onEmailChange: (email: string) => void;
  isFocused: boolean;
  onFocus: () => void;
  onBlur: () => void;
}

const EmailInput = forwardRef<RNTextInput, EmailInputProps>(
  ({ email, onEmailChange, isFocused, onFocus, onBlur }, ref) => {
    return (
      <View style={[styles.inputContainer, isFocused && styles.inputFocused]}>
        <View style={styles.inputWrapper}>
          <Feather
            name="mail"
            size={20}
            color={isFocused ? "#FFFFFF" : "#D1D5DB"}
            style={styles.inputIcon}
          />
          <RNTextInput
            ref={ref}
            placeholder="Email"
            placeholderTextColor="#D1D5DB"
            value={email}
            onChangeText={onEmailChange}
            onFocus={onFocus}
            onBlur={onBlur}
            keyboardType="email-address"
            style={styles.customInput}
            autoCapitalize="none"
            blurOnSubmit={true}
            returnKeyType="done"
          />
        </View>
      </View>
    );
  }
);

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
});

export default EmailInput;
