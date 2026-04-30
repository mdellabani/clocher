import { ExpoConfig, ConfigContext } from "expo/config";

const IS_DEMO = process.env.APP_VARIANT === "demo";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: IS_DEMO ? "Pretou (Demo)" : "Pretou",
  slug: "pretou",
  version: "1.0.0",
  owner: "mdellabani",
  orientation: "portrait",
  icon: "./assets/icon.png",
  scheme: IS_DEMO ? "pretou-demo" : "pretou",
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
      ? "com.pretou.app.demo"
      : "com.pretou.app",
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
    package: IS_DEMO
      ? "com.pretou.app.demo"
      : "com.pretou.app",
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
    url: "https://u.expo.dev/57f2c1e9-4b1a-4088-b894-1b27d249d6d2",
  },
  runtimeVersion: {
    policy: "appVersion",
  },
  extra: {
    eas: {
      projectId: "57f2c1e9-4b1a-4088-b894-1b27d249d6d2",
    },
    posthogKey: process.env.EXPO_PUBLIC_POSTHOG_KEY,
    posthogHost: process.env.EXPO_PUBLIC_POSTHOG_HOST,
  },
});
