import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.myfitpick.app",
  appName: "MyFitPick",
  webDir: "app-store-shell",
  appendUserAgent: " MyFitPickIOS/1.0 AppStoreShell",
  server: {
    url: "https://myfitpick.com",
    cleartext: false,
    allowNavigation: ["myfitpick.com", "www.myfitpick.com"]
  },
  ios: {
    contentInset: "automatic"
  }
};

export default config;
