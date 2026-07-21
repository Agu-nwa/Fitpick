import { isFootwear, isOnePieceOutfit } from "@/lib/recommendation/completeness";

const coreCategories = ["tops", "bottoms", "dresses", "shoes", "outerwear", "accessories", "bags"];

function countByCategory(items: any[]) {
  return items.reduce((counts: Record<string, number>, item) => {
    counts[item.category] = (counts[item.category] || 0) + 1;
    return counts;
  }, {});
}

export function wardrobeReadiness(items: any[] = []) {
  const active = items.filter((item) => !item.archivedAt);
  const counts = countByCategory(active);
  const topCount = counts.tops || 0;
  const bottomCount = counts.bottoms || 0;
  const dressCount = counts.dresses || 0;
  const shoeCount = active.filter(isFootwear).length;
  const onePieceCount = active.filter(isOnePieceOutfit).length;
  const categoryCoverage = coreCategories.filter((category) => counts[category]).length;
  const possibleTwoPieceLooks = topCount * bottomCount * Math.max(1, shoeCount);
  const possibleOnePieceLooks = Math.max(dressCount, onePieceCount) * Math.max(1, shoeCount);
  const estimatedCompleteLooks = possibleTwoPieceLooks + possibleOnePieceLooks;
  const readinessScore = Math.max(0, Math.min(1, Math.round(((categoryCoverage / coreCategories.length) * 0.4 + Math.min(estimatedCompleteLooks / 12, 1) * 0.6) * 100) / 100));

  return {
    itemCount: active.length,
    categoryCoverage,
    counts,
    estimatedCompleteLooks,
    footwearVariety: shoeCount,
    outerwearVariety: counts.outerwear || 0,
    accessoryVariety: (counts.accessories || 0) + (counts.bags || 0),
    readinessScore,
    isSmallWardrobe: active.length < 12 || estimatedCompleteLooks < 5
  };
}

export function wardrobeGapInsights(items: any[] = [], occasionName = "") {
  const readiness = wardrobeReadiness(items);
  const counts = readiness.counts;
  const insights: Array<{ category: string; message: string; unlockPotential: number }> = [];

  if (!readiness.footwearVariety) {
    insights.push({ category: "shoes", message: "Adding one versatile shoe option would complete far more looks.", unlockPotential: Math.max(1, (counts.tops || 0) * (counts.bottoms || 0) + (counts.dresses || 0)) });
  } else if (readiness.footwearVariety < 2 && readiness.estimatedCompleteLooks >= 4) {
    insights.push({ category: "shoes", message: "A second footwear option would reduce repeated outfit finishes.", unlockPotential: Math.max(2, Math.round(readiness.estimatedCompleteLooks * 0.45)) });
  }

  if ((counts.tops || 0) && !(counts.bottoms || 0) && !(counts.dresses || 0)) {
    insights.push({ category: "bottoms", message: "A reliable bottom would unlock the tops already in your closet.", unlockPotential: Math.max(1, counts.tops || 0) });
  }

  if ((counts.bottoms || 0) && !(counts.tops || 0) && !(counts.dresses || 0)) {
    insights.push({ category: "tops", message: "A versatile top would unlock the bottoms already in your closet.", unlockPotential: Math.max(1, counts.bottoms || 0) });
  }

  if (/rain|cold|winter|wind|weather/i.test(occasionName) && !(counts.outerwear || 0)) {
    insights.push({ category: "outerwear", message: "A lightweight outer layer would make weather-aware styling stronger.", unlockPotential: Math.max(1, readiness.estimatedCompleteLooks) });
  }

  if (/formal|business|interview|wedding|dinner|date/i.test(occasionName) && readiness.accessoryVariety < 1) {
    insights.push({ category: "accessories", message: "One refined finishing piece would make dressier looks feel more complete.", unlockPotential: Math.max(1, Math.round(readiness.estimatedCompleteLooks * 0.25)) });
  }

  return insights.sort((a, b) => b.unlockPotential - a.unlockPotential).slice(0, 4);
}
