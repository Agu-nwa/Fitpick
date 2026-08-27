const sensitiveKey = /(^|_)(authorization|cookie|cookies|password|passwd|secret|token|session|email|phone|name|user_?id|storage_?key|image|photo|avatar|prompt|body|request_?body|credit_?card|card_?number|cvv|address|latitude|longitude)($|_)/i;
const objectIdPattern = /\b[a-f\d]{24}\b/gi;
const uuidPattern = /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi;

function scrubString(value: string) {
  let output = value.replace(objectIdPattern, "[record]").replace(uuidPattern, "[record]");
  try {
    const url = new URL(output, "https://myfitpick.invalid");
    if (url.pathname.startsWith("/api/uploads/") || url.pathname.includes("generated-previews") || url.pathname.includes("avatar-previews") || url.pathname.includes("/wardrobe/")) {
      return "[private-media-url]";
    }
    url.search = "";
    url.hash = "";
    output = output.startsWith("http") ? url.toString() : url.pathname;
  } catch {
    // Non-URL strings still receive record-identifier scrubbing above.
  }
  return output.slice(0, 500);
}

function scrubValue(value: unknown, depth = 0): unknown {
  if (depth > 5) return "[truncated]";
  if (typeof value === "string") return scrubString(value);
  if (typeof value === "number" || typeof value === "boolean" || value === null) return value;
  if (Array.isArray(value)) return value.slice(0, 30).map((entry) => scrubValue(entry, depth + 1));
  if (value && typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>).slice(0, 60)) {
      output[key] = sensitiveKey.test(key) ? "[redacted]" : scrubValue(entry, depth + 1);
    }
    return output;
  }
  return undefined;
}

export function scrubSentryEvent<T extends Record<string, any>>(event: T): T {
  const scrubbed = scrubValue(event) as T;
  delete scrubbed.user;
  if (scrubbed.request) {
    delete scrubbed.request.cookies;
    delete scrubbed.request.data;
    if (scrubbed.request.url) scrubbed.request.url = scrubString(String(scrubbed.request.url));
    if (scrubbed.request.headers) {
      delete scrubbed.request.headers.authorization;
      delete scrubbed.request.headers.Authorization;
      delete scrubbed.request.headers.cookie;
      delete scrubbed.request.headers.Cookie;
      delete scrubbed.request.headers["x-api-key"];
    }
  }
  return scrubbed;
}

export function scrubSentryBreadcrumb<T extends Record<string, any>>(breadcrumb: T): T {
  return scrubValue(breadcrumb) as T;
}
