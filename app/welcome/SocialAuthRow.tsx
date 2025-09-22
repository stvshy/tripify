import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Image,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { ScaledSheet } from "react-native-size-matters";

const { width } = Dimensions.get("window");

type Props = {
  onContinueWithFacebook: () => void;
};

const SocialAuthRow = React.memo(function SocialAuthRow({
  onContinueWithFacebook,
}: Props) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.separatorRow}>
        <View style={styles.separator} />
        <Text style={styles.separatorText}>or continue with</Text>
        <View style={styles.separator} />
      </View>
      <View style={styles.row}>
        <TouchableOpacity
          style={styles.circle}
          onPress={onContinueWithFacebook}
        >
          <FontAwesome name="facebook" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.circle}
          onPress={() => {
            /* placeholder only */
          }}
        >
          <Image
            source={require("../../assets/icons/Google_Symbol_1.png")}
            style={styles.iconImage}
            resizeMode="contain"
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.circle}
          onPress={() => {
            /* placeholder only */
          }}
        >
          <Image
            source={require("../../assets/icons/X_idJxGuURW1_1.png")}
            style={styles.iconImage}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </View>
    </View>
  );
});

const styles = ScaledSheet.create({
  wrapper: {
    marginTop: "14@vs",
  },
  separatorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: "12@s",
    width: width * 0.9,
    alignSelf: "center",
  },
  separator: {
    flex: 1,
    height: "0.8@s",
    backgroundColor: "rgba(246, 246, 246, 0.31)",
  },
  separatorText: {
    color: "#D1D5DB",
    fontSize: "11.6@ms",
    fontFamily: "PlusJakartaSans-Regular",
  },
  row: {
    flexDirection: "row",
    justifyContent: "center",
    gap: "11.6@s",
    marginTop: "14.3@vs",
  },
  circle: {
    width: "54.5@s",
    height: "54.5@s",
    borderRadius: "28@s",
    borderWidth: "0.7@s",
    borderColor: "rgba(156,163,175,0.3)",
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconImage: {
    width: "22.5@s",
    height: "22.5@s",
  },
});

export default SocialAuthRow;
