function cleanBrand(value: unknown) {
  return String(value || "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

export function normalizeBrandSignal(input: {
  value?: unknown;
  confidence?: number;
  signals?: unknown[];
}) {
  const direct = cleanBrand(input.value);
  const signals = Array.isArray(input.signals)
    ? input.signals.map(cleanBrand).filter(Boolean)
    : [];
  const confidence = Math.max(0, Math.min(1, Number(input.confidence || 0)));

  if (direct && confidence >= 0.75) {
    return {
      value: direct,
      confidence,
      source: "brand_recognition" as const,
      status: "accepted" as const
    };
  }

  if (signals.length && confidence >= 0.7) {
    return {
      value: signals[0],
      confidence,
      source: "brand_recognition" as const,
      status: "accepted" as const
    };
  }

  return {
    value: "",
    confidence,
    source: "brand_recognition" as const,
    status: direct || signals.length ? "needs_review" as const : "unknown" as const
  };
}
