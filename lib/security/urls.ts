function parseOrigin(value?: string | null) {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export function allowedAppOrigins() {
  const configured = [process.env.APP_URL, process.env.NEXT_PUBLIC_APP_URL]
    .map(parseOrigin)
    .filter(Boolean) as string[];

  if (process.env.NODE_ENV !== "production") {
    configured.push("http://localhost:3000", "http://127.0.0.1:3000");
  }

  return Array.from(new Set(configured));
}

export function isAllowedAppRedirect(value?: string | null) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return allowedAppOrigins().includes(url.origin);
  } catch {
    return false;
  }
}
