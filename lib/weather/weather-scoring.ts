import type { WeatherData } from "./weather-service";

export function calculateWeatherScore(
  item: any,
  weather: WeatherData | null
): number {
  if (!weather) return 0;

  let score = 0;

  const material =
    item.material?.toLowerCase() || "";

  const category =
    item.category?.toLowerCase() || "";

  // HOT WEATHER

  if (weather.condition === "hot") {
    if (
      material.includes("linen") ||
      material.includes("cotton")
    ) {
      score += 15;
    }

    if (
      category.includes("jacket") ||
      category.includes("coat")
    ) {
      score -= 25;
    }
  }

  // COLD WEATHER

  if (weather.condition === "cold") {
    if (
      category.includes("jacket") ||
      category.includes("coat") ||
      material.includes("wool")
    ) {
      score += 20;
    }
  }

  // RAIN

  if (
    weather.condition === "rainy" ||
    weather.condition === "stormy"
  ) {
    if (
      material.includes("suede")
    ) {
      score -= 30;
    }

    if (
      category.includes("boot")
    ) {
      score += 10;
    }
  }

  // HUMIDITY

  if (weather.humidity > 75) {
    if (
      material.includes("linen") ||
      material.includes("cotton")
    ) {
      score += 10;
    }

    if (
      material.includes("polyester")
    ) {
      score -= 10;
    }
  }

  return score;
}