import React, { forwardRef } from "react";
import {
  View,
  TextInput as RNTextInput,
  StyleSheet,
  Dimensions,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { ScaledSheet, s } from "react-native-size-matters";

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
            size={s(19.5)}
            color={isFocused ? "#FFFFFF" : "#D1D5DB"}
            style={styles.inputIcon}
          />
          <RNTextInput
            ref={ref}
            placeholder="E-mail"
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
});

export default EmailInput;
