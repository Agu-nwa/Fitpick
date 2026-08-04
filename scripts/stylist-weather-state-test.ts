import assert from "node:assert/strict";
import {
  recommendationWeatherFitCopy,
  resolveRecommendationWeatherAvailability
} from "../lib/weather/stylist-weather-state";

assert.equal(resolveRecommendationWeatherAvailability({ requested: true }), "unavailable", "missing location/context remains explicit");
assert.equal(resolveRecommendationWeatherAvailability({ requested: false }), "not_requested", "ordinary styling is not blocked by weather");
assert.equal(resolveRecommendationWeatherAvailability({ requested: true, weatherContext: "Warm with light rain" }), "available");
assert.equal(
  recommendationWeatherFitCopy("", "unavailable"),
  "Weather was not included in this recommendation.",
  "missing weather never claims validation"
);
assert.equal(recommendationWeatherFitCopy("Warm and dry", "available"), "Warm and dry");

console.log("Stylist weather-state tests passed.");
