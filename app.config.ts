// app.config.ts
import { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Hustl",
  slug: "hustl",
  scheme: "hustl",

  version: "1.0.0",
  orientation: "portrait",
  userInterfaceStyle: "automatic",
  icon: "./src/assets/images/1024.png",

  ios: {
    bundleIdentifier: "com.hustl.app",
    supportsTablet: true,
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        "We use your location to show nearby tasks on the map.",
      NSCameraUsageDescription:
        "We use your camera to take profile photos and task photos.",
      NSPhotoLibraryUsageDescription:
        "We use your photo library to select profile photos.",
      LSApplicationQueriesSchemes: ["comgooglemaps"],
    },
  },

  android: {
    package: "com.hustl.app",
    adaptiveIcon: {
      foregroundImage: "./src/assets/images/icon.png",
      backgroundColor: "#FFFFFF",
    },
  },

  web: {
    bundler: "metro",
    output: "single",
    favicon: "./src/assets/images/favicon.png",
  },

  plugins: [
    "expo-router",
    "expo-dev-client", // required for Bolt device preview
    [
      "expo-location",
      {
        locationAlwaysAndWhenInUseUsageDescription:
          "We use your location to show nearby tasks on the map.",
      },
    ],
    [
      "expo-maps",
      {
        googleMapsApiKey:
          process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || "YOUR_GOOGLE_MAPS_KEY",
      },
    ],
    [
      "@stripe/stripe-react-native",
      {
        merchantIdentifier: "merchant.com.hustl", // required for Apple Pay
        publishableKey: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || "YOUR_STRIPE_KEY",
      },
    ],
    "expo-font",
    "expo-web-browser"
  ],

  experiments: {
    typedRoutes: true,
  },

  extra: {
    EXPO_PUBLIC_GOOGLE_MAPS_API_KEY:
      process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
    easProjectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID,
  },
});