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
        <Text style={styles.separatorText}>or sign in with</Text>
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

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 16,
  },
  separatorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    width: width * 0.9,
    alignSelf: "center",
  },
  separator: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(156,163,175,0.3)",
  },
  separatorText: {
    color: "#D1D5DB",
    fontSize: 12,
    fontFamily: "PlusJakartaSans-Regular",
  },
  row: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginTop: 16,
  },
  circle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(156,163,175,0.3)",
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconImage: {
    width: 24,
    height: 24,
  },
});

export default SocialAuthRow;
