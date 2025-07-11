// app/chooseCountries/index.tsx
import React, {
  useState,
  useMemo,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from "react";
import {
  View,
  Text,
  SectionList,
  Pressable,
  StyleSheet,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Keyboard,
  Animated,
  UIManager,
  Modal,
  TouchableOpacity,
  Easing,
  TouchableWithoutFeedback,
  BackHandler,
  TextInput,
  LayoutAnimation,
} from "react-native";
import { TextInput as PaperTextInput, useTheme } from "react-native-paper";
import { AntDesign, FontAwesome, MaterialIcons } from "@expo/vector-icons";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { router, useRouter } from "expo-router";
import { auth, db } from "../config/firebaseConfig";
import CountryFlag from "react-native-country-flag";
import { ThemeContext } from "../config/ThemeContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import filteredCountriesData from "../../components/filteredCountries.json";
import { useCountries } from "../config/CountryContext"; // Import hook z kontekstu

const { width, height } = Dimensions.get("window");

type Continent =
  | "Africa"
  | "North America"
  | "South America"
  | "Asia"
  | "Europe"
  | "Oceania"
  | "Antarctica";

export type Country = {
  id: string;
  name: string;
  officialName: string;
  cca2: string;
  cca3: string;
  region: string;
  subregion: string;
  class: string | null;
  path: string;
};

export type FilteredCountries = {
  countries: Country[];
};

// Function to determine the continent
const getContinent = (region: string, subregion: string): Continent => {
  switch (region) {
    case "Africa":
      return "Africa";
    case "Americas":
      return subregion.includes("South") ? "South America" : "North America";
    case "Asia":
      return "Asia";
    case "Europe":
      return "Europe";
    case "Oceania":
      return "Oceania";
    case "Antarctic":
      return "Antarctica";
    default:
      return "Africa";
  }
};

// CountryItem component
const CountryItem = React.memo(function CountryItem({
  item,
  onSelect,
  isSelected,
}: {
  item: Country;
  onSelect: (countryCode: string) => void;
  isSelected: boolean;
}) {
  const theme = useTheme();
  const { isDarkTheme } = useContext(ThemeContext);
  const scaleValue = useRef(new Animated.Value(1)).current;

  const handleCheckboxPress = useCallback(() => {
    Animated.sequence([
      Animated.timing(scaleValue, {
        toValue: 0.8,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(scaleValue, {
        toValue: 1,
        duration: 80,
        useNativeDriver: true,
      }),
    ]).start();
    onSelect(item.cca2);
  }, [scaleValue, onSelect, item.cca2]);

  const handlePress = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    handleCheckboxPress();
  }, [handleCheckboxPress]);

  // Dynamic colors based on the theme
  const selectedBackgroundColor = isSelected
    ? theme.colors.surfaceVariant
    : theme.colors.surface;

  const flagBorderColor = theme.colors.outline;

  const checkboxBackgroundColor = isSelected
    ? theme.colors.primary
    : "transparent";

  const checkboxBorderColor = isSelected
    ? theme.colors.primary
    : theme.colors.outline;

  const checkboxIconColor = isSelected ? theme.colors.onPrimary : "transparent";
  const handleNavigateToCountry = useCallback(() => {
    router.push(`/country/${item.id}`);
  }, [router, item.id]);
  return (
    <TouchableOpacity
      onPress={handlePress}
      style={[styles.countryItemContainer, { backgroundColor: "transparent" }]}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.countryItem,
          {
            backgroundColor: selectedBackgroundColor,
            borderRadius: isSelected ? 4.2 : 8,
          },
        ]}
      >
        {/* FLAGA */}
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            handleNavigateToCountry();
          }}
          hitSlop={8}
          style={[
            styles.flagContainer,
            styles.flagWithBorder,
            { borderColor: flagBorderColor },
          ]}
        >
          <CountryFlag isoCode={item.cca2} size={25} />
        </Pressable>

        {/* NAZWA */}
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            handleNavigateToCountry();
          }}
          hitSlop={8}
          style={{ marginLeft: 5 }}
        >
          <Text style={[styles.countryText, { color: theme.colors.onSurface }]}>
            {item.name}
          </Text>
        </Pressable>

        {/* SPACER */}
        <View style={{ flex: 1 }} />

        {/* CHECKBOX */}
        <Animated.View
          style={[
            styles.roundCheckbox,
            {
              backgroundColor: checkboxBackgroundColor,
              borderColor: checkboxBorderColor,
              transform: [{ scale: scaleValue }],
            },
          ]}
        >
          {isSelected && (
            <FontAwesome name="check" size={12} color={checkboxIconColor} />
          )}
        </Animated.View>
      </View>
    </TouchableOpacity>
  );
});

