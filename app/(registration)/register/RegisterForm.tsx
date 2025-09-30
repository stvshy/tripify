import React, { forwardRef } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  Text,
  TextInput as RNTextInput,
  TouchableOpacity,
  Pressable,
} from "react-native";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import { s, ScaledSheet, vs } from "react-native-size-matters";
import { heightPercentageToDP as hp } from "react-native-responsive-screen";
import { useResponsiveScaling } from "../../../hooks/useResponsiveScaling";

const { width, height } = Dimensions.get("window");

// Simple responsive spacing using responsive-screen
const getResponsiveFormSpacing = () => {
  return {
    inputMarginBottom: hp("1.5%"),
    inputHeight: hp("6.6%"),
    requirementsMarginTop: hp("0.8%"),
    requirementsPaddingBottom: hp("1.2%"),
    requirementMarginBottom: hp("0.7%"),
  };
};

type RequirementMap = Record<string, boolean>;

type Props = {
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  confirmPassword: string;
  setConfirmPassword: (v: string) => void;
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
  showConfirmPassword: boolean;
  setShowConfirmPassword: (v: boolean) => void;
  isFocused: { email: boolean; password: boolean; confirmPassword: boolean };
  setIsFocused: (s: {
    email: boolean;
    password: boolean;
    confirmPassword: boolean;
  }) => void;
  passwordRequirements: RequirementMap;
  renderValidationIcon: (isValid: boolean) => React.ReactNode;
  emailInputRef: React.RefObject<RNTextInput>;
  passwordInputRef: React.RefObject<RNTextInput>;
  confirmPasswordInputRef: React.RefObject<RNTextInput>;
};

