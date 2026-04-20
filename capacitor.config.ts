import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.pocketsets.app",
  appName: "PocketSets",
  webDir: "dist/public",
  ios: {
    contentInset: "automatic",
  },
};

export default config;
