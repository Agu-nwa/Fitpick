export type ImageFailureMetadata = {
  context: string;
  host: string;
  protocol: string;
  attempt: number;
  fallbackAvailable: boolean;
};

export function buildImageCandidates(primary?: string | null, fallback?: string | null) {
  const candidates = [primary, fallback]
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean);

  return Array.from(new Set(candidates));
}

export function safeImageFailureMetadata(input: {
  src: string;
  context?: string;
  attempt: number;
  fallbackAvailable: boolean;
}): ImageFailureMetadata {
  let host = "local";
  let protocol = "relative";

  try {
    const parsed = new URL(input.src, "https://myfitpick.invalid");
    host = parsed.hostname === "myfitpick.invalid" ? "local" : parsed.hostname.slice(0, 120);
    protocol = parsed.protocol.replace(":", "").slice(0, 16);
  } catch {
    host = "invalid";
    protocol = "unknown";
  }

  return {
    context: String(input.context || "image").replace(/[^a-z0-9_.-]/gi, "_").slice(0, 80),
    host,
    protocol,
    attempt: Math.max(1, Math.floor(input.attempt)),
    fallbackAvailable: input.fallbackAvailable
  };
}
