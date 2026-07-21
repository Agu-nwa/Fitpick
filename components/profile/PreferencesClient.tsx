"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AuthRequiredState } from "@/components/integration/AuthRequiredState";
import { BackendUnavailableState } from "@/components/integration/BackendUnavailableState";
import { LoadingCard } from "@/components/integration/LoadingCard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { useSession } from "@/hooks/use-session";
import { getPreferences, updateCurrentUser, updatePreferences } from "@/lib/api-client";

const inputClass = "focus-ring min-h-11 w-full rounded-2xl border border-line bg-canvas/70 px-3 py-2 text-sm text-ink shadow-inner";
const otherLocation = "Other";
const dressingLocationOptions = [
  { country: "Nigeria", cities: ["Lagos", "Abuja", "Port Harcourt", "Ibadan"] },
  { country: "Ghana", cities: ["Accra", "Kumasi", "Takoradi"] },
  { country: "South Africa", cities: ["Johannesburg", "Cape Town", "Durban"] },
  { country: "United Kingdom", cities: ["London", "Manchester", "Birmingham"] },
  { country: "United States", cities: ["New York", "Los Angeles", "Chicago", "Houston", "Atlanta"] },
  { country: "Canada", cities: ["Toronto", "Vancouver", "Montreal", "Calgary"] },
  { country: "United Arab Emirates", cities: ["Dubai", "Abu Dhabi", "Sharjah"] },
  { country: "France", cities: ["Paris", "Lyon", "Marseille"] },
  { country: "Germany", cities: ["Berlin", "Munich", "Hamburg"] },
  { country: "Sweden", cities: ["Stockholm", "Gothenburg", "Malmo"] },
  { country: "Italy", cities: ["Milan", "Rome", "Florence"] },
  { country: "Spain", cities: ["Madrid", "Barcelona", "Valencia"] }
];

function splitTags(value: string) {
  return value.split(",").map((item) => cleanText(item).toLowerCase()).filter(Boolean);
}

function cleanText(value: string) {
  return value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim();
}

function formatLocation(city: string, country: string) {
  return [cleanText(city), cleanText(country)].filter(Boolean).join(", ");
}

function locationFromSaved(value?: string) {
  const cleaned = cleanText(value || "");
  if (!cleaned) return { country: "", city: "", custom: "" };

  const [cityPart, ...countryParts] = cleaned.split(",").map((part) => part.trim()).filter(Boolean);
  const countryPart = countryParts.join(", ");
  const countryOption = dressingLocationOptions.find((option) => option.country.toLowerCase() === countryPart.toLowerCase());
  const cityOption = countryOption?.cities.find((city) => city.toLowerCase() === cityPart.toLowerCase());

  if (countryOption && cityOption) return { country: countryOption.country, city: cityOption, custom: "" };
  return { country: otherLocation, city: otherLocation, custom: cleaned };
}

