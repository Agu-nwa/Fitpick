export type LocationCountry = {
  code: string;
  name: string;
};

export type LocationCity = {
  id: string;
  countryCode: string;
  countryName: string;
  cityName: string;
  latitude: number;
  longitude: number;
  timezone: string;
};

type CitySeed = Omit<LocationCity, "id" | "countryName">;

const countries: LocationCountry[] = [
  { code: "CA", name: "Canada" },
  { code: "FR", name: "France" },
  { code: "DE", name: "Germany" },
  { code: "GH", name: "Ghana" },
  { code: "IT", name: "Italy" },
  { code: "NG", name: "Nigeria" },
  { code: "ZA", name: "South Africa" },
  { code: "ES", name: "Spain" },
  { code: "SE", name: "Sweden" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "GB", name: "United Kingdom" },
  { code: "US", name: "United States" }
].sort((a, b) => a.name.localeCompare(b.name));

const citySeeds: CitySeed[] = [
  { countryCode: "AE", cityName: "Abu Dhabi", latitude: 24.4539, longitude: 54.3773, timezone: "Asia/Dubai" },
  { countryCode: "AE", cityName: "Dubai", latitude: 25.2048, longitude: 55.2708, timezone: "Asia/Dubai" },
  { countryCode: "AE", cityName: "Sharjah", latitude: 25.3463, longitude: 55.4209, timezone: "Asia/Dubai" },
  { countryCode: "CA", cityName: "Calgary", latitude: 51.0447, longitude: -114.0719, timezone: "America/Edmonton" },
  { countryCode: "CA", cityName: "Montreal", latitude: 45.5017, longitude: -73.5673, timezone: "America/Toronto" },
  { countryCode: "CA", cityName: "Toronto", latitude: 43.6532, longitude: -79.3832, timezone: "America/Toronto" },
  { countryCode: "CA", cityName: "Vancouver", latitude: 49.2827, longitude: -123.1207, timezone: "America/Vancouver" },
  { countryCode: "DE", cityName: "Berlin", latitude: 52.52, longitude: 13.405, timezone: "Europe/Berlin" },
  { countryCode: "DE", cityName: "Hamburg", latitude: 53.5511, longitude: 9.9937, timezone: "Europe/Berlin" },
  { countryCode: "DE", cityName: "Munich", latitude: 48.1351, longitude: 11.582, timezone: "Europe/Berlin" },
  { countryCode: "ES", cityName: "Barcelona", latitude: 41.3874, longitude: 2.1686, timezone: "Europe/Madrid" },
  { countryCode: "ES", cityName: "Madrid", latitude: 40.4168, longitude: -3.7038, timezone: "Europe/Madrid" },
  { countryCode: "ES", cityName: "Valencia", latitude: 39.4699, longitude: -0.3763, timezone: "Europe/Madrid" },
  { countryCode: "FR", cityName: "Lyon", latitude: 45.764, longitude: 4.8357, timezone: "Europe/Paris" },
  { countryCode: "FR", cityName: "Marseille", latitude: 43.2965, longitude: 5.3698, timezone: "Europe/Paris" },
  { countryCode: "FR", cityName: "Paris", latitude: 48.8566, longitude: 2.3522, timezone: "Europe/Paris" },
  { countryCode: "GB", cityName: "Birmingham", latitude: 52.4862, longitude: -1.8904, timezone: "Europe/London" },
  { countryCode: "GB", cityName: "London", latitude: 51.5072, longitude: -0.1276, timezone: "Europe/London" },
  { countryCode: "GB", cityName: "Manchester", latitude: 53.4808, longitude: -2.2426, timezone: "Europe/London" },
  { countryCode: "GH", cityName: "Accra", latitude: 5.6037, longitude: -0.187, timezone: "Africa/Accra" },
  { countryCode: "GH", cityName: "Kumasi", latitude: 6.6666, longitude: -1.6163, timezone: "Africa/Accra" },
  { countryCode: "GH", cityName: "Takoradi", latitude: 4.8845, longitude: -1.7554, timezone: "Africa/Accra" },
  { countryCode: "IT", cityName: "Florence", latitude: 43.7696, longitude: 11.2558, timezone: "Europe/Rome" },
  { countryCode: "IT", cityName: "Milan", latitude: 45.4642, longitude: 9.19, timezone: "Europe/Rome" },
  { countryCode: "IT", cityName: "Rome", latitude: 41.9028, longitude: 12.4964, timezone: "Europe/Rome" },
  { countryCode: "NG", cityName: "Abuja", latitude: 9.0765, longitude: 7.3986, timezone: "Africa/Lagos" },
  { countryCode: "NG", cityName: "Ibadan", latitude: 7.3775, longitude: 3.947, timezone: "Africa/Lagos" },
  { countryCode: "NG", cityName: "Lagos", latitude: 6.5244, longitude: 3.3792, timezone: "Africa/Lagos" },
  { countryCode: "NG", cityName: "Port Harcourt", latitude: 4.8156, longitude: 7.0498, timezone: "Africa/Lagos" },
  { countryCode: "SE", cityName: "Gothenburg", latitude: 57.7089, longitude: 11.9746, timezone: "Europe/Stockholm" },
  { countryCode: "SE", cityName: "Malmo", latitude: 55.605, longitude: 13.0038, timezone: "Europe/Stockholm" },
  { countryCode: "SE", cityName: "Stockholm", latitude: 59.3293, longitude: 18.0686, timezone: "Europe/Stockholm" },
  { countryCode: "US", cityName: "Atlanta", latitude: 33.749, longitude: -84.388, timezone: "America/New_York" },
  { countryCode: "US", cityName: "Chicago", latitude: 41.8781, longitude: -87.6298, timezone: "America/Chicago" },
  { countryCode: "US", cityName: "Houston", latitude: 29.7604, longitude: -95.3698, timezone: "America/Chicago" },
  { countryCode: "US", cityName: "Los Angeles", latitude: 34.0522, longitude: -118.2437, timezone: "America/Los_Angeles" },
  { countryCode: "US", cityName: "New York", latitude: 40.7128, longitude: -74.006, timezone: "America/New_York" },
  { countryCode: "ZA", cityName: "Cape Town", latitude: -33.9249, longitude: 18.4241, timezone: "Africa/Johannesburg" },
  { countryCode: "ZA", cityName: "Durban", latitude: -29.8587, longitude: 31.0218, timezone: "Africa/Johannesburg" },
  { countryCode: "ZA", cityName: "Johannesburg", latitude: -26.2041, longitude: 28.0473, timezone: "Africa/Johannesburg" }
];

