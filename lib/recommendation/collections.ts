export function collectionFamilyFor(input: {
  occasionName?: string;
  recommendationMode?: string;
  outfitTemplateId?: string;
}) {
  const context = [input.occasionName, input.recommendationMode, input.outfitTemplateId].filter(Boolean).join(" ").toLowerCase();
  if (/business|work|office|interview|networking/.test(context)) return "Business Week";
  if (/date|dinner|evening/.test(context)) return "Date Night Collection";
  if (/wedding|formal|church|traditional|native/.test(context)) return "Occasion Collection";
  if (/weekend|casual|streetwear/.test(context)) return "Weekend Relaxed";
  if (/vacation|holiday|resort/.test(context)) return "Holiday Packing";
  if (/travel|airport/.test(context)) return "Travel Capsule";
  return "Everyday Rotation";
}
