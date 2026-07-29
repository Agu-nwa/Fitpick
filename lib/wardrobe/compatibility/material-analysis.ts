function clean(value: unknown) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9\s/%-]/g, " ").replace(/\s+/g, " ").trim();
}

const materialFamilies: Array<{ family: string; patterns: RegExp[] }> = [
  { family: "cotton", patterns: [/heavy cotton/, /cotton blend/, /\bcotton\b/, /jersey/] },
  { family: "wool", patterns: [/cashmere/, /\bwool\b/, /tweed/, /felt/] },
  { family: "silk", patterns: [/\bsilk\b/, /satin/] },
  { family: "linen", patterns: [/\blinen\b/] },
  { family: "denim", patterns: [/\bdenim\b/, /\bjean\b/] },
  { family: "leather", patterns: [/patent leather/, /\bleather\b/, /\bsuede\b/] },
  { family: "technical", patterns: [/nylon/, /polyester/, /technical/, /waterproof/, /water resistant/] },
  { family: "canvas", patterns: [/\bcanvas\b/] },
  { family: "knit", patterns: [/\bknit\b/, /ribbed/, /fleece/] }
];

export function analyseMaterialValue(value: unknown) {
  const text = clean(value);
  if (!text) return { material: "", family: "", confidence: 0 };

  const match = materialFamilies.find((entry) => entry.patterns.some((pattern) => pattern.test(text)));
  return {
    material: text,
    family: match?.family || text.split(" ")[0] || "",
    confidence: match ? 0.82 : 0.48
  };
}

export function materialRelationship(source: unknown, target: unknown, weatherContext = "") {
  const a = analyseMaterialValue(source);
  const b = analyseMaterialValue(target);
  if (!a.family || !b.family) return { score: 8, reason: "", confidence: 0.25 };
  if (a.family === b.family) {
    return {
      score: 17,
      reason: "Materials share a compatible texture family.",
      confidence: Math.min(a.confidence, b.confidence)
    };
  }

  const text = `${a.material} ${b.material} ${weatherContext}`.toLowerCase();
  if (/rain|wet|drizzle|storm/.test(text) && /leather|technical|nylon|polyester|waterproof/.test(text)) {
    return {
      score: 15,
      reason: "Material choice supports wet-weather styling.",
      confidence: Math.min(a.confidence, b.confidence)
    };
  }
  if (/summer|hot|warm|humid/.test(text) && /linen|cotton|silk/.test(text) && !/wool|fleece|heavy/.test(text)) {
    return {
      score: 15,
      reason: "Light materials suit warm-weather wear.",
      confidence: Math.min(a.confidence, b.confidence)
    };
  }
  if (/winter|cold|chilly/.test(text) && /wool|cashmere|leather|knit|fleece/.test(text)) {
    return {
      score: 15,
      reason: "Warmer materials support cold-weather styling.",
      confidence: Math.min(a.confidence, b.confidence)
    };
  }
  return { score: 10, reason: "", confidence: Math.min(a.confidence, b.confidence) };
}
