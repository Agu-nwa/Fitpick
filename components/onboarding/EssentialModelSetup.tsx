"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, MapPin, Palette, Sparkles } from "lucide-react";
import { AuthEntryForm } from "@/components/auth/AuthEntryForm";
import { LoadingCard } from "@/components/integration/LoadingCard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { FieldGroup } from "@/components/ui/FieldGroup";
import { useRevealContent } from "@/hooks/use-reveal-content";
import { useSession } from "@/hooks/use-session";
import { updateCurrentUser, updatePreferences } from "@/lib/api-client";

const inputClass =
  "focus-ring min-h-11 w-full rounded-2xl border border-line bg-canvas/80 px-3 py-2 text-sm text-ink outline-none placeholder:text-muted";

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

const styleChips = ["clean", "polished", "relaxed", "minimal", "classic", "smart casual"];
const colorChips = ["black", "white", "navy", "grey", "earth tones", "green"];
const occasionChips = ["work", "weekend", "date night", "church", "wedding", "travel"];

function splitTags(value: string) {
  return value
    .split(",")
    .map((item) => cleanLocationPart(item).toLowerCase())
    .filter(Boolean)
    .slice(0, 12);
}

function cleanLocationPart(value: string) {
  return value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim();
}

function formatLocation(city: string, country: string) {
  const cleanCity = cleanLocationPart(city);
  const cleanCountry = cleanLocationPart(country);
  return [cleanCity, cleanCountry].filter(Boolean).join(", ");
}

function locationFromSaved(value: string) {
  const cleaned = cleanLocationPart(value);
  if (!cleaned) return { country: "", city: "", custom: "" };

  const [cityPart, ...countryParts] = cleaned.split(",").map((part) => part.trim()).filter(Boolean);
  const countryPart = countryParts.join(", ");
  const countryOption = dressingLocationOptions.find((option) => option.country.toLowerCase() === countryPart.toLowerCase());
  const cityOption = countryOption?.cities.find((city) => city.toLowerCase() === cityPart.toLowerCase());

  if (countryOption && cityOption) return { country: countryOption.country, city: cityOption, custom: "" };
  return { country: otherLocation, city: otherLocation, custom: cleaned };
}

function addChip(current: string, value: string) {
  const tags = splitTags(current);
  if (tags.includes(value)) return tags.join(", ");
  return [...tags, value].slice(0, 12).join(", ");
}

