"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CloudSun, MapPin } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useSession } from "@/hooks/use-session";
import { getWeatherForecast, type WeatherForecastData } from "@/lib/api-client";

function temp(value?: number) {
  return typeof value === "number" ? `${Math.round(value)}°C` : "--";
}

export function WeatherStylingCard() {
  const session = useSession();
  const [weather, setWeather] = useState<WeatherForecastData | null>(null);
  const [loading, setLoading] = useState(false);

  const loadWeather = useCallback(async () => {
    if (session.status !== "authenticated") return;
    setLoading(true);
    const result = await getWeatherForecast({ days: 7 });
    setLoading(false);
    if (result.ok) setWeather(result.data);
  }, [session.status]);

  useEffect(() => {
    void loadWeather();
  }, [loadWeather]);

  if (session.status === "logged-out") return null;

  const current = weather?.forecast?.current;
  const location = weather?.forecast?.location.name || session.user?.weatherLocationName || "";

  return (
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
          ) : (
            <>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">Add your dressing location.</h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
                MyFitPick can use your city to keep today&apos;s outfit practical without asking every time.
              </p>
            </>
          )}
        </div>
        <div className="grid shrink-0 gap-2 sm:min-w-44">
          <Link href="/stylist">
            <Button className="w-full rounded-full">Style me for today</Button>
          </Link>
          {!current ? (
            <Link href="/onboarding?setup=model">
              <Button variant="secondary" className="w-full rounded-full">
                <MapPin size={16} aria-hidden="true" />
                Choose city
              </Button>
            </Link>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
