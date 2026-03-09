import { ExpoConfig, ConfigContext } from "expo/config";

const IS_DEV = process.env.APP_VARIANT === "development";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: IS_DEV ? "Thrive (Dev)" : "Thrive",
  slug: "habit-tracker",
  version: "1.0.1",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: IS_DEV ? "habittracker-dev" : "habittracker",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  runtimeVersion: {
    policy: "fingerprint",
  },
  updates: {
    url: "https://u.expo.dev/38a997f1-2a62-44d7-bfe9-ecea70fd81c7",
  },
  splash: {
    image: "./assets/images/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff",
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: IS_DEV
      ? "com.hyperactive.thrive.dev"
      : "com.hyperactive.thrive",
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      UIDeviceFamily: [1],
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/images/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    "expo-notifications",
    [
      "@sentry/react-native/expo",
      {
        organization: process.env.SENTRY_ORG || "",
        project: process.env.SENTRY_PROJECT || "",
      },
    ],
    [
      "@kingstinct/react-native-healthkit",
      {
        NSHealthShareUsageDescription:
          "Thrive reads your health data to track progress and auto-complete habits.",
        NSHealthUpdateUsageDescription: false,
        background: false,
      },
    ],
    "expo-localization",
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        resizeMode: "contain",
        backgroundColor: "#ffffff",
        dark: {
          image: "./assets/images/icon.png",
          backgroundColor: "#0E1016",
        },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    posthogApiKey: "",
    posthogHost: "https://us.i.posthog.com",
    eas: {
      projectId: "38a997f1-2a62-44d7-bfe9-ecea70fd81c7",
    },
    router: {},
  },
  owner: "hyperactive-studio",
});