export function EssentialModelSetup() {
  const router = useRouter();
  const session = useSession();
  const [name, setName] = useState("");
  const [styleIdentity, setStyleIdentity] = useState("clean, polished");
  const [colorPreferences, setColorPreferences] = useState("black, white, navy");
  const [avoidColors, setAvoidColors] = useState("");
  const [comfortPriority, setComfortPriority] = useState<"low" | "medium" | "high">("medium");
  const [formality, setFormality] = useState("balanced");
  const [repeatSensitivity, setRepeatSensitivity] = useState("medium");
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [customLocation, setCustomLocation] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const customLocationRef = useRef<HTMLDivElement>(null);
  const revealContent = useRevealContent();

  useEffect(() => {
    if (session.user?.name) setName(session.user.name);
    if (session.user?.weatherLocationName) {
      const saved = locationFromSaved(session.user.weatherLocationName);
      setSelectedCountry(saved.country);
      setSelectedCity(saved.city);
      setCustomLocation(saved.custom);
    }
  }, [session.user]);

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
    if (value === otherLocation) revealContent(customLocationRef, { delayMs: 90, topOffset: 24, bottomOffset: 136 });
  }

  function chooseCity(value: string) {
    setSelectedCity(value);
    if (value === otherLocation) revealContent(customLocationRef, { delayMs: 90, topOffset: 24, bottomOffset: 136 });
  }

  function currentLocationName() {
    if (usesCustomLocation) return cleanLocationPart(customLocation);
    if (selectedCountry && selectedCity) return formatLocation(selectedCity, selectedCountry);
    return "";
  }

  async function saveSetup(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    const locationName = currentLocationName();
    const [preferencesResult, userResult] = await Promise.all([
      updatePreferences({
        styleIdentity: splitTags(styleIdentity),
        colorPreferences: splitTags(colorPreferences),
        avoidColors: splitTags(avoidColors).slice(0, 20),
        comfortPriority,
        formality,
        repeatSensitivity,
        weatherEnabled: Boolean(locationName)
      }),
      updateCurrentUser({
        name: cleanLocationPart(name),
        weatherLocationName: locationName,
        weatherLatitude: null,
        weatherLongitude: null,
        modelSetupCompleted: true
      })
    ]);

    setSaving(false);

    if (!preferencesResult.ok || !userResult.ok) {
      setError("We could not save your style start. Check the fields and try again.");
      return;
    }

    setMessage("Style start saved.");
    await session.refresh();
    router.push("/home");
    router.refresh();
  }

  if (session.status === "loading") return <LoadingCard title="Preparing setup" />;

  if (session.status === "logged-out") {
    return (
      <Card className="space-y-4">
        <div>
          <p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-cocoa">
            <Sparkles size={14} aria-hidden="true" />
            Create account
          </p>
          <h2 className="font-editorial mt-2 text-3xl font-semibold leading-none text-ink">Start with your account.</h2>
          <p className="mt-2 text-sm leading-6 text-muted">After email verification, MyFitPick will ask only for the style basics needed to start.</p>
        </div>
        <AuthEntryForm compact initialMode="signup" />
      </Card>
    );
  }

  return (
    <Card className="space-y-5">
      <div>
        <p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-cocoa">
          <Palette size={14} aria-hidden="true" />
          Style start
        </p>
        <h2 className="font-editorial mt-2 text-3xl font-semibold leading-none text-ink">Teach MyFitPick the essentials.</h2>
        <p className="mt-2 text-sm leading-6 text-muted">Start with a few preferences. Model photos, measurements, and weather permissions appear later when they improve a specific feature.</p>
      </div>

      {message ? <p className="rounded-2xl border border-success/25 bg-success/10 px-3 py-2 text-xs font-semibold text-ink">{message}</p> : null}
      {error ? <p className="rounded-2xl border border-danger/25 bg-danger/10 px-3 py-2 text-xs font-semibold text-ink">{error}</p> : null}

      <form className="space-y-4" onSubmit={saveSetup}>
        <FieldGroup label="Display name" htmlFor="setup-name" required>
          <input id="setup-name" className={inputClass} required minLength={2} maxLength={80} value={name} onChange={(event) => setName(event.target.value)} />
        </FieldGroup>

        <FieldGroup label="Style words" htmlFor="setup-style" help="Use a few words separated by commas.">
          <input id="setup-style" className={inputClass} value={styleIdentity} onChange={(event) => setStyleIdentity(event.target.value)} placeholder="clean, polished, relaxed" />
        </FieldGroup>
        <div className="flex flex-wrap gap-2">
          {styleChips.map((chip) => (
            <button key={chip} type="button" onClick={() => setStyleIdentity((current) => addChip(current, chip))}>
              <Chip active={splitTags(styleIdentity).includes(chip)}>{chip}</Chip>
            </button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <FieldGroup label="Favorite colors" htmlFor="setup-colors">
            <input id="setup-colors" className={inputClass} value={colorPreferences} onChange={(event) => setColorPreferences(event.target.value)} placeholder="black, white, navy" />
          </FieldGroup>
          <FieldGroup label="Use less often" htmlFor="setup-avoid-colors">
            <input id="setup-avoid-colors" className={inputClass} value={avoidColors} onChange={(event) => setAvoidColors(event.target.value)} placeholder="yellow, orange" />
          </FieldGroup>
        </div>
        <div className="flex flex-wrap gap-2">
          {colorChips.map((chip) => (
            <button key={chip} type="button" onClick={() => setColorPreferences((current) => addChip(current, chip))}>
              <Chip active={splitTags(colorPreferences).includes(chip)}>{chip}</Chip>
            </button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <FieldGroup label="Comfort" htmlFor="setup-comfort">
            <select id="setup-comfort" className={inputClass} value={comfortPriority} onChange={(event) => setComfortPriority(event.target.value as "low" | "medium" | "high")}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </FieldGroup>
          <FieldGroup label="Formality" htmlFor="setup-formality">
            <select id="setup-formality" className={inputClass} value={formality} onChange={(event) => setFormality(event.target.value)}>
              <option value="relaxed">Relaxed</option>
              <option value="balanced">Balanced</option>
              <option value="polished">Polished</option>
              <option value="formal">Formal</option>
            </select>
          </FieldGroup>
          <FieldGroup label="Repeat sensitivity" htmlFor="setup-repeat">
            <select id="setup-repeat" className={inputClass} value={repeatSensitivity} onChange={(event) => setRepeatSensitivity(event.target.value)}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </FieldGroup>
        </div>

        <section className="rounded-2xl border border-line bg-canvas/60 p-3">
          <div className="mb-3">
            <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-cocoa">
              <MapPin size={14} aria-hidden="true" />
              Usual dressing city
            </p>
            <p className="mt-1 text-xs leading-5 text-muted">Optional. A city helps MyFitPick make weather-aware suggestions when you ask for them.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <FieldGroup label="Country" htmlFor="setup-country">
              <select id="setup-country" className={inputClass} value={selectedCountry} onChange={(event) => chooseCountry(event.target.value)}>
                <option value="">Choose country</option>
                {dressingLocationOptions.map((option) => (
                  <option key={option.country} value={option.country}>{option.country}</option>
                ))}
                <option value={otherLocation}>Other country</option>
              </select>
            </FieldGroup>
            <FieldGroup label="City" htmlFor="setup-city">
              <select id="setup-city" className={inputClass} value={selectedCity} onChange={(event) => chooseCity(event.target.value)} disabled={!selectedCountry}>
                <option value="">{selectedCountry ? "Choose city" : "Choose country first"}</option>
                {cityOptions.map((city) => (
                  <option key={city} value={city}>{city}</option>
                ))}
                {selectedCountry ? <option value={otherLocation}>Other city</option> : null}
              </select>
            </FieldGroup>
          </div>
          {usesCustomLocation ? (
            <div ref={customLocationRef}>
              <FieldGroup label="City and country" htmlFor="setup-custom-location" help="Use this only if your city is not listed." className="mt-3">
                <input id="setup-custom-location" className={inputClass} value={customLocation} onChange={(event) => setCustomLocation(event.target.value)} placeholder="City, country" />
              </FieldGroup>
            </div>
          ) : null}
        </section>

        <section className="rounded-2xl border border-olive/20 bg-olive/10 p-3">
          <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-cocoa">
            <CheckCircle2 size={14} aria-hidden="true" />
            Later, when useful
          </p>
          <p className="mt-1 text-xs leading-5 text-muted">Virtual Try-On will ask for a full-body photo inside Profile. Outfit recommendations work from your closet without that step.</p>
        </section>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted">Common moments</p>
          <div className="flex flex-wrap gap-2">
            {occasionChips.map((chip) => <Chip key={chip}>{chip}</Chip>)}
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={saving}>
          {saving ? "Saving..." : "Enter MyFitPick"}
        </Button>
      </form>
    </Card>
  );
}
