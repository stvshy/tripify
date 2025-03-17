// app/country/CountryExtraInfo.tsx
import React, { useEffect } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
// Importujemy Image z expo-image (dla czytelności nazywamy go ExpoImage)
import FastImage from "@d11/react-native-fast-image";
import { useWeatherData } from "./useWeatherData";
import MonthlyTemperaturesSection from "./MonthlyTemperaturesSection";
import { CountryProfileData } from "./[cid]";

interface Props {
  country: CountryProfileData;
  outletUrls: string[];
  transportUrls: string[];
  drivingSideUrl: string;
  outletCardImageSize: number;
}

const CountryExtraInfo: React.FC<Props> = ({
  country,
  outletUrls,
  transportUrls,
  drivingSideUrl,
  outletCardImageSize,
}) => {
  const { data: weatherData, loading: weatherLoading } = useWeatherData(
    country.capitalLatitude,
    country.capitalLongitude
  );

  useEffect(() => {
    if (drivingSideUrl && drivingSideUrl.trim() !== "") {
      FastImage.preload([{ uri: drivingSideUrl }]);
    }
    outletUrls.forEach((url) => {
      if (url && url.trim() !== "") {
        FastImage.preload([{ uri: url }]);
      }
    });
    transportUrls.forEach((url) => {
      if (url && url.trim() !== "") {
        FastImage.preload([{ uri: url }]);
      }
    });
  }, [drivingSideUrl, outletUrls, transportUrls]);

  const getOutletCaption = (filename: string): string => {
    const match = filename.match(/type-([A-Za-z]+)\./);
    return match && match[1] ? match[1].toUpperCase() : "";
  };

  return (
    <>
      {/* Additional Info Section */}
      <View style={[styles.sectionBox, { paddingTop: 0, paddingBottom: 4 }]}>
        <Text style={[styles.sectionTitle, { paddingTop: 0 }]}>
          Additional Info
        </Text>
        <View style={styles.row}>
          <View style={styles.halfInfoCard}>
            <Text style={styles.infoCardLabel}>💵 Currency</Text>
            <Text style={styles.infoCardValue}>{country.currency}</Text>
          </View>
          <View style={styles.halfInfoCard}>
            <Text style={styles.infoCardLabel}>📞 Dialing Code</Text>
            <Text style={styles.infoCardValue}>{country.dialingCode}</Text>
          </View>
        </View>
        <View style={styles.row}>
          <View style={styles.halfInfoCard}>
            <Text style={styles.infoCardLabel}>🍺 Drinking Age</Text>
            <Text style={styles.infoCardValue}>
              {country.legalAlcoholAge} years
            </Text>
          </View>
          <View style={styles.halfInfoCard}>
            <Text style={styles.infoCardLabel}>💨 Smoking Age</Text>
            <Text style={styles.infoCardValue}>
              {country.legalCigarettesAge} years
            </Text>
          </View>
        </View>
        <View style={styles.row}>
          <View style={styles.halfInfoCard}>
            <Text style={styles.infoCardLabel}>🚗 Driving Side</Text>
            <View style={{ alignSelf: "flex-start" }}>
              <View style={styles.drivingSideContainer}>
                {drivingSideUrl && drivingSideUrl.trim() !== "" && (
                  <FastImage
                    source={{ uri: drivingSideUrl }}
                    style={styles.drivingSideImage}
                    resizeMode={FastImage.resizeMode.contain}
                  />
                )}
                <Text style={styles.drivingSideText}>
                  {country.drivingSide.side}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.halfInfoCard}>
            <Text style={styles.infoCardLabel}>🔌 Electrical Outlets</Text>
            <View style={styles.outletCard}>
              {country.outlets.map((filename, index) => (
                <View key={index} style={styles.outletItem}>
                  {outletUrls[index] && outletUrls[index].trim() !== "" && (
                    <FastImage
                      source={{ uri: outletUrls[index] }}
                      style={[
                        styles.outletCardImage,
                        {
                          width: outletCardImageSize,
                          height: outletCardImageSize,
                        },
                      ]}
                      resizeMode={FastImage.resizeMode.cover}
                    />
                  )}
                  <Text style={styles.outletCaption}>
                    {getOutletCaption(filename)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>
        {/* Languages, Mobile Operators oraz Religions */}
        <View style={[styles.infoCard, { marginHorizontal: -3 }]}>
          <Text style={styles.infoCardLabel}>🌐 Official Languages</Text>
          <Text style={styles.infoCardValue}>
            {country.languages.join(", ")}
          </Text>
        </View>
        <View style={[styles.infoCard, { marginHorizontal: -3 }]}>
          <Text style={styles.infoCardLabel}>📡 Mobile Operators</Text>
          <Text style={styles.infoCardValue}>
            {country.networkOperators.join(", ")}
          </Text>
        </View>
        <View style={[styles.infoCard, { marginHorizontal: -3 }]}>
          <Text style={styles.infoCardLabel}>🙏 Religions</Text>
          <Text style={styles.infoCardValue}>
            {country.religions
              .map((r) => `${r.name} (${r.percentage}%)`)
              .join(", ")}
          </Text>
        </View>
        <View style={[styles.infoCard, { marginHorizontal: -3 }]}>
          <Text style={styles.infoCardLabel}>💊 Other Legal Drugs</Text>
          <Text style={styles.infoCardValue}>{country.legalDrugs}</Text>
        </View>
      </View>

      {/* Transport Apps Section */}
      <View style={styles.sectionBox}>
        <Text style={styles.sectionTitle}>Transport Apps</Text>
        <View style={styles.appsGrid}>
          {country.transportApps.map((app, index: number) => (
            <View key={index} style={styles.appCard}>
              {transportUrls[index] && transportUrls[index].trim() !== "" && (
                <FastImage
                  source={{ uri: transportUrls[index] }}
                  style={styles.appLogo}
                  resizeMode={FastImage.resizeMode.cover}
                />
              )}
              <Text style={styles.appName}>{app.name}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Weather Section */}
      <View style={styles.sectionBox}>
        <Text style={styles.sectionTitle}>Weather</Text>
        <View style={styles.row}>
          <View style={styles.halfInfoCard}>
            <Text style={styles.infoCardLabel}>🌡 Current Temp.</Text>
            {weatherLoading ? (
              <ActivityIndicator size="small" color="#000" />
            ) : weatherData ? (
              <Text style={styles.infoCardValue}>
                {weatherData.temperature}°C ({country.capital})
              </Text>
            ) : (
              <Text style={styles.errorText}>Error fetching weather data.</Text>
            )}
          </View>
          <View style={styles.halfInfoCard}>
            <Text style={styles.infoCardLabel}>⏰ Current Time</Text>
            {weatherLoading ? (
              <ActivityIndicator size="small" color="#000" />
            ) : weatherData ? (
              <Text style={styles.infoCardValue}>{weatherData.time}</Text>
            ) : (
              <Text style={styles.errorText}>Error fetching weather data.</Text>
            )}
          </View>
        </View>
        <View style={styles.row}>
          <View style={styles.halfInfoCard}>
            <Text style={styles.infoCardLabel}>📅 Best Time</Text>
            <Text style={styles.infoCardValue}>{country.bestTimeToVisit}</Text>
          </View>
          <View style={styles.halfInfoCard}>
            <Text style={styles.infoCardLabel}>☔ Rainy Season</Text>
            <Text style={styles.infoCardValue}>{country.rainySeason}</Text>
          </View>
        </View>
      </View>

      {/* Monthly Temperatures Section */}
      <View style={[styles.sectionBox, { paddingBottom: 9 }]}>
        <Text style={styles.sectionTitle}>Average Monthly Temperatures</Text>
        <MonthlyTemperaturesSection
          latitude={country.capitalLatitude}
          longitude={country.capitalLongitude}
        />
      </View>

      {/* Visa & Travel Tips Section */}
      <View style={styles.sectionBox}>
        <Text style={[styles.sectionTitle, { marginTop: -6 }]}>
          Travel Info
        </Text>
        <View style={[styles.infoCard, { marginHorizontal: -3 }]}>
          <Text style={styles.infoCardLabel}>🛂 Visa Requirements</Text>
          <Text style={styles.infoCardValue}>{country.visaRequired}</Text>
        </View>
        <View style={[styles.infoCard, { marginHorizontal: -3 }]}>
          <Text style={styles.infoCardLabel}>💡 Travel Tips</Text>
          <Text style={styles.infoCardValue}>{country.travelTips}</Text>
        </View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  sectionBox: {
    borderBottomWidth: 1,
    borderColor: "#ddd",
    padding: 12,
    backgroundColor: "rgb(255, 254, 255)",
    marginVertical: 3,
    paddingTop: 7,
    paddingBottom: 20,
    borderRadius: 15,
  },
  sectionTitle: {
    fontSize: 16.5,
    marginBottom: 10,
    color: "#333",
    fontFamily: "PlusJakartaSans-Bold",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 3.5,
    marginHorizontal: -7,
  },
  halfInfoCard: {
    flex: 1,
    marginHorizontal: 3.5,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 16,
    padding: 10,
    backgroundColor: "#fff",
  },
  infoCard: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 16,
    padding: 10,
    marginVertical: 3.5,
    backgroundColor: "#fff",
  },
  infoCardLabel: {
    fontSize: 15,
    color: "#333",
    fontFamily: "Inter-SemiBold",
  },
  infoCardValue: {
    fontSize: 14.5,
    color: "#555",
    marginTop: 13,
    fontFamily: "Figtree-Regular",
  },
  drivingSideContainer: {
    flexDirection: "column",
    alignItems: "center",
    marginTop: 8,
  },
  drivingSideImage: {
    width: 48,
    height: 48,
    marginBottom: 5,
  },
  drivingSideText: {
    fontSize: 14.5,
    color: "#333",
    textAlign: "center",
    fontFamily: "Figtree-Regular",
    marginTop: 4,
  },
  outletCard: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    marginTop: 8,
  },
  outletItem: {
    alignItems: "center",
    marginRight: 5,
    marginBottom: 5,
  },
  outletCaption: {
    fontSize: 12.5,
    color: "#333",
    marginTop: 4,
    textAlign: "center",
    fontFamily: "Figtree-Regular",
  },
  outletCardImage: {
    borderRadius: 7,
  },
  appsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    marginLeft: -6,
  },
  appCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingLeft: 5,
    paddingVertical: 5,
    paddingRight: 10,
    margin: 3.2,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  appLogo: {
    width: 40,
    height: 40,
    borderRadius: 15,
    marginRight: 7,
  },
  appName: {
    fontSize: 14.5,
    color: "#333",
    fontFamily: "Figtree-Medium",
  },
  errorText: {
    color: "red",
    fontSize: 16,
    fontFamily: "Figtree-Regular",
  },
});

export default CountryExtraInfo;
