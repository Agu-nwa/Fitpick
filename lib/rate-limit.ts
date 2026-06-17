import { apiError } from "@/lib/api-response";

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export function rateLimitPlaceholder(input: {
  key: string;
  limit?: number;
  windowMs?: number;
}) {
  const limit = input.limit ?? 20;
  const windowMs = input.windowMs ?? 60_000;
  const now = Date.now();
  const current = buckets.get(input.key);

  if (!current || current.resetAt <= now) {
    buckets.set(input.key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  current.count += 1;

  if (current.count > limit) {
    return apiError("RATE_LIMITED", "Too many requests. Please try again shortly.");
  }

  return null;
}