export function PreferencesClient() {
  const session = useSession();
  const [status, setStatus] = useState<"idle" | "loading" | "unavailable" | "saved" | "error">("idle");
  const [formality, setFormality] = useState("balanced");
  const [styleIdentity, setStyleIdentity] = useState("Simple, polished");
  const [colorPreferences, setColorPreferences] = useState("Neutrals, navy, earth tones");
  const [avoidColors, setAvoidColors] = useState("");
  const [comfortPriority, setComfortPriority] = useState("medium");
  const [repeatSensitivity, setRepeatSensitivity] = useState("medium");
  const [weatherEnabled, setWeatherEnabled] = useState(true);
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [customLocation, setCustomLocation] = useState("");
  const [personalizedRecommendations, setPersonalizedRecommendations] = useState(true);
  const [outfitHistoryEnabled, setOutfitHistoryEnabled] = useState(true);
  const [marketingNotifications, setMarketingNotifications] = useState(false);

  const loadPreferences = useCallback(async () => {
    setStatus("loading");
    const result = await getPreferences();
    if (result.ok) {
      const prefs = result.data.preferences || {};
      const privacy = result.data.privacy || {};
      setFormality(prefs.formality || "balanced");
      setStyleIdentity((prefs.styleIdentity || ["Simple", "polished"]).join(", "));
      setColorPreferences((prefs.colorPreferences || ["Neutrals", "navy", "earth tones"]).join(", "));
      setAvoidColors((prefs.avoidColors || []).join(", "));
      setComfortPriority(prefs.comfortPriority || "medium");
      setRepeatSensitivity(prefs.repeatSensitivity || "medium");
      setWeatherEnabled(prefs.weatherEnabled ?? true);
      setPersonalizedRecommendations(privacy.personalizedRecommendations ?? true);
      setOutfitHistoryEnabled(privacy.outfitHistoryEnabled ?? true);
      setMarketingNotifications(privacy.marketingNotifications ?? false);
      setStatus("idle");
      return;
    }
    setStatus(result.error.code === "INTERNAL_ERROR" ? "unavailable" : "error");
  }, []);

  useEffect(() => {
    if (session.status === "authenticated") void loadPreferences();
  }, [loadPreferences, session.status]);

  useEffect(() => {
    const saved = locationFromSaved(session.user?.weatherLocationName);
    setSelectedCountry(saved.country);
    setSelectedCity(saved.city);
    setCustomLocation(saved.custom);
  }, [session.user?.weatherLocationName]);

  const selectedCountryOption = useMemo(
    () => dressingLocationOptions.find((option) => option.country === selectedCountry),
    [selectedCountry]
  );
  const cityOptions = selectedCountryOption?.cities || [];
  const usesCustomLocation = selectedCountry === otherLocation || selectedCity === otherLocation;

  function chooseCountry(value: string) {
    setSelectedCountry(value);
    setSelectedCity("");
    if (value !== otherLocation) setCustomLocation("");
  }

  function weatherLocationName() {
    if (usesCustomLocation) return cleanText(customLocation);
    if (selectedCountry && selectedCity) return formatLocation(selectedCity, selectedCountry);
    return "";
  }

  async function handleSave() {
    setStatus("loading");
    const [preferencesResult, userResult] = await Promise.all([
      updatePreferences({
        formality,
        styleIdentity: splitTags(styleIdentity),
        colorPreferences: splitTags(colorPreferences),
        avoidColors: splitTags(avoidColors),
        comfortPriority,
        repeatSensitivity,
        weatherEnabled,
        personalizedRecommendations,
        outfitHistoryEnabled,
        marketingNotifications
      }),
      updateCurrentUser({
        weatherLocationName: weatherLocationName(),
        weatherLatitude: null,
        weatherLongitude: null
      })
    ]);

    if (preferencesResult.ok && userResult.ok) {
      await session.refresh();
      setStatus("saved");
      return;
    }

    setStatus(
      (!preferencesResult.ok && preferencesResult.error.code === "INTERNAL_ERROR") ||
        (!userResult.ok && userResult.error.code === "INTERNAL_ERROR")
        ? "unavailable"
        : "error"
    );
  }

  if (session.status === "loading" || status === "loading") return <LoadingCard title="Loading preferences" />;
  if (session.status === "logged-out") return <AuthRequiredState />;
  if (session.status === "backend-unavailable" || status === "unavailable") return <BackendUnavailableState onRetry={session.status === "backend-unavailable" ? session.refresh : loadPreferences} />;

  return (
    <>
      {status === "saved" ? <Card className="mb-5 border-success/20 bg-success/10 p-4"><p className="text-sm font-semibold text-ink">Preferences saved</p></Card> : null}
      <div className="space-y-5">
        <Card className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-terracotta">Style</p>
          <label className="block text-xs font-semibold text-ink">Style identity<input className={inputClass} value={styleIdentity} onChange={(event) => setStyleIdentity(event.target.value)} /></label>
          <label className="block text-xs font-semibold text-ink">Formality<select className={inputClass} value={formality} onChange={(event) => setFormality(event.target.value)}><option value="relaxed">Relaxed</option><option value="balanced">Balanced</option><option value="polished">Polished</option><option value="formal">Formal</option></select></label>
          <div className="flex flex-wrap gap-2">{["relaxed", "balanced", "polished", "formal"].map((item) => <button key={item} type="button" onClick={() => setFormality(item)}><Chip active={formality === item}>{item}</Chip></button>)}</div>
        </Card>
        <Card className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-terracotta">Color and comfort</p>
          <label className="block text-xs font-semibold text-ink">Preferred colors<input className={inputClass} value={colorPreferences} onChange={(event) => setColorPreferences(event.target.value)} /></label>
          <label className="block text-xs font-semibold text-ink">Colors to use less often<input className={inputClass} value={avoidColors} onChange={(event) => setAvoidColors(event.target.value)} /></label>
          <label className="block text-xs font-semibold text-ink">Comfort priority<select className={inputClass} value={comfortPriority} onChange={(event) => setComfortPriority(event.target.value)}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label>
        </Card>
        <Card className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-terracotta">Weather city</p>
          <p className="text-xs leading-5 text-muted">Add a usual dressing city when you want MyFitPick to make weather-aware suggestions. City and country are enough.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-semibold text-ink">Country<select className={inputClass} value={selectedCountry} onChange={(event) => chooseCountry(event.target.value)}><option value="">Choose country</option>{dressingLocationOptions.map((option) => <option key={option.country} value={option.country}>{option.country}</option>)}<option value={otherLocation}>Other country</option></select></label>
            <label className="block text-xs font-semibold text-ink">City<select className={inputClass} value={selectedCity} onChange={(event) => setSelectedCity(event.target.value)} disabled={!selectedCountry}><option value="">{selectedCountry ? "Choose city" : "Choose country first"}</option>{cityOptions.map((city) => <option key={city} value={city}>{city}</option>)}{selectedCountry ? <option value={otherLocation}>Other city</option> : null}</select></label>
          </div>
          {usesCustomLocation ? <label className="block text-xs font-semibold text-ink">City and country<input className={inputClass} value={customLocation} onChange={(event) => setCustomLocation(event.target.value)} placeholder="City, country" /></label> : null}
        </Card>
        <Card className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-terracotta">Outfit ideas</p>
          <label className="block text-xs font-semibold text-ink">Repeat sensitivity<select className={inputClass} value={repeatSensitivity} onChange={(event) => setRepeatSensitivity(event.target.value)}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label>
          {[
            ["Weather tips", weatherEnabled, setWeatherEnabled],
            ["Use my preferences", personalizedRecommendations, setPersonalizedRecommendations],
            ["Outfit history", outfitHistoryEnabled, setOutfitHistoryEnabled],
            ["Product updates", marketingNotifications, setMarketingNotifications]
          ].map(([label, value, setter]) => (
            <button key={label as string} type="button" onClick={() => (setter as (next: boolean) => void)(!(value as boolean))} className="focus-ring flex min-h-12 w-full items-center justify-between rounded-2xl border border-line bg-canvas/60 px-3 text-sm font-semibold text-ink">
              <span>{label as string}</span><Chip active={value as boolean}>{value ? "On" : "Off"}</Chip>
            </button>
          ))}
        </Card>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3">
        <Link href="/profile"><Button variant="secondary" className="w-full">Back</Button></Link>
        <Button onClick={() => void handleSave()}>Save preferences</Button>
      </div>
    </>
  );
}
