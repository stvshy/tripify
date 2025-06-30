// components/CachedCountryFlag.tsx
import React from "react";
import FastImage, { ImageStyle } from "@d11/react-native-fast-image"; // ZMIANA: Importuj ImageStyle z biblioteki
import { StyleProp } from "react-native";

interface CachedCountryFlagProps {
  isoCode: string;
  size: number;
  style?: StyleProp<ImageStyle>; // ZMIANA: Z ViewStyle na ImageStyle
}

const CachedCountryFlag = ({
  isoCode,
  size,
  style,
}: CachedCountryFlagProps) => {
  const flagUrl = `https://flagcdn.com/w${size * 2}/${isoCode.toLowerCase()}.png`;

  return (
    <FastImage
      style={[{ width: size, height: size * 0.75, borderRadius: 2 }, style]}
      source={{
        uri: flagUrl,
        priority: FastImage.priority.normal,
      }}
      resizeMode={FastImage.resizeMode.contain}
    />
  );
};

export default React.memo(CachedCountryFlag);
