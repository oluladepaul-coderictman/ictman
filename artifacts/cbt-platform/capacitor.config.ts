import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.bulldozer.cbt",
  appName: "CBT Bulldozer",
  webDir: "dist/public",
  server: {
    // Server URL is configured at runtime inside the app on first launch.
    // Users enter their local server IP after installing the APK.
    androidScheme: "http",
    cleartext: true,
    allowNavigation: ["*"],
  },
  android: {
    buildOptions: {
      releaseType: "APK",
    },
    allowMixedContent: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2500,
      backgroundColor: "#1d4ed8",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