const countriesByCode = new Map(countries.map((country) => [country.code, country]));

function slug(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizeCountryCode(countryCode: string) {
  return countryCode.replace(/[^a-z]/gi, "").toUpperCase().slice(0, 2);
}

function cleanSearch(value?: string) {
  return (value || "").replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().toLowerCase().slice(0, 80);
}

const cities: LocationCity[] = citySeeds
  .map((city) => {
    const country = countriesByCode.get(city.countryCode);
    if (!country) throw new Error(`Unknown location country ${city.countryCode}`);

    return {
      ...city,
      id: `${city.countryCode.toLowerCase()}-${slug(city.cityName)}`,
      countryName: country.name
    };
  })
  .sort((a, b) => a.countryName.localeCompare(b.countryName) || a.cityName.localeCompare(b.cityName));

export function listLocationCountries() {
  return countries.map((country) => ({ ...country }));
}

export function getLocationCountry(countryCode: string) {
  return countriesByCode.get(normalizeCountryCode(countryCode)) || null;
}

export function searchLocationCities(input: { countryCode: string; query?: string; limit?: number }) {
  const countryCode = normalizeCountryCode(input.countryCode);
  const query = cleanSearch(input.query);
  const limit = Math.min(Math.max(input.limit || 20, 1), 50);

  return cities
    .filter((city) => city.countryCode === countryCode)
    .filter((city) => !query || city.cityName.toLowerCase().includes(query))
    .sort((a, b) => a.cityName.localeCompare(b.cityName))
    .slice(0, limit)
    .map((city) => ({ ...city }));
}

export function findLocationCity(countryCode: string, cityId: string) {
  const normalizedCountry = normalizeCountryCode(countryCode);
  const cleanCityId = (cityId || "").trim().toLowerCase();

  return cities.find((city) => city.countryCode === normalizedCountry && city.id === cleanCityId) || null;
}
