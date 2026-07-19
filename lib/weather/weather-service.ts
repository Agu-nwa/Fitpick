export type WeatherCondition =
  | "sunny"
  | "cloudy"
  | "rainy"
  | "stormy"
  | "cold"
  | "hot"
  | "snowy"
  | "windy"
  | "unknown";

export interface WeatherData {
  temperature: number;
  feelsLike?: number;
  high?: number;
  low?: number;
  rainChance?: number;
  humidity: number;
  windKph?: number;
  uvIndex?: number | null;
  condition: WeatherCondition;
  city?: string;
  country?: string;
  stylingAdvice?: string;
}

export type WeatherForecastDay = WeatherData & {
  date: string;
  label: string;
};

export type WeatherForecast = {
  location: {
    name: string;
    latitude?: number;
    longitude?: number;
  };
  current: WeatherData;
  days: WeatherForecastDay[];
  summary: string;
  cached: boolean;
  provider: "openweather";
  fetchedAt: string;
};

type ForecastInput = {
  city?: string;
  latitude?: number | null;
  longitude?: number | null;
  days?: number;
};

type CachedWeather = {
  expiresAt: number;
  value: WeatherForecast;
};

const memoryCache = new Map<string, CachedWeather>();
const defaultCacheTtlMs = 30 * 60 * 1000;

function weatherCacheTtlMs() {
  const value = Number(process.env.WEATHER_CACHE_TTL_SECONDS || 1800);
  return Number.isFinite(value) && value > 60 ? Math.min(value, 6 * 60 * 60) * 1000 : defaultCacheTtlMs;
}

function normalizeCity(city?: string) {
  return (city || "").replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, 120);
}

function roundCoord(value?: number | null) {
  return typeof value === "number" && Number.isFinite(value) ? Math.round(value * 1000) / 1000 : null;
}

function cacheKey(input: ForecastInput) {
  const lat = roundCoord(input.latitude);
  const lon = roundCoord(input.longitude);
  if (lat !== null && lon !== null) return `coords:${lat},${lon}`;
  return `city:${normalizeCity(input.city).toLowerCase()}`;
}

function conditionFrom(value: string, temp: number, windKph = 0): WeatherCondition {
  const text = value.toLowerCase();
  if (text.includes("thunder") || text.includes("storm")) return "stormy";
  if (text.includes("snow")) return "snowy";
  if (text.includes("rain") || text.includes("drizzle")) return "rainy";
  if (windKph >= 35) return "windy";
  if (text.includes("cloud")) return "cloudy";
  if (temp <= 12) return "cold";
  if (temp >= 30) return "hot";
  if (text.includes("clear") || text.includes("sun")) return "sunny";
  return "unknown";
}

function labelForDate(date: string) {
  const today = new Date();
  const target = new Date(`${date}T12:00:00.000Z`);
  const diff = Math.round((target.getTime() - Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 12)) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return target.toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric" });
}

export function buildWeatherStylingAdvice(weather: Pick<WeatherData, "temperature" | "humidity" | "rainChance" | "windKph" | "condition">) {
  const temperature = weather.temperature;
  const rainChance = weather.rainChance || 0;
  const humidity = weather.humidity || 0;
  const windKph = weather.windKph || 0;

  if (weather.condition === "stormy" || rainChance >= 65) {
    return "Choose weather-safe shoes and keep a protective layer close.";
  }

  if (weather.condition === "rainy" || rainChance >= 35) {
    return "Use pieces that handle light rain and avoid delicate materials.";
  }

  if (temperature >= 30 || weather.condition === "hot") {
    return humidity >= 70
      ? "Choose breathable pieces and keep layers light."
      : "Choose light fabrics and avoid heavy layering.";
  }

  if (temperature <= 12 || weather.condition === "cold" || weather.condition === "snowy") {
    return "Build warmth with layers, closed shoes, and a substantial outer layer.";
  }

  if (windKph >= 30 || weather.condition === "windy") {
    return "Keep the silhouette secure and add a layer that handles wind.";
  }

  return "A balanced outfit should work well; adjust layers for indoor temperature.";
}

function compactSummary(current: WeatherData, locationName: string) {
  const parts = [
    locationName,
    `${Math.round(current.temperature)}°C`,
    current.condition,
    current.high !== undefined && current.low !== undefined ? `high ${Math.round(current.high)}° / low ${Math.round(current.low)}°` : "",
    current.rainChance ? `${Math.round(current.rainChance)}% rain` : "",
    current.humidity ? `${Math.round(current.humidity)}% humidity` : ""
  ].filter(Boolean);

  return `${parts.join(", ")}. ${current.stylingAdvice || buildWeatherStylingAdvice(current)}`;
}

async function fetchOpenWeather(path: string) {
  const apiKey = process.env.OPENWEATHER_API_KEY;

  if (!apiKey) {
    throw new Error("weather_provider_not_configured");
  }

  const response = await fetch(`https://api.openweathermap.org/data/2.5/${path}&appid=${apiKey}&units=metric`, {
    next: { revalidate: 1800 }
  });

  if (!response.ok) {
    throw new Error("weather_provider_failed");
  }

  return response.json();
}