export default function RegisterForm(props: Props) {
  const {
    email,
    setEmail,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    showPassword,
    setShowPassword,
    showConfirmPassword,
    setShowConfirmPassword,
    isFocused,
    setIsFocused,
    passwordRequirements,
    renderValidationIcon,
    emailInputRef,
    passwordInputRef,
    confirmPasswordInputRef,
  } = props;

  const { uiScale, textScale, scaleFont, scaleSize } = useResponsiveScaling();

  const responsiveSpacing = getResponsiveFormSpacing();
  const inputHeight = scaleSize(49, "ui");
  const fontSize = scaleFont(14.6, "ui");
  const requirementFontSize = scaleFont(14.5, "text");

  return (
    <View>
      {/* Email */}
      <Pressable
        style={[
          styles.inputContainer,
          { marginBottom: responsiveSpacing.inputMarginBottom },
          isFocused.email && styles.inputFocused,
        ]}
        onPress={() => emailInputRef.current?.focus()}
      >
        <View style={[styles.inputWrapper, { height: inputHeight }]}>
          <Ionicons
            name="mail"
            size={s(19.4)}
            color={isFocused.email ? "#FFFFFF" : "rgb(228, 228, 230)"}
            style={styles.inputIcon}
          />
          <RNTextInput
            ref={emailInputRef}
            placeholder="E-mail"
            placeholderTextColor="#D1D5DB"
            value={email}
            onChangeText={setEmail}
            onFocus={() => setIsFocused({ ...isFocused, email: true })}
            onBlur={() => setIsFocused({ ...isFocused, email: false })}
            keyboardType="email-address"
            style={[styles.customInput, { fontSize }]}
            autoCapitalize="none"
          />
        </View>
      </Pressable>

      {/* Password */}
      <Pressable
        style={[
          styles.inputContainer,
          { marginBottom: responsiveSpacing.inputMarginBottom },
          isFocused.password && styles.inputFocused,
        ]}
        onPress={() => passwordInputRef.current?.focus()}
      >
        <View style={[styles.inputWrapper, { height: inputHeight }]}>
          <MaterialIcons
            name="lock"
            size={s(19.8)}
            color={isFocused.password ? "#FFFFFF" : "rgb(228, 228, 230)"}
            style={styles.lockIcon}
          />
          <RNTextInput
            ref={passwordInputRef}
            placeholder="Password"
            placeholderTextColor="#D1D5DB"
            value={password}
            onChangeText={setPassword}
            onFocus={() => setIsFocused({ ...isFocused, password: true })}
            onBlur={() => setIsFocused({ ...isFocused, password: false })}
            secureTextEntry={!showPassword}
            style={[styles.customInput, { fontSize }]}
            autoCapitalize="sentences"
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

      {/* Confirm Password */}
      <Pressable
        style={[
          styles.inputContainer,
          { marginBottom: responsiveSpacing.inputMarginBottom },
          isFocused.confirmPassword && styles.inputFocused,
        ]}
        onPress={() => confirmPasswordInputRef.current?.focus()}
      >
        <View style={[styles.inputWrapper, { height: inputHeight }]}>
          <MaterialIcons
            name="lock"
            size={s(19.8)}
            color={isFocused.confirmPassword ? "#FFFFFF" : "rgb(228, 228, 230)"}
            style={styles.lockIcon}
          />
          <RNTextInput
            ref={confirmPasswordInputRef}
            placeholder="Confirm Password"
            placeholderTextColor="#D1D5DB"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            onFocus={() =>
              setIsFocused({ ...isFocused, confirmPassword: true })
            }
            onBlur={() =>
              setIsFocused({ ...isFocused, confirmPassword: false })
            }
            secureTextEntry={!showConfirmPassword}
            style={[styles.customInput, { fontSize }]}
            autoCapitalize="sentences"
          />
          <TouchableOpacity
            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
          >
            <MaterialIcons
              name={showConfirmPassword ? "visibility-off" : "visibility"}
              size={s(19.5)}
              color={
                isFocused.confirmPassword ? "#FFFFFF" : "rgb(228, 228, 230)"
              }
              style={styles.inputIconRight}
            />
          </TouchableOpacity>
        </View>
      </Pressable>

      {/* Requirements */}
      <View
        style={[
          styles.requirementsContainer,
          {
            marginTop: responsiveSpacing.requirementsMarginTop,
            paddingBottom: responsiveSpacing.requirementsPaddingBottom,
          },
        ]}
      >
        {Object.entries(passwordRequirements).map(([key, value]) => (
          <View
            style={[
              styles.requirementRow,
              {
                marginBottom: responsiveSpacing.requirementMarginBottom,
              },
            ]}
            key={key}
          >
            <View style={styles.iconWrapper}>
              {renderValidationIcon(value as boolean)}
            </View>
            <Text
              style={[
                styles.requirementText,
                value ? styles.valid : styles.invalid,
                { fontSize: requirementFontSize },
              ]}
            >
              {getRequirementText(key)}
            </Text>
          </View>
        ))}
      </View>
    </View>
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

const styles = ScaledSheet.create({
  inputContainer: {
    borderRadius: 999,
    overflow: "hidden",
    // marginBottom will be set dynamically
    width: width * 0.9,
    alignSelf: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: "1.7@s",
    borderColor: "transparent",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    height: hp("5.4%"),
    paddingHorizontal: "15.5@s",
  },
  inputIcon: {
    marginRight: "12@s",
    marginBottom: "1.0@vs",
  },
  inputIconRight: {
    marginLeft: "11.7@s",
  },
  customInput: {
    flex: 1,
    fontSize: "14.5@ms",
    fontFamily: "PlusJakartaSans-Regular",
    color: "#E5E7EB",
    paddingVertical: 0,
    marginBottom: "3.5@vs",
  },
  inputFocused: {
    borderColor: "#FFFFFF",
  },
  requirementsContainer: {
    // marginTop and paddingBottom will be set dynamically
    width: width * 0.88,
    alignSelf: "center",
    // marginLeft: 3,
  },
  requirementRow: {
    flexDirection: "row",
    alignItems: "center",
    // marginBottom will be set dynamically
  },
  iconWrapper: {
    paddingTop: "1.05@vs",
    marginRight: "4.8@s",
  },
  requirementText: {
    fontSize: "13.7@ms",
    fontFamily: "PlusJakartaSans-Regular",
    flex: 1,
    flexWrap: "wrap",
    lineHeight: hp("2.8%"),
  },
  valid: {
    color: "#b0f5e5",
  },
  invalid: {
    color: "#fcc7e8",
  },
  lockIcon: {
    marginRight: "11.8@s",
    marginBottom: "1@vs",
    marginLeft: "-0.4@s",
  },
});
