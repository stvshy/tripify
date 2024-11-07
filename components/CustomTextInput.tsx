import React from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  KeyboardTypeOptions,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

interface CustomTextInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  iconName?: keyof typeof FontAwesome.glyphMap;
  showPasswordIcon?: boolean;
  onShowPasswordPress?: () => void;
  isFocused?: boolean;
}

const CustomTextInput: React.FC<CustomTextInputProps> = ({
  label,
  value,
  onChangeText,
  onFocus,
  onBlur,
  secureTextEntry = false,
  keyboardType = 'default',
  iconName,
  showPasswordIcon = false,
  onShowPasswordPress,
  isFocused = false,
}) => {
  return (
    <View style={styles.inputContainer}>
      <Text style={[styles.label, isFocused && styles.labelFocused]}>{label}</Text>
      <View style={styles.inputWrapper}>
        {iconName && (
          <FontAwesome name={iconName} size={24} color="#6a1b9a" style={styles.icon} />
        )}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onFocus={onFocus}
          onBlur={onBlur}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          style={styles.input}
          autoCapitalize="none"
        />
        {showPasswordIcon && (
          <FontAwesome
            name={secureTextEntry ? 'eye-slash' : 'eye'}
            size={24}
            color="#6a1b9a"
            onPress={onShowPasswordPress}
            style={styles.iconRight}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  inputContainer: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    color: '#6a1b9a',
    marginBottom: 5,
    marginLeft: 5,
  },
  labelFocused: {
    color: '#4a0072',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#6a1b9a',
    borderRadius: 25,
    backgroundColor: '#E0E0E0',
    paddingHorizontal: 10,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#000',
  },
  icon: {
    marginRight: 5,
  },
  iconRight: {
    marginLeft: 5,
  },
});

export default CustomTextInput;
