"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CloudSun, MapPin } from "lucide-react";
import { LocationSelector } from "@/components/home/LocationSelector";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useSession } from "@/hooks/use-session";
import { getWeatherForecast, type LocationCity, type WeatherForecastData } from "@/lib/api-client";
import { safeUserMessage } from "@/lib/user-facing-errors";

function temp(value?: number) {
  return typeof value === "number" ? `${Math.round(value)}°C` : "--";
}

export function WeatherStylingCard() {
  const session = useSession();
  const chooseButtonRef = useRef<HTMLButtonElement>(null);
  const [weather, setWeather] = useState<WeatherForecastData | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [savedLocation, setSavedLocation] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  const loadWeather = useCallback(async (override?: { city?: string; countryCode?: string; latitude?: number; longitude?: number }) => {
    if (session.status !== "authenticated") return;
    setLoading(true);
    const result = await getWeatherForecast({ days: 7, ...override });
    setLoading(false);
    if (result.ok) {
      setWeather(result.data);
      if (result.data.status === "unavailable") setStatusMessage("");
      return;
    }
    setStatusMessage(safeUserMessage(result.error, "Unable to load weather right now."));
  }, [session.status]);

  useEffect(() => {
    void loadWeather();
  }, [loadWeather]);

  useEffect(() => {
    if (session.user?.weatherLocationName) setSavedLocation(session.user.weatherLocationName);
  }, [session.user?.weatherLocationName]);

  function closeSelector() {
    setSelectorOpen(false);
    window.setTimeout(() => chooseButtonRef.current?.focus(), 40);
  }

  async function handleLocationSaved(location: LocationCity) {
    const locationName = `${location.cityName}, ${location.countryName}`;
    setSavedLocation(locationName);
    setStatusMessage("Location saved.");
    closeSelector();

    await loadWeather({
      city: location.cityName,
      countryCode: location.countryCode,
      latitude: location.latitude,
      longitude: location.longitude
    });
    await session.refresh();
  }

  if (session.status === "logged-out") return null;

  const current = weather?.forecast?.current;
  const location = weather?.forecast?.location.name || savedLocation || session.user?.weatherLocationName || "";
  const hasLocation = Boolean(location);
  const weatherUnavailable = weather?.status === "unavailable";

  return (
    <>
      <Card className="border-olive/20 bg-gradient-to-br from-surface via-surface to-olive/10 p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-cocoa">
              <CloudSun size={14} aria-hidden="true" />
              Today&apos;s weather
            </p>
            {loading ? (
              <p className="mt-2 text-sm font-semibold text-ink">Loading styling guidance...</p>
            ) : current ? (
              <>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
                  {temp(current.temperature)}, {current.condition}
                </h2>
                <p className="mt-1 text-xs leading-5 text-muted">
                  {location ? `${location} · ` : ""}
                  High {temp(current.high)} / low {temp(current.low)}
                  {current.rainChance ? ` · ${Math.round(current.rainChance)}% rain` : ""}
                </p>
                <p className="mt-2 max-w-xl text-sm leading-6 text-muted">{current.stylingAdvice}</p>
              </>
            ) : weatherUnavailable && hasLocation ? (
              <>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">{location}</h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
                  {safeUserMessage(weather?.safeMessage, "Weather is temporarily unavailable. Your location is still saved.")}
                </p>
              </>
            ) : hasLocation ? (
              <>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">{location}</h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
                  MyFitPick will use this city for weather-aware outfit ideas.
                </p>
              </>
            ) : (
              <>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">Add your dressing location.</h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
                  MyFitPick can use your city to keep today&apos;s outfit practical without asking every time.
                </p>
              </>
            )}
            <p aria-live="polite" className="mt-2 min-h-5 text-xs font-semibold text-olive">
              {statusMessage}
            </p>
          </div>
          <div className="grid shrink-0 gap-2 sm:min-w-44">
            {weatherUnavailable && hasLocation ? (
              <Button type="button" className="w-full rounded-full" disabled={loading} onClick={() => void loadWeather()}>
                {loading ? "Checking..." : "Retry weather"}
              </Button>
            ) : (
              <Link href="/stylist">
                <Button className="w-full rounded-full">Style me for today</Button>
              </Link>
            )}
            <Button
              ref={chooseButtonRef}
              type="button"
              variant="secondary"
              className="w-full rounded-full"
              onClick={() => setSelectorOpen(true)}
            >
              <MapPin size={16} aria-hidden="true" />
              {hasLocation ? "Change city" : "Choose city"}
            </Button>
          </div>
        </div>
      </Card>
      <LocationSelector open={selectorOpen} onClose={closeSelector} onSaved={handleLocationSaved} />
    </>
  );
}
