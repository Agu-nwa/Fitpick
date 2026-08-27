import type { NextRequest } from "next/server";

export function isIosAppStoreRequest(request: NextRequest) {
  const userAgent = request.headers.get("user-agent") || "";
  const platform = request.headers.get("x-fitpick-platform") || "";
  return /MyFitPickIOS|AppStoreShell/i.test(userAgent) || platform.toLowerCase() === "ios";
}
