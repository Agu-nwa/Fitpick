const redactedKeyPattern = /secret|token|password|cookie|authorization|credential|api[-_]?key|signed|base64|b64|prompt|raw/i;

export function safeErrorCategory(error: unknown) {
  if (error instanceof SyntaxError) return "syntax_error";
  if (error instanceof TypeError) return "type_error";
  if (error instanceof Error && /rate/i.test(error.message)) return "rate_limit";
  if (error instanceof Error && /s3|storage|upload/i.test(error.message)) return "storage";
  if (error instanceof Error && /webhook|signature/i.test(error.message)) return "webhook";
  if (error instanceof Error && /mongo|mongoose|database/i.test(error.message)) return "database";
  if (error instanceof Error && /openai|ai|model/i.test(error.message)) return "ai_provider";
  if (error instanceof Error && error.name) return error.name;
  return "unknown";
}

function sanitizeMetadata(value: unknown): unknown {
  if (Array.isArray(value)) return value.slice(0, 20).map(sanitizeMetadata);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([key]) => !redactedKeyPattern.test(key))
        .map(([key, entry]) => [key, sanitizeMetadata(entry)])
    );
  }
  if (typeof value === "string") return value.replace(/\?.+$/, "?[redacted]").slice(0, 160);
  if (typeof value === "number" || typeof value === "boolean" || value === null) return value;
  return undefined;
}

export function logSafeError(context: string, error: unknown, metadata: Record<string, unknown> = {}) {
  const safeMetadata = sanitizeMetadata(metadata);
  console.error("fitpick.error", {
    context,
    errorCategory: safeErrorCategory(error),
    ...(safeMetadata && typeof safeMetadata === "object" && !Array.isArray(safeMetadata) ? safeMetadata : {}),
    timestamp: new Date().toISOString()
  });
}
