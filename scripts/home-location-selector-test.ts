import fs from "node:fs";
import path from "node:path";
import { findLocationCity, listLocationCountries, searchLocationCities } from "../lib/locations/location-data";

const root = process.cwd();

function read(file: string) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

function isSorted(values: string[]) {
  return values.every((value, index) => index === 0 || values[index - 1].localeCompare(value) <= 0);
}

const countries = listLocationCountries();
assert(countries.length > 0, "countries should be available");
assert(isSorted(countries.map((country) => country.name)), "countries should be alphabetical");
assert(countries.some((country) => country.code === "CA" && country.name === "Canada"), "Canada should be present");

const canadianCities = searchLocationCities({ countryCode: "CA", query: "", limit: 50 });
assert(isSorted(canadianCities.map((city) => city.cityName)), "cities should be alphabetical within country");
assert(canadianCities.some((city) => city.cityName === "Toronto"), "Toronto should be available for Canada");

const torontoSearch = searchLocationCities({ countryCode: "CA", query: "tor", limit: 20 });
assert(torontoSearch.length === 1 && torontoSearch[0].cityName === "Toronto", "city search should find Toronto");
assert(findLocationCity("CA", torontoSearch[0].id)?.cityName === "Toronto", "city id should resolve for its own country");
assert(findLocationCity("US", torontoSearch[0].id) === null, "invalid country/city combinations should be rejected");

const weatherCard = read("components/home/WeatherStylingCard.tsx");
assert(!weatherCard.includes('href="/profile/preferences"'), "Home weather card should not redirect to Profile Preferences");
assert(weatherCard.includes("LocationSelector"), "Home weather card should open the location selector");
assert(weatherCard.includes("Choose city") && weatherCard.includes("Change city"), "Home weather card should keep choose/change city actions");
assert(weatherCard.includes("session.refresh()"), "Home save flow should refetch user session");
assert(weatherCard.includes("loadWeather({"), "Home save flow should refetch weather after save");

const selector = read("components/home/LocationSelector.tsx");
assert(selector.includes('role="dialog"') && selector.includes('aria-modal="true"'), "selector should be an accessible modal dialog");
assert(selector.includes("Escape"), "selector should close on Escape");
assert(selector.includes('event.key !== "Tab"'), "selector should trap keyboard focus");
assert(selector.includes("disabled={!selectedCountry}"), "city search should be disabled before country selection");
assert(selector.includes("window.setTimeout"), "city search should be debounced");
assert(selector.includes("Loading countries") && selector.includes("Loading cities"), "selector should expose loading states");
assert(selector.includes("Unable to save"), "selector should expose save failure state");

const countriesRoute = read("app/api/locations/countries/route.ts");
const citiesRoute = read("app/api/locations/cities/route.ts");
const saveRoute = read("app/api/users/me/location/route.ts");
assert(countriesRoute.includes("requireUser()"), "country endpoint should require authentication");
assert(citiesRoute.includes("countryCode") && citiesRoute.includes("searchLocationCities"), "city endpoint should validate country searches");
assert(saveRoute.includes("requireUser()"), "location save endpoint should require authentication");
assert(saveRoute.includes("findLocationCity"), "location save endpoint should validate server-side city ids");
assert(saveRoute.includes("weatherLatitude") && saveRoute.includes("weatherLongitude"), "location save should persist coordinates");

const weatherRoute = read("app/api/weather/forecast/route.ts");
const weatherService = read("lib/weather/weather-service.ts");
assert(weatherRoute.includes("Weather is temporarily unavailable. Your location is still saved."), "weather route should use graceful failure copy");
assert(weatherRoute.includes("weatherErrorMetadata"), "weather route should log structured provider metadata");
assert(weatherService.includes("WeatherProviderError"), "weather service should expose structured provider errors");
assert(weatherService.includes("retryable") && weatherService.includes("provider_timeout"), "weather service should classify retryable transient failures");
assert(weatherService.includes("weatherCacheTtlMs"), "weather service should cache provider responses");

console.log("home-location-selector: ok");