type ChooseCountriesScreenProps = {
  fromTab?: boolean;
};

export default function ChooseCountriesScreen({
  fromTab = false,
}: ChooseCountriesScreenProps) {
  const router = useRouter();
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const { toggleTheme, isDarkTheme } = useContext(ThemeContext);
  const theme = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const [isInputFocused, setIsInputFocused] = useState(false);
  const scaleValue = useRef(new Animated.Value(1)).current;
  const [isPopupVisible, setIsPopupVisible] = useState(true);
  const searchInputRef = useRef<TextInput>(null);
  const { visitedCountries, setVisitedCountries } = useCountries(); // Pobranie stanu z kontekstu

  useEffect(() => {
    const checkPopup = async () => {
      try {
        const value = await AsyncStorage.getItem("hasShownPopup");
        if (value !== "true") {
          setIsPopupVisible(true); // Show pop-up only if the key doesn't exist or has a different value
        }
      } catch (e) {
        console.error("Failed to load popup status.");
      }
    };

    checkPopup();
  }, []);

  useEffect(() => {
    // Fetch saved countriesVisited from Firestore
    const fetchSelectedCountries = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          const userDocRef = doc(db, "users", user.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const countriesVisited: string[] = userData?.countriesVisited || [];
            setSelectedCountries(countriesVisited);
            setVisitedCountries(countriesVisited); // Synchronizacja z kontekstem
          }
        } catch (error) {
          console.error("Error fetching selected countries:", error);
        }
      }
    };

    fetchSelectedCountries();
  }, [setVisitedCountries]);
  useEffect(() => {
    // synchronizacja lokalnego selectedCountries z kontekstem
    setSelectedCountries(visitedCountries);
  }, [visitedCountries]);
  const handleClosePopup = useCallback(async () => {
    setIsPopupVisible(false);
    try {
      await AsyncStorage.setItem("hasShownPopup", "true");
    } catch (e) {
      console.error("Failed to save popup status.");
    }
  }, []);

  const handleToggleTheme = useCallback(() => {
    Animated.sequence([
      Animated.timing(scaleValue, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleValue, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(() => {
      toggleTheme();
    });
  }, [scaleValue, toggleTheme]);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    if (
      Platform.OS === "android" &&
      UIManager.setLayoutAnimationEnabledExperimental
    ) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }

    const keyboardShowListener = Keyboard.addListener(showEvent, () => {
      if (isInputFocused) {
        fadeAnim.setValue(0);
      }
    });

    const keyboardHideListener = Keyboard.addListener(hideEvent, () => {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        easing: Easing.linear,
        useNativeDriver: true,
      }).start();
    });

    // Add listener for the "back" button on Android
    const handleBackPress = () => {
      if (isInputFocused && searchInputRef.current) {
        console.log(
          "Back button pressed while input is focused. Blurring input."
        );
        searchInputRef.current.blur();
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      handleBackPress
    );

    return () => {
      backHandler.remove();
      keyboardShowListener.remove();
      keyboardHideListener.remove();
    };
  }, [isInputFocused, fadeAnim]);

  // Processing country data
  const processedCountries = useMemo(() => {
    const filtered = filteredCountriesData.countries.filter(
      (country: Country) =>
        country.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const grouped = filtered.reduce(
      (acc: { [key in Continent]?: Country[] }, country: Country) => {
        const continent = getContinent(country.region, country.subregion);
        if (!acc[continent]) {
          acc[continent] = [];
        }
        acc[continent]!.push(country);
        return acc;
      },
      {} as { [key in Continent]?: Country[] }
    );

    const sections: { title: string; data: Country[] }[] = Object.keys(grouped)
      .map((continent) => ({
        title: continent,
        data: grouped[continent as Continent]!.sort((a: Country, b: Country) =>
          a.name.localeCompare(b.name)
        ),
      }))
      .sort((a, b) => a.title.localeCompare(b.title));

    return sections;
  }, [searchQuery]);

  const handleSelectCountry = useCallback(
    (countryCode: string) => {
      setSelectedCountries((prevSelected) => {
        let updatedSelected;
        if (prevSelected.includes(countryCode)) {
          updatedSelected = prevSelected.filter((c) => c !== countryCode);
        } else {
          updatedSelected = [...prevSelected, countryCode];
        }
        setVisitedCountries(updatedSelected); // Aktualizacja kontekstu
        return updatedSelected;
      });
    },
    [setVisitedCountries]
  );

  const handleSaveCountries = useCallback(async () => {
    if (selectedCountries.length === 0) {
      Alert.alert("No Selection", "Please select at least one country.");
      return;
    }
    const user = auth.currentUser;
    if (user) {
      try {
        const userDocRef = doc(db, "users", user.uid);
        await updateDoc(userDocRef, {
          countriesVisited: selectedCountries,
          firstLoginComplete: true,
        });
        console.log("Selected countries saved:", selectedCountries);
        await AsyncStorage.setItem("hasShownPopup", "true");
        router.replace("/");
      } catch (error) {
        console.error("Error saving countries:", error);
        Alert.alert(
          "Error",
          "Failed to save selected countries. Please try again."
        );
      }
    } else {
      Alert.alert("Not Logged In", "User is not authenticated.");
      router.replace("/welcome");
    }
  }, [selectedCountries, router]);

  // Function to handle clicking outside the text input
  const dismissKeyboard = useCallback(() => {
    Keyboard.dismiss();
    setIsInputFocused(false);
    setIsFocused(false);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const renderCountryItem = useCallback(
    ({ item }: { item: Country }) => (
      <CountryItem
        item={item}
        onSelect={handleSelectCountry}
        isSelected={selectedCountries.includes(item.cca2)}
      />
    ),
    [handleSelectCountry, selectedCountries]
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: { title: string } }) => (
      <View
        style={[
          styles.sectionHeader,
          { backgroundColor: theme.colors.surface },
        ]}
      >
        <Text
          style={[styles.sectionHeaderText, { color: theme.colors.primary }]}
        >
          {section.title}
        </Text>
      </View>
    ),
    [theme.colors.surface, theme.colors.primary]
  );

  return (
    <TouchableWithoutFeedback onPress={dismissKeyboard}>
      <SafeAreaView
        style={[
          styles.container,
          { backgroundColor: theme.colors.background },
          fromTab ? styles.containerFromTab : styles.containerStandalone,
        ]}
      >
        {/* Informational Popup */}
        {!fromTab && isPopupVisible && (
          <Modal
            transparent={true}
            visible={isPopupVisible}
            animationType="slide"
            onRequestClose={handleClosePopup}
          >
            <View style={styles.modalOverlay}>
              <View
                style={[
                  styles.modalContent,
                  { backgroundColor: theme.colors.surface },
                ]}
              >
                <Text
                  style={[styles.modalTitle, { color: theme.colors.primary }]}
                >
                  Hey Traveller!
                </Text>
                <Text
                  style={[styles.modalText, { color: theme.colors.onSurface }]}
                >
                  Please choose the countries you have visited from the list
                  below.
                </Text>
                <TouchableOpacity
                  onPress={handleClosePopup}
                  style={[
                    styles.modalButton,
                    { backgroundColor: theme.colors.primary },
                  ]}
                >
                  <Text
                    style={[
                      styles.modalButtonText,
                      { color: theme.colors.onPrimary },
                    ]}
                  >
                    Got it
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        )}
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardAvoidingView}
          keyboardVerticalOffset={fromTab ? 0 : Platform.OS === "ios" ? 80 : 20}
        >
          <View style={{ flex: 1 }}>
            {/* Search Bar and Theme Toggle Button */}
            <View style={styles.searchAndToggleContainer}>
              <View
                style={[
                  styles.inputContainer,
                  isFocused && styles.inputFocused,
                ]}
              >
                <PaperTextInput
                  ref={searchInputRef}
                  label="Search Country"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  mode="flat"
                  style={styles.input}
                  theme={{
                    colors: {
                      primary: isFocused
                        ? theme.colors.primary
                        : theme.colors.outline,
                      background: "transparent",
                      text: theme.colors.onSurface,
                    },
                  }}
                  underlineColor="transparent"
                  left={
                    <PaperTextInput.Icon
                      icon={() => (
                        <AntDesign
                          name="search1"
                          size={21.5}
                          color={
                            isFocused
                              ? theme.colors.primary
                              : theme.colors.outline
                          }
                        />
                      )}
                      style={styles.iconLeft}
                    />
                  }
                  right={
                    searchQuery ? (
                      <PaperTextInput.Icon
                        icon={() => (
                          <MaterialIcons
                            name="close"
                            size={17}
                            color={theme.colors.outline}
                          />
                        )}
                        onPress={() => setSearchQuery("")}
                      />
                    ) : null
                  }
                  autoCapitalize="none"
                  onFocus={() => {
                    setIsInputFocused(true);
                    setIsFocused(true);
                    fadeAnim.setValue(0);
                  }}
                  onBlur={() => {
                    setIsInputFocused(false);
                    setIsFocused(false);
                    Animated.timing(fadeAnim, {
                      toValue: 1,
                      duration: 300,
                      useNativeDriver: true,
                    }).start();
                  }}
                />
              </View>

              {/* Round Button to Toggle Theme */}
              <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
                <Pressable
                  onPress={handleToggleTheme}
                  style={[
                    styles.toggleButton,
                    { backgroundColor: theme.colors.primary },
                  ]}
                >
                  {isDarkTheme ? (
                    <MaterialIcons
                      name="dark-mode"
                      size={24}
                      color={theme.colors.onPrimary}
                    />
                  ) : (
                    <MaterialIcons
                      name="light-mode"
                      size={24}
                      color={theme.colors.onPrimary}
                    />
                  )}
                </Pressable>
              </Animated.View>
            </View>

            {/* Country List */}
            <View style={{ flex: 1, marginBottom: fromTab ? -16 : -20 }}>
              <SectionList
                sections={processedCountries}
                keyExtractor={(item) => item.cca3}
                renderItem={renderCountryItem}
                renderSectionHeader={renderSectionHeader}
                stickySectionHeadersEnabled={false}
                contentContainerStyle={{
                  flexGrow: 1,
                  paddingBottom: fromTab ? 86 : 96,
                }}
                ListEmptyComponent={() => (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No countries found.</Text>
                  </View>
                )}
              />
            </View>

            {/* "Save and Continue" Button */}
            <Animated.View
              style={[
                styles.footer,
                {
                  opacity: fadeAnim,
                  transform: [
                    {
                      translateY: fadeAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [50, 0],
                      }),
                    },
                  ],
                  bottom: fromTab
                    ? -3
                    : isInputFocused
                      ? -styles.saveButton.marginBottom - 5
                      : 0,
                },
              ]}
            >
              <Pressable
                onPress={handleSaveCountries}
                style={[
                  styles.saveButton,
                  selectedCountries.length === 0 && styles.saveButtonDisabled,
                  selectedCountries.length > 0
                    ? { backgroundColor: theme.colors.primary }
                    : {},
                ]}
                disabled={selectedCountries.length === 0}
              >
                <Text
                  style={[
                    styles.saveButtonText,
                    { color: theme.colors.onPrimary },
                  ]}
                >
                  Save and Continue
                </Text>
              </Pressable>
            </Animated.View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 0,
  },
  containerFromTab: {
    marginTop: -5,
  },
  containerStandalone: {
    paddingTop: 30,
  },
  searchAndToggleContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 13,
    marginBottom: 13,
    marginTop: 10,
  },
  inputContainer: {
    width: width * 0.82,
    backgroundColor: "#f0ed8f5",
    borderRadius: 28,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#ccc",
    flexDirection: "row",
    alignItems: "center",
    height: height * 0.062,
    flex: 1,
  },
  toggleButton: {
    width: height * 0.0615,
    height: height * 0.0615,
    borderRadius: (height * 0.0615) / 2,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 7,
  },
  inputFocused: {
    borderColor: "#6a1b9a", // Purple color when focused
  },
  input: {
    flex: 1,
    // paddingLeft: 10,
    height: 50,
    fontSize: 14,
    backgroundColor: "transparent",
    borderRadius: 0,
    color: "#000",
  },
  iconLeft: {
    marginLeft: 10,
  },
  countryItemContainer: {
    width: "100%",
    backgroundColor: "transparent",
  },
  sectionHeader: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    width: "100%",
    marginLeft: 7,
    marginTop: 7,
  },
  sectionHeaderText: {
    fontSize: 16,
    fontWeight: "600",
  },
  flagWithBorder: {
    borderWidth: 1,
    borderRadius: 5,
    overflow: "hidden",
  },
  countryItem: {
    flexDirection: "row",
    alignItems: "center",
    height: 50,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: "#ccc",
  },
  flagContainer: {
    marginRight: 10,
    width: 30,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 7,
  },
  countryText: {
    fontSize: 16,
  },
  roundCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 7,
  },
  emptyContainer: {
    padding: 16,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    backgroundColor: "transparent",
    zIndex: 100,
  },
  saveButton: {
    backgroundColor: "#7511b5",
    paddingVertical: 11,
    paddingHorizontal: 30,
    alignItems: "center",
    borderRadius: 25,
    width: "80%",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    marginBottom: 13,
  },
  saveButtonDisabled: {
    backgroundColor: "rgba(117, 17, 181, 0.25)",
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: width * 0.8,
    padding: 20,
    borderRadius: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  modalText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: "bold",
  },
});
