export type WeatherCondition =
  | "sunny"
  | "cloudy"
  | "rainy"
  | "stormy"
  | "cold"
  | "hot";

export interface WeatherData {
  temperature: number;
  humidity: number;
  condition: WeatherCondition;
  city?: string;
}

export async function getWeather(
  latitude: number,
  longitude: number
): Promise<WeatherData> {
  const apiKey = process.env.OPENWEATHER_API_KEY;

  if (!apiKey) {
    throw new Error(
      "OPENWEATHER_API_KEY is missing."
    );
  }

  const response = await fetch(
    `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=metric`,
    {
      next: {
        revalidate: 1800 // 30 mins cache
      }
    }
  );

  if (!response.ok) {
    throw new Error(
      "Unable to fetch weather."
    );
  }

  const data = await response.json();

  const main =
    data.weather?.[0]?.main?.toLowerCase() || "";

  let condition: WeatherCondition = "sunny";

  if (main.includes("rain")) {
    condition = "rainy";
  } else if (main.includes("storm")) {
    condition = "stormy";
  } else if (main.includes("cloud")) {
    condition = "cloudy";
  } else if (data.main.temp <= 18) {
    condition = "cold";
  } else if (data.main.temp >= 32) {
    condition = "hot";
  }

  return {
    temperature: data.main.temp,
    humidity: data.main.humidity,
    city: data.name,
    condition
  };
}