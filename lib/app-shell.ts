type CapacitorBridge = {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
};

type NativeWindow = Window & {
  Capacitor?: CapacitorBridge;
};

function userAgentIncludes(value: string) {
  if (typeof navigator === "undefined") return false;
  return navigator.userAgent.includes(value);
}

export function isNativeAppShell() {
  if (typeof window === "undefined") return false;
  const nativeWindow = window as NativeWindow;
  return Boolean(nativeWindow.Capacitor?.isNativePlatform?.()) || userAgentIncludes("AppStoreShell");
}

export function isIosAppStoreShell() {
  if (typeof window === "undefined") return false;
  const nativeWindow = window as NativeWindow;
  return nativeWindow.Capacitor?.getPlatform?.() === "ios" || userAgentIncludes("MyFitPickIOS");
}
