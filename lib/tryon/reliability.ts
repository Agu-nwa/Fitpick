type RetryOptions = {
  operation: string;
  attempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  timeoutMs?: number;
  metadata?: Record<string, unknown>;
};

export class TransientTryOnError extends Error {
  code: string;
  httpStatus?: number;

  constructor(message: string, code = "transient_tryon_error", httpStatus?: number) {
    super(message);
    this.name = "TransientTryOnError";
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

export class PermanentTryOnError extends Error {
  code: string;
  httpStatus?: number;

  constructor(message: string, code = "permanent_tryon_error", httpStatus?: number) {
    super(message);
    this.name = "PermanentTryOnError";
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

function sanitizeMetricMetadata(metadata: Record<string, unknown> = {}) {
  return JSON.parse(JSON.stringify(metadata, (key, value) => {
    if (/secret|token|key|password|authorization|base64|b64|signed|url/i.test(key)) return undefined;
    if (typeof value === "string") return value.slice(0, 180);
    return value;
  }));
}

export function tryOnBackoffDelay(baseMs: number, attempt: number, maxDelayMs = 30_000) {
  const exponential = Math.min(maxDelayMs, Math.max(250, baseMs) * Math.pow(2, Math.max(0, attempt)));
  const jitter = Math.floor(Math.random() * Math.min(1500, Math.max(250, baseMs)));
  return exponential + jitter;
}

export function waitForTryOnRetry(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isTransientHttpStatus(status?: number) {
  return Boolean(status && (status === 408 || status === 409 || status === 425 || status === 429 || status >= 500));
}

export function isPermanentHttpStatus(status?: number) {
  return Boolean(status && status >= 400 && !isTransientHttpStatus(status));
}

export function tryOnErrorCode(error: unknown) {
  if (error instanceof TransientTryOnError || error instanceof PermanentTryOnError) return error.code;
  if (error instanceof Error && error.name) return error.name;
  return "unknown";
}

export function isTransientTryOnError(error: unknown) {
  if (error instanceof TransientTryOnError) return true;
  if (error instanceof PermanentTryOnError) return false;
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    error.name === "AbortError" ||
    error.name === "TimeoutError" ||
    /timeout|timed out|temporar|econnreset|etimedout|eai_again|socket|network|fetch failed|rate limit|429|5\d\d/.test(message)
  );
}

export function logTryOnMetric(event: {
  metric: string;
  stage?: string;
  status: "success" | "failed" | "retry" | "skipped";
  durationMs?: number;
  attempt?: number;
  errorCode?: string;
  httpStatus?: number;
  metadata?: Record<string, unknown>;
}) {
  console.info("fitpick.tryon.metric", {
    metric: event.metric,
    stage: event.stage || "",
    status: event.status,
    durationMs: Math.max(0, Math.round(event.durationMs || 0)),
    attempt: event.attempt || 0,
    errorCode: event.errorCode || "",
    httpStatus: event.httpStatus || 0,
    ...sanitizeMetricMetadata(event.metadata),
    timestamp: new Date().toISOString()
  });
}

export async function retryTransient<T>(operation: () => Promise<T>, options: RetryOptions): Promise<T> {
  const attempts = Math.max(1, Math.min(options.attempts || 3, 8));
  const baseDelayMs = Math.max(250, options.baseDelayMs || 1000);
  const maxDelayMs = Math.max(baseDelayMs, options.maxDelayMs || 30_000);
  const deadline = options.timeoutMs ? Date.now() + options.timeoutMs : 0;
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const startedAt = Date.now();
    try {
      const result = await operation();
      logTryOnMetric({
        metric: options.operation,
        status: "success",
        durationMs: Date.now() - startedAt,
        attempt,
        metadata: options.metadata
      });
      return result;
    } catch (error) {
      lastError = error;
      const retryable = isTransientTryOnError(error);
      const nextDelay = tryOnBackoffDelay(baseDelayMs, attempt, maxDelayMs);
      const hasAttemptLeft = attempt < attempts - 1;
      const hasTimeLeft = !deadline || Date.now() + nextDelay < deadline;

      logTryOnMetric({
        metric: options.operation,
        status: retryable && hasAttemptLeft && hasTimeLeft ? "retry" : "failed",
        durationMs: Date.now() - startedAt,
        attempt,
        errorCode: tryOnErrorCode(error),
        httpStatus: error instanceof TransientTryOnError || error instanceof PermanentTryOnError ? error.httpStatus : 0,
        metadata: options.metadata
      });

      if (!retryable || !hasAttemptLeft || !hasTimeLeft) throw error;
      await waitForTryOnRetry(nextDelay);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("tryon_retry_failed");
}
