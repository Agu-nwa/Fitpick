import type { ApiFailure } from "@/types/api";

type ErrorInput = unknown;

const INTERNAL_DETAIL_PATTERNS = [
  /\b(?:HTTP|status(?:\s+code)?|[45]\d{2}|FASHN|OpenAI|Gemini|AWS|MongoDB|Mongoose|Mongo|S3|CloudFront|EC2|PM2|Redis|Nginx|Node\.js|Next\.js)\b/i,
  /\b(?:TypeError|ReferenceError|SyntaxError|AxiosError|FetchError|Exception|stack trace|ObjectId|idempotency|providerJobId|jobId)\b/i,
  /\b(?:endpoint|route|bucket|IAM|credential|secret|token|webhook|configured|configuration|internal server)\b/i,
  /(?:\/api\/|https?:\/\/|file:\/\/|\/Users\/|[A-Za-z]:\\|\.tsx?:\d+|\.jsx?:\d+)/
];

const DEFAULT_MESSAGE = "Something went wrong. Please try again shortly.";

const MESSAGE_BY_CODE: Record<ApiFailure["error"]["code"], string> = {
  BAD_REQUEST: "Please check the details and try again.",
  UNAUTHORIZED: "Please sign in to continue.",
  FORBIDDEN: "You do not have access to this.",
  NOT_FOUND: "We could not find that item.",
  CONFLICT: "This was already updated. Refresh and try again.",
  VALIDATION_ERROR: "Please review the highlighted fields.",
  RATE_LIMITED: "Please wait a moment and try again.",
  INSUFFICIENT_CREDITS: "You need more Credits before continuing.",
  SETUP_REQUIRED: "Finish setup before continuing.",
  INTERNAL_ERROR: DEFAULT_MESSAGE
};

function errorCode(input: ErrorInput): ApiFailure["error"]["code"] | undefined {
  if (!input || typeof input === "string" || input instanceof Error || typeof input !== "object") return undefined;
  if ("ok" in input && (input as ApiFailure).ok === false) return (input as ApiFailure).error.code;
  if ("code" in input && typeof (input as { code?: unknown }).code === "string") {
    const code = (input as { code: string }).code;
    return code in MESSAGE_BY_CODE ? code as ApiFailure["error"]["code"] : undefined;
  }
  return undefined;
}

function rawMessage(input: ErrorInput): string {
  if (!input) return "";
  if (typeof input === "string") return input;
  if (input instanceof Error) return input.message;
  if (typeof input === "object" && "ok" in input && (input as ApiFailure).ok === false) return (input as ApiFailure).error.message;
  if (typeof input === "object" && "message" in input && typeof (input as { message?: unknown }).message === "string") {
    return (input as { message: string }).message;
  }
  return "";
}

export function containsInternalErrorDetails(message: string) {
  const normalized = message.trim();
  if (!normalized) return false;
  return INTERNAL_DETAIL_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function safeUserMessage(input: ErrorInput, fallback?: string) {
  const code = errorCode(input);
  const defaultMessage = fallback || (code ? MESSAGE_BY_CODE[code] : DEFAULT_MESSAGE);
  const message = rawMessage(input).trim();

  if (!message) return defaultMessage;
  if (containsInternalErrorDetails(message)) return defaultMessage;
  if (message.length > 220) return defaultMessage;

  return message;
}

export function safeApiFailure<T extends ApiFailure>(failure: T, fallback?: string): T {
  return {
    ...failure,
    error: {
      ...failure.error,
      message: safeUserMessage(failure.error, fallback)
    }
  };
}

export function safeTryOnErrorMessage(input: ErrorInput, fallback = "Virtual Try-On couldn't be completed. Please try again.") {
  const message = safeUserMessage(input, fallback);
  return /credit was not deducted|credit is available/i.test(message)
    ? message
    : `${message} Your credit was not deducted.`;
}

export function safeUploadErrorMessage(input: ErrorInput, fallback = "We could not upload these photos. Try again.") {
  const message = safeUserMessage(input, fallback);
  if (/failed to fetch|network|cors|direct upload/i.test(rawMessage(input))) {
    return "We could not send the photo. Try again, or use a smaller JPG or PNG image.";
  }
  return message;
}

export function safeUserMessages(messages: Array<string | null | undefined>, fallback?: string) {
  const safe = messages
    .map((message) => safeUserMessage(message || "", ""))
    .filter(Boolean);
  const unique = Array.from(new Set(safe));
  return unique.length ? unique : fallback ? [fallback] : [];
}

export function sanitizeUserFacingPayload<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeUserFacingPayload(entry)) as T;
  }

  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => {
      const lowerKey = key.toLowerCase();
      if (typeof entry === "string" && lowerKey.includes("error")) {
        return [key, entry.trim() ? safeUserMessage(entry) : ""];
      }
      if (Array.isArray(entry) && lowerKey.includes("warning")) {
        return [key, safeUserMessages(entry.filter((item): item is string => typeof item === "string"))];
      }
      return [key, sanitizeUserFacingPayload(entry)];
    })
  ) as T;
}
