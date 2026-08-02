export const studioModelFailureCodes = ["provider_timeout", "provider_rate_limited", "provider_rejected", "invalid_image_format", "resolution_too_small", "portrait_check_failed", "full_body_check_failed", "background_check_failed", "appearance_fidelity_failed", "duplicate_content", "storage_failed", "thumbnail_failed", "validation_unavailable", "generation_lease_expired", "unknown_generation_failure"] as const;
export type StudioModelFailureCode = typeof studioModelFailureCodes[number];
export function safeStudioModelFailureCode(error: unknown): StudioModelFailureCode {
  const text = error instanceof Error ? error.message.toLowerCase() : "";
  if (/timeout/.test(text)) return "provider_timeout"; if (/rate|429/.test(text)) return "provider_rate_limited";
  if (/reject|moderation/.test(text)) return "provider_rejected"; if (/thumbnail/.test(text)) return "thumbnail_failed";
  if (/storage|s3|upload/.test(text)) return "storage_failed"; if (/validation/.test(text)) return "validation_unavailable";
  return "unknown_generation_failure";
}
