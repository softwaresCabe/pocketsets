import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.pocketsets.app",
  appName: "PocketSets",
  webDir: "dist/public",
  ios: {
    contentInset: "automatic",
  },
  plugins: {
    LocalNotifications: {
      smallIcon: "ic_stat_icon_config_sample",
      iconColor: "#A855F7",
      sound: "default",
    },
  },
};

export default config;
