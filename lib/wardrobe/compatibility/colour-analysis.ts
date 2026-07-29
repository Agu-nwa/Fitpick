const shadeFamilies: Record<string, string> = {
  black: "black",
  charcoal: "black",
  white: "white",
  ivory: "white",
  cream: "white",
  beige: "neutral",
  camel: "neutral",
  tan: "neutral",
  taupe: "neutral",
  brown: "brown",
  chocolate: "brown",
  espresso: "brown",
  grey: "grey",
  gray: "grey",
  silver: "grey",
  blue: "blue",
  navy: "blue",
  royal: "blue",
  powder: "blue",
  sky: "blue",
  green: "green",
  olive: "green",
  sage: "green",
  emerald: "green",
  red: "red",
  burgundy: "red",
  wine: "red",
  maroon: "red",
  pink: "pink",
  blush: "pink",
  purple: "purple",
  lilac: "purple",
  yellow: "yellow",
  mustard: "yellow",
  orange: "orange",
  coral: "orange",
  gold: "metallic",
  bronze: "metallic"
};

function clean(value: unknown) {
  return String(value || "").toLowerCase().replace(/[^a-z\s-]/g, " ").replace(/\s+/g, " ").trim();
}

export function analyseColourValue(value: unknown) {
  const text = clean(value);
  if (!text) {
    return { family: "", shade: "", confidence: 0 };
  }

  const shade = Object.keys(shadeFamilies)
    .sort((a, b) => b.length - a.length)
    .find((candidate) => text.includes(candidate));

  if (!shade) {
    const fallback = text.split(" ")[0] || "";
    return { family: fallback, shade: text, confidence: 0.45 };
  }

  return {
    family: shadeFamilies[shade],
    shade: text.includes(" ") ? text : shade,
    confidence: text === shade ? 0.82 : 0.9
  };
}

export function colourHarmonyRelationship(source: unknown, target: unknown) {
  const a = analyseColourValue(source);
  const b = analyseColourValue(target);
  if (!a.family || !b.family) return { score: 8, reason: "", confidence: 0.25 };
  if (a.family === b.family) {
    return {
      score: a.shade === b.shade ? 14 : 18,
      reason: "Colours sit in the same family.",
      confidence: Math.min(a.confidence, b.confidence)
    };
  }
  const neutral = new Set(["black", "white", "neutral", "grey", "brown"]);
  if (neutral.has(a.family) || neutral.has(b.family)) {
    return {
      score: 20,
      reason: "A neutral colour helps balance the palette.",
      confidence: Math.min(a.confidence, b.confidence)
    };
  }
  const complementary = new Set(["blue:brown", "blue:orange", "green:brown", "red:black", "pink:grey", "yellow:blue"]);
  const pair = [a.family, b.family].sort().join(":");
  if (complementary.has(pair)) {
    return {
      score: 17,
      reason: "The colour pairing has a clear styling relationship.",
      confidence: Math.min(a.confidence, b.confidence)
    };
  }
  return { score: 10, reason: "", confidence: Math.min(a.confidence, b.confidence) };
}
