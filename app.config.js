export default {
  expo: {
    name: "Tripify",
    slug: "tripify",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/tripify-icon-1024x1024.png",
    scheme: "fb517197711280428",
    userInterfaceStyle: "automatic",
    splash: {
      image: "./assets/images/gradient5.png",
      resizeMode: "cover",
      backgroundColor: "#000000"
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.matisp6.tripify"
    },
    android: {
      package: "com.matisp6.tripify",
      icon: "./assets/images/tripify-icon-1024x1024.png",
      permissions: [
        "com.facebook.permission.FACEBOOK_LOGIN",
        "INTERNET",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE"
      ],
      androidStatusBar: {
        backgroundColor: "transparent",
        translucent: true,
        barStyle: "light-content"
      },
      androidNavigationBar: {
        visible: "sticky",
        backgroundColor: "#F5F5F5",
        barStyle: "dark-content"
      },
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png"
    },
    plugins: [
      [
        "react-native-fbsdk-next",
        {
          appID: "517197711280428",
          clientToken: "e70a82b40276d3ae9177f7c0fc0dd241",
          displayName: "Tripify",
          scheme: "fb517197711280428",
          advertiserIDCollectionEnabled: false,
          autoLogAppEventsEnabled: false,
          isAutoInitEnabled: true,
          iosUserTrackingPermission: "This identifier will be used to deliver personalized ads to you."
        }
      ],
      "expo-router",
      "expo-asset",
      "expo-font",
      // Dodajemy plugin expo-build-properties
      [
        "expo-build-properties",
        {
          android: {
            compileSdkVersion: 34,
            targetSdkVersion: 34,
              gradleProperties: {
                "glideVersion": "4.13.2"
            },
          },
        },
      ],
    ],
    experiments: {
      typedRoutes: true
    },
    extra: {
      eas: {
        projectId: "58d843ea-b48b-4eb3-8e06-705b82f7487c"
      }
    },
    owner: "matisp6"
  }
};
