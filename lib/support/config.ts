const DEFAULT_SUPPORT_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;
const DEFAULT_SUPPORT_MESSAGE_MAX_LENGTH = 2000;

function readPositiveIntegerEnv(name: string, fallback: number) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

function readBooleanEnv(value?: string) {
  if (!value) return true;
  return !["0", "false", "no", "off"].includes(value.trim().toLowerCase());
}

export function isSupportChatEnabled() {
  return readBooleanEnv(process.env.SUPPORT_CHAT_ENABLED);
}

export function getSupportRealtimePort() {
  return readPositiveIntegerEnv("SUPPORT_REALTIME_PORT", 3003);
}

export function getSupportMessageMaxLength() {
  return Math.min(readPositiveIntegerEnv("SUPPORT_MESSAGE_MAX_LENGTH", DEFAULT_SUPPORT_MESSAGE_MAX_LENGTH), 4000);
}

export function getSupportAttachmentMaxBytes() {
  return Math.min(readPositiveIntegerEnv("SUPPORT_ATTACHMENT_MAX_BYTES", DEFAULT_SUPPORT_ATTACHMENT_MAX_BYTES), 50 * 1024 * 1024);
}

export function getSupportAllowedOrigins() {
  const configured = (process.env.SUPPORT_ALLOWED_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return [
    ...configured,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.APP_URL,
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "http://127.0.0.1:3002"
  ].filter(Boolean) as string[];
}

export function getSupportSocketSecret() {
  const secret = process.env.SUPPORT_SOCKET_TOKEN_SECRET || process.env.JWT_SECRET || "";
  if (secret.length < 32) {
    throw new Error("SUPPORT_SOCKET_TOKEN_SECRET or JWT_SECRET must be configured with at least 32 characters.");
  }
  return new TextEncoder().encode(secret);
}

export function supportPublicRuntimeConfig() {
  return {
    enabled: isSupportChatEnabled(),
    realtimeUrl: process.env.NEXT_PUBLIC_SUPPORT_REALTIME_URL || "",
    messageMaxLength: getSupportMessageMaxLength(),
    attachmentMaxBytes: getSupportAttachmentMaxBytes()
  };
}
