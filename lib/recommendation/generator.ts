import { scoreOutfit } from "@/lib/recommendation/scoring";
import { calculatePreferenceBoost } from "@/lib/recommendation/learning";
import { calculateWeatherScore }
  from "@/lib/weather/weather-scoring";

export function generateCombinations(
  wardrobeItems: any[],
  categories: string[],
  scoringInput: any
) {
  const categoryMap: Record<string, any[]> = {};

  // Group wardrobe items by category
  categories.forEach((category) => {
    categoryMap[category] = wardrobeItems
      .filter((item) => item.category === category)
      .slice(0, 5); // Prevent combinational explosion
  });

  const tops = categoryMap["tops"] || [];
  const bottoms = categoryMap["bottoms"] || [];
  const shoes = categoryMap["shoes"] || [];

  const outfits: any[] = [];

  for (const top of tops) {
    for (const bottom of bottoms) {
      for (const shoe of shoes) {
        const items = [top, bottom, shoe];
        let score =
          scoreOutfit(
            items,
            scoringInput
          );

        for (const item of items) {
          score += calculateWeatherScore(
            item,
            scoringInput.weather || null
          );

          score += calculatePreferenceBoost(
            item,
            scoringInput.preferences
          );
        }
        outfits.push({
          items,
          score
        });
      }
    }
  }

  return outfits.sort(
    (a, b) => b.score - a.score
  );
}