function normalizeCurrent(data: any, locationName?: string): WeatherData {
  const temp = Number(data.main?.temp ?? 0);
  const feelsLike = Number(data.main?.feels_like ?? temp);
  const windKph = Math.round(Number(data.wind?.speed || 0) * 3.6);
  const condition = conditionFrom(data.weather?.[0]?.main || data.weather?.[0]?.description || "", temp, windKph);
  const current = {
    temperature: temp,
    feelsLike,
    high: Number(data.main?.temp_max ?? temp),
    low: Number(data.main?.temp_min ?? temp),
    rainChance: typeof data.pop === "number" ? Math.round(data.pop * 100) : 0,
    humidity: Number(data.main?.humidity || 0),
    windKph,
    uvIndex: null,
    city: locationName || data.name || "",
    country: data.sys?.country || "",
    condition
  };

  return {
    ...current,
    stylingAdvice: buildWeatherStylingAdvice(current)
  };
}

function normalizeForecastDays(data: any, current: WeatherData, maxDays: number): WeatherForecastDay[] {
  const grouped = new Map<string, any[]>();
  for (const entry of data.list || []) {
    const date = String(entry.dt_txt || "").slice(0, 10);
    if (!date) continue;
    grouped.set(date, [...(grouped.get(date) || []), entry]);
  }

  const days = Array.from(grouped.entries())
    .slice(0, maxDays)
    .map(([date, entries]) => {
      const temperatures = entries.map((entry) => Number(entry.main?.temp)).filter(Number.isFinite);
      const humidities = entries.map((entry) => Number(entry.main?.humidity)).filter(Number.isFinite);
      const rain = entries.map((entry) => Number(entry.pop || 0) * 100).filter(Number.isFinite);
      const winds = entries.map((entry) => Number(entry.wind?.speed || 0) * 3.6).filter(Number.isFinite);
      const midday = entries.find((entry) => String(entry.dt_txt || "").includes("12:00:00")) || entries[0] || {};
      const temp = Number(midday.main?.temp ?? temperatures[0] ?? current.temperature);
      const windKph = Math.round(Math.max(...winds, current.windKph || 0));
      const condition = conditionFrom(midday.weather?.[0]?.main || midday.weather?.[0]?.description || "", temp, windKph);
      const day = {
        date,
        label: labelForDate(date),
        temperature: temp,
        feelsLike: Number(midday.main?.feels_like ?? temp),
        high: temperatures.length ? Math.max(...temperatures) : current.high,
        low: temperatures.length ? Math.min(...temperatures) : current.low,
        rainChance: rain.length ? Math.round(Math.max(...rain)) : current.rainChance || 0,
        humidity: humidities.length ? Math.round(humidities.reduce((sum, value) => sum + value, 0) / humidities.length) : current.humidity,
        windKph,
        uvIndex: null,
        city: current.city,
        country: current.country,
        condition
      };

      return {
        ...day,
        stylingAdvice: buildWeatherStylingAdvice(day)
      };
    });

  return days.length
    ? days
    : [{
        date: new Date().toISOString().slice(0, 10),
        label: "Today",
        ...current
      }];
}

export async function getWeatherForecast(input: ForecastInput): Promise<WeatherForecast> {
  const key = cacheKey(input);
  const cached = memoryCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return { ...cached.value, cached: true };

  const city = normalizeCity(input.city);
  const lat = roundCoord(input.latitude);
  const lon = roundCoord(input.longitude);
  if (!city && (lat === null || lon === null)) throw new Error("weather_location_missing");

  const locationQuery = lat !== null && lon !== null
    ? `lat=${lat}&lon=${lon}`
    : `q=${encodeURIComponent(city)}`;

  const currentRaw = await fetchOpenWeather(`weather?${locationQuery}`);
  const current = normalizeCurrent(currentRaw, city || currentRaw.name);
  const forecastRaw = await fetchOpenWeather(`forecast?${locationQuery}`);
  const days = normalizeForecastDays(forecastRaw, current, Math.min(Math.max(input.days || 7, 1), 7));
  const locationName = [current.city || city || "Saved location", current.country].filter(Boolean).join(", ");
  const forecast = {
    location: {
      name: locationName,
      latitude: lat ?? currentRaw.coord?.lat,
      longitude: lon ?? currentRaw.coord?.lon
    },
    current,
    days,
    summary: compactSummary(current, locationName),
    cached: false,
    provider: "openweather" as const,
    fetchedAt: new Date().toISOString()
  };

  memoryCache.set(key, { value: forecast, expiresAt: Date.now() + weatherCacheTtlMs() });
  return forecast;
}

export async function getWeather(latitude: number, longitude: number): Promise<WeatherData> {
  const forecast = await getWeatherForecast({ latitude, longitude, days: 1 });
  return forecast.current;
}

export function isWeatherSensitiveMessage(message: string) {
  return /(today|tomorrow|tonight|this weekend|weekend|weather|rain|cold|hot|warm|humid|wind|snow|forecast|outside|commute)/i.test(message);
}
