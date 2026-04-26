import { ExpoConfig, ConfigContext } from "expo/config";

const IS_DEMO = process.env.APP_VARIANT === "demo";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: IS_DEMO ? "Pretou (Demo)" : "Pretou",
  slug: "rural-community-platform",
  version: "1.0.0",
  owner: "mdellabani",
  orientation: "portrait",
  icon: "./assets/icon.png",
  scheme: IS_DEMO ? "rural-community-platform-demo" : "rural-community-platform",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  splash: {
    image: "./assets/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff",
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: IS_DEMO
      ? "com.macommune.app.demo"
      : "com.macommune.app",
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
    package: IS_DEMO
      ? "com.macommune.app.demo"
      : "com.macommune.app",
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/favicon.png",
  },
  plugins: [
    "expo-router",
    "expo-notifications",
    "expo-camera",
    "expo-image-picker",
    "expo-location",
  ],
  updates: {
    url: "https://u.expo.dev/7618b9c8-3d4d-4bc8-b7df-e2e18cf25b70",
  },
  runtimeVersion: {
    policy: "appVersion",
  },
  extra: {
    eas: {
      projectId: "7618b9c8-3d4d-4bc8-b7df-e2e18cf25b70",
    },
    posthogKey: process.env.EXPO_PUBLIC_POSTHOG_KEY,
    posthogHost: process.env.EXPO_PUBLIC_POSTHOG_HOST,
  },
});
