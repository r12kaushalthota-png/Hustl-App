import { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Hustl",
  slug: "hustl-app",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./src/assets/images/icon.png",
  scheme: "hustl",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,

  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.hustl.app",
    config: {
      usesNonExemptEncryption: false
    },
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        "We use your location to show nearby tasks on the map.",
      LSApplicationQueriesSchemes: ["comgooglemaps"],
      NSUserNotificationsUsageDescription:
        "We send you notifications about task updates and new opportunities."
    }
  },

  android: {
    package: "com.hustl.app",
    permissions: [
      "android.permission.RECEIVE_BOOT_COMPLETED",
      "android.permission.VIBRATE",
      "android.permission.WAKE_LOCK"
    ]
  },

  web: {
    bundler: "metro",
    output: "single",
    favicon: "./src/assets/images/favicon.png"
  },

  plugins: [
    "expo-router",
    "expo-dev-client",
    ["expo-maps", { googleMapsApiKey: "AIzaSyCrVIRCIog1gFNc_KFF669XaaebfdxUgn8" }],
    ["expo-location", {
      locationAlwaysAndWhenInUseUsageDescription:
        "We use your location to show nearby tasks on the map."
    }],
  ],

  experiments: {
    typedRoutes: true
  },

  extra: {
    EXPO_PUBLIC_GOOGLE_MAPS_API_KEY: "AIzaSyCrVIRCIog1gFNc_KFF669XaaebfdxUgn8"
  }
});