import React from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  Text,
  TextInput as RNTextInput,
  TouchableOpacity,
} from "react-native";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import { s, ScaledSheet } from "react-native-size-matters";

const { width } = Dimensions.get("window");

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
  } = props;

  return (
    <View>
      {/* Email */}
      <View
        style={[styles.inputContainer, isFocused.email && styles.inputFocused]}
      >
        <View style={styles.inputWrapper}>
          <Ionicons
            name="mail"
            size={s(19.4)}
            color={isFocused.email ? "#FFFFFF" : "rgb(228, 228, 230)"}
            style={styles.inputIcon}
          />
          <RNTextInput
            placeholder="E-mail"
            placeholderTextColor="#D1D5DB"
            value={email}
            onChangeText={setEmail}
            onFocus={() => setIsFocused({ ...isFocused, email: true })}
            onBlur={() => setIsFocused({ ...isFocused, email: false })}
            keyboardType="email-address"
            style={styles.customInput}
            autoCapitalize="none"
          />
        </View>
      </View>

      {/* Password */}
      <View
        style={[
          styles.inputContainer,
          isFocused.password && styles.inputFocused,
        ]}
      >
        <View style={styles.inputWrapper}>
          <MaterialIcons
            name="lock"
            size={s(19.8)}
            color={isFocused.password ? "#FFFFFF" : "rgb(228, 228, 230)"}
            style={styles.lockIcon}
          />
          <RNTextInput
            placeholder="Password"
            placeholderTextColor="#D1D5DB"
            value={password}
            onChangeText={setPassword}
            onFocus={() => setIsFocused({ ...isFocused, password: true })}
            onBlur={() => setIsFocused({ ...isFocused, password: false })}
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
      </View>

      {/* Confirm Password */}
      <View
        style={[
          styles.inputContainer,
          isFocused.confirmPassword && styles.inputFocused,
        ]}
      >
        <View style={styles.inputWrapper}>
          <MaterialIcons
            name="lock"
            size={s(19.8)}
            color={isFocused.confirmPassword ? "#FFFFFF" : "rgb(228, 228, 230)"}
            style={styles.lockIcon}
          />
          <RNTextInput
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
            style={styles.customInput}
            autoCapitalize="none"
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
      </View>

      {/* Requirements */}
      <View style={styles.requirementsContainer}>
        {Object.entries(passwordRequirements).map(([key, value]) => (
          <View style={styles.requirementRow} key={key}>
            <View style={styles.iconWrapper}>
              {renderValidationIcon(value as boolean)}
            </View>
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
    marginBottom: "10.5@vs",
    width: width * 0.9,
    alignSelf: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: "1.7@s",
    borderColor: "transparent",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    height: "42.6@vs",
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
    marginTop: "5.5@vs",
    width: width * 0.88,
    alignSelf: "center",
    // marginLeft: 3,
    paddingBottom: "10.5@vs",
  },
  requirementRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: "4.8@vs",
  },
  iconWrapper: {
    paddingTop: "1.05@vs",
    marginRight: "4.8@s",
  },
  requirementText: {
    fontSize: "13.6@ms",
    fontFamily: "PlusJakartaSans-Regular",
    flex: 1,
    flexWrap: "wrap",
    lineHeight: "17.7@vs",
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
