"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FieldGroup } from "@/components/ui/FieldGroup";
import { LoadingState } from "@/components/ui/LoadingState";
import { getStyleProfile, updateStyleProfile, type StyleProfileData } from "@/lib/api-client";

const inputClass =
  "focus-ring min-h-11 w-full rounded-2xl border border-line bg-white px-3 py-2 text-sm text-ink outline-none placeholder:text-muted";

function splitList(value: string) {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .slice(0, 20);
}

function joinList(values?: string[]) {
  return (values || []).join(", ");
}

export function StyleProfileForm() {
  const [profile, setProfile] = useState<StyleProfileData["profile"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [favoriteColors, setFavoriteColors] = useState("");
  const [dislikedColors, setDislikedColors] = useState("");
  const [preferredFits, setPreferredFits] = useState("");
  const [preferredOccasions, setPreferredOccasions] = useState("");
  const [culturalStylePreferences, setCulturalStylePreferences] = useState("");
  const [notes, setNotes] = useState("");
  const [fashionRiskLevel, setFashionRiskLevel] = useState<"conservative" | "balanced" | "expressive">("balanced");
  const [comfortPriority, setComfortPriority] = useState<"low" | "medium" | "high">("medium");
  const [luxuryPreference, setLuxuryPreference] = useState<"low" | "medium" | "high">("medium");

  useEffect(() => {
    void (async () => {
      const result = await getStyleProfile();
      setLoading(false);
      if (!result.ok) {
        setError("Unable to load your style preferences.");
        return;
      }

      const next = result.data.profile;
      setProfile(next);
      setFavoriteColors(joinList(next.favoriteColors));
      setDislikedColors(joinList(next.dislikedColors));
      setPreferredFits(joinList(next.preferredFits));
      setPreferredOccasions(joinList(next.preferredOccasions));
      setCulturalStylePreferences(joinList(next.culturalStylePreferences));
      setNotes(joinList(next.notes));
      setFashionRiskLevel(next.fashionRiskLevel);
      setComfortPriority(next.comfortPriority);
      setLuxuryPreference(next.luxuryPreference);
    })();
  }, []);

  async function saveProfile() {
    setSaving(true);
    setNotice("");
    setError("");
    const result = await updateStyleProfile({
      favoriteColors: splitList(favoriteColors),
      dislikedColors: splitList(dislikedColors),
      preferredFits: splitList(preferredFits),
      preferredOccasions: splitList(preferredOccasions),
      culturalStylePreferences: splitList(culturalStylePreferences),
      notes: splitList(notes),
      fashionRiskLevel,
      comfortPriority,
      luxuryPreference
    });
    setSaving(false);

    if (!result.ok) {
      setError("Unable to save your style preferences.");
      return;
    }

    setProfile(result.data.profile);
    setNotice("Style preferences saved.");
  }

  if (loading) {
    return <LoadingState title="Loading your style preferences" />;
  }

  return (
    <Card className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ink">Teach FitPick how you like to dress</p>
          <p className="mt-1 text-sm leading-6 text-muted">
            These preferences help your AI stylist refine every recommendation. You can change them anytime.
          </p>
        </div>
        <Badge tone="premium">User controlled</Badge>
      </div>

      {error ? <p className="rounded-2xl bg-danger/10 px-3 py-2 text-xs font-semibold text-ink">{error}</p> : null}
      {notice ? <p className="rounded-2xl bg-success/10 px-3 py-2 text-xs font-semibold text-ink">{notice}</p> : null}

      <section className="space-y-3 rounded-2xl border border-line bg-white p-3">
        <div>
          <h3 className="text-sm font-semibold text-ink">Preferences</h3>
          <p className="mt-1 text-xs leading-5 text-muted">Comma-separated values work best.</p>
        </div>
        <FieldGroup label="Favorite colors" htmlFor="favorite-colors">
          <input id="favorite-colors" className={inputClass} value={favoriteColors} onChange={(event) => setFavoriteColors(event.target.value)} placeholder="navy, white, olive" />
        </FieldGroup>
        <FieldGroup label="Disliked colors" htmlFor="disliked-colors">
          <input id="disliked-colors" className={inputClass} value={dislikedColors} onChange={(event) => setDislikedColors(event.target.value)} placeholder="yellow, neon green" />
        </FieldGroup>
        <FieldGroup label="Preferred fits" htmlFor="preferred-fits">
          <input id="preferred-fits" className={inputClass} value={preferredFits} onChange={(event) => setPreferredFits(event.target.value)} placeholder="slim, tailored, relaxed" />
        </FieldGroup>
        <FieldGroup label="Preferred occasions" htmlFor="preferred-occasions">
          <input id="preferred-occasions" className={inputClass} value={preferredOccasions} onChange={(event) => setPreferredOccasions(event.target.value)} placeholder="church, business casual, date night" />
        </FieldGroup>
        <FieldGroup label="Cultural style preferences" htmlFor="cultural-style-preferences" help="Use clothing context only, such as native wear or ankara. FitPick does not need identity attributes.">
          <input id="cultural-style-preferences" className={inputClass} value={culturalStylePreferences} onChange={(event) => setCulturalStylePreferences(event.target.value)} placeholder="native wear, ankara, senator wear" />
        </FieldGroup>
      </section>

      <section className="grid grid-cols-1 gap-3 rounded-2xl border border-line bg-white p-3 sm:grid-cols-3">
        <FieldGroup label="Fashion risk" htmlFor="fashion-risk">
          <select id="fashion-risk" className={inputClass} value={fashionRiskLevel} onChange={(event) => setFashionRiskLevel(event.target.value as any)}>
            <option value="conservative">Conservative</option>
            <option value="balanced">Balanced</option>
            <option value="expressive">Expressive</option>
          </select>
        </FieldGroup>
        <FieldGroup label="Comfort priority" htmlFor="comfort-priority">
          <select id="comfort-priority" className={inputClass} value={comfortPriority} onChange={(event) => setComfortPriority(event.target.value as any)}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </FieldGroup>
        <FieldGroup label="Luxury preference" htmlFor="luxury-preference">
          <select id="luxury-preference" className={inputClass} value={luxuryPreference} onChange={(event) => setLuxuryPreference(event.target.value as any)}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </FieldGroup>
      </section>

      <FieldGroup label="Notes" htmlFor="style-notes" help="Keep this to visible style preferences and clothing comfort.">
        <textarea id="style-notes" className={`${inputClass} min-h-24`} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="I like clean lines, breathable fabrics, and polished shoes." />
      </FieldGroup>

      {profile?.inferredFrom?.length ? (
        <p className="text-xs leading-5 text-muted">Inferred gently from: {profile.inferredFrom.join(", ")}. You stay in control of what FitPick remembers.</p>
      ) : null}

      <Button type="button" className="w-full" onClick={() => void saveProfile()} disabled={saving}>
        {saving ? "Saving..." : "Save style preferences"}
      </Button>
    </Card>
  );
}
