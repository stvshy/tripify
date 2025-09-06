// components/Header.tsx
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme } from "react-native-paper";
import RightSlideMenu, {
  RightSlideMenuHandles,
  RightSlideMenuItem,
} from "./RightSlideMenu";

interface HeaderProps {
  title: string;
  menuItems?: RightSlideMenuItem[];
  menuHeader?: React.ReactNode;
}

const Header: React.FC<HeaderProps> = ({ title, menuItems, menuHeader }) => {
  const theme = useTheme();
  const router = useRouter();
  const { height } = Dimensions.get("window");
  const menuRef = React.useRef<RightSlideMenuHandles>(null);

  const handleGoBack = () => {
    router.back();
  };

  const hasMenu = !!(menuItems && menuItems.length > 0);

  return (
    <View
      style={[
        styles.header,
        { paddingTop: height * 0.03, backgroundColor: theme.colors.surface },
      ]}
    >
      <TouchableOpacity
        onPress={handleGoBack}
        style={[styles.headerButton, { marginLeft: -19 }]}
      >
        <Ionicons name="arrow-back" size={28} color={theme.colors.onSurface} />
      </TouchableOpacity>
      <Text style={[styles.headerTitle, { color: theme.colors.onSurface }]}>
        {title}
      </Text>
      {hasMenu ? (
        <>
          <TouchableOpacity
            onPress={() => menuRef.current?.toggle()}
            style={[styles.headerButton, { marginRight: -16 }]}
          >
            <Ionicons
              name="ellipsis-vertical"
              size={22}
              color={theme.colors.onSurface}
            />
          </TouchableOpacity>
          <RightSlideMenu
            ref={menuRef}
            items={menuItems!}
            header={menuHeader}
          />
        </>
      ) : (
        <View style={[styles.headerButton, { marginRight: -16 }]} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 10,
    // Możesz dodać inne style, jeśli potrzebne
  },
  headerButton: {
    padding: 8,
    width: 40,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
  },
});

export default Header;
