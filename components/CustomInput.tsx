import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput } from 'react-native-paper';

interface CustomInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  leftIcon?: string;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
  keyboardType?: string;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}

const CustomInput = ({
  label,
  value,
  onChangeText,
  secureTextEntry,
  leftIcon,
  rightIcon,
  keyboardType,
  autoCapitalize,
}: CustomInputProps) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.container}>
      <TextInput
        label={label}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        secureTextEntry={secureTextEntry}
        style={[styles.input, isFocused && styles.inputFocused]}
        mode="outlined"
        theme={{
          colors: {
            primary: '#6a1b9a',
            background: '#E0E0E0',
          },
          roundness: 25,
        }}
        outlineColor={isFocused ? '#6a1b9a' : '#ddd'}
        contentStyle={[styles.contentStyle, { paddingTop: 8 }]} // Zwiększony paddingTop
        left={leftIcon && <TextInput.Icon icon={leftIcon} size={27} style={styles.leftIcon} />}
        right={rightIcon}
        keyboardType={keyboardType as any}
        autoCapitalize={autoCapitalize}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  input: {
    backgroundColor: '#E0E0E0',
    height: 60,
  },
  inputFocused: {},
  contentStyle: {
    height: 55,
  },
  leftIcon: {
    marginLeft: 10,
  },
});

export default CustomInput;
