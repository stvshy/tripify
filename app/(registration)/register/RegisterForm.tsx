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
            size={20}
            color={isFocused.email ? "#FFFFFF" : "rgb(228, 228, 230)"}
            style={styles.inputIcon}
          />
          <RNTextInput
            placeholder="Email"
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
            size={20.3}
            color={isFocused.password ? "#FFFFFF" : "rgb(228, 228, 230)"}
            style={[
              styles.inputIcon,
              { marginBottom: 0.8, marginLeft: -0.8, marginRight: 12.8 },
            ]}
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
              size={20}
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
            size={20.3}
            color={isFocused.confirmPassword ? "#FFFFFF" : "rgb(228, 228, 230)"}
            style={[
              styles.inputIcon,
              { marginBottom: 0.8, marginLeft: -0.8, marginRight: 12.8 },
            ]}
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
              size={20}
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
    marginBottom: 2.6,
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
    marginBottom: 4,
  },
  inputFocused: {
    borderColor: "#FFFFFF",
  },
  requirementsContainer: {
    marginTop: 9,
    width: width * 0.88,
    alignSelf: "center",
    // marginLeft: 3,
  },
  requirementRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },
  iconWrapper: {
    paddingTop: 1,
    marginRight: 5,
  },
  requirementText: {
    fontSize: 13.6,
    fontFamily: "PlusJakartaSans-Regular",
    flex: 1,
    flexWrap: "wrap",
    lineHeight: 20,
  },
  valid: {
    color: "#b0f5e5",
  },
  invalid: {
    color: "#fcc7e8",
  },
});
