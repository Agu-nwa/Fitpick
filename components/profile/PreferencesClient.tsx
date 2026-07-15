"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AuthRequiredState } from "@/components/integration/AuthRequiredState";
import { BackendUnavailableState } from "@/components/integration/BackendUnavailableState";
import { LoadingCard } from "@/components/integration/LoadingCard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { useSession } from "@/hooks/use-session";
import { getPreferences, updatePreferences } from "@/lib/api-client";

const inputClass = "focus-ring min-h-11 w-full rounded-2xl border border-line bg-canvas/70 px-3 py-2 text-sm text-ink shadow-inner";

function splitTags(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

export function PreferencesClient() {
  const session = useSession();
  const [status, setStatus] = useState<"idle" | "loading" | "unavailable" | "saved" | "error">("idle");
  const [formality, setFormality] = useState("balanced");
  const [styleIdentity, setStyleIdentity] = useState("Simple, polished");
  const [colorPreferences, setColorPreferences] = useState("Neutrals, navy, earth tones");
  const [avoidColors, setAvoidColors] = useState("");
  const [comfortPriority, setComfortPriority] = useState("medium");
  const [nativeWearFrequency, setNativeWearFrequency] = useState("sometimes");
  const [repeatSensitivity, setRepeatSensitivity] = useState("medium");
  const [weatherEnabled, setWeatherEnabled] = useState(true);
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
      setNativeWearFrequency(prefs.nativeWearFrequency || "sometimes");
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

  async function handleSave() {
    setStatus("loading");
    const result = await updatePreferences({
      formality,
      styleIdentity: splitTags(styleIdentity),
      colorPreferences: splitTags(colorPreferences),
      avoidColors: splitTags(avoidColors),
      comfortPriority,
      nativeWearFrequency,
      repeatSensitivity,
      weatherEnabled,
      personalizedRecommendations,
      outfitHistoryEnabled,
      marketingNotifications
    });
    setStatus(result.ok ? "saved" : result.error.code === "INTERNAL_ERROR" ? "unavailable" : "error");
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
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-terracotta">Outfit ideas</p>
          <label className="block text-xs font-semibold text-ink">Native wear frequency<select className={inputClass} value={nativeWearFrequency} onChange={(event) => setNativeWearFrequency(event.target.value)}><option value="rarely">Rarely</option><option value="sometimes">Sometimes</option><option value="often">Often</option><option value="weekly">Weekly</option></select></label>
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
