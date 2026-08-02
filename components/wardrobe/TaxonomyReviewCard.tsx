"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { updateWardrobeItem } from "@/lib/api-client";
import { getCanonicalSubtypeOptions } from "@/lib/wardrobe/canonical-taxonomy";
import { buildUserTaxonomyConfirmation, detectTaxonomyConflicts, taxonomyConfidenceLabel } from "@/lib/wardrobe/taxonomy-review";
import type { WardrobeItem } from "@/types/wardrobe";

function question(item: WardrobeItem) {
  if (item.category === "accessories") return "What kind of accessory is this?";
  if (item.category === "bags") return "How is this item normally carried?";
  if (item.category === "shoes") return "What kind of footwear is this?";
  if (item.structureRole === "set" || /set|suit/i.test(item.subcategory || "")) return "What pieces are included?";
  return "What type of item is this?";
}

export function TaxonomyReviewCard({ item, onSaved }: { item: WardrobeItem; onSaved: (item: WardrobeItem) => void }) {
  const [choice, setChoice] = useState(item.canonicalSubtype || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const conflict = detectTaxonomyConflicts(item);
  const choices = useMemo(() => getCanonicalSubtypeOptions(item.category).filter((entry) => !entry.needsReview).slice(0, 16), [item.category]);

  async function save() {
    setSaving(true);
    setError("");
    const payload = buildUserTaxonomyConfirmation(item, choice || "not_sure");
    const result = await updateWardrobeItem(item.id, payload);
    setSaving(false);
    if (result.ok) onSaved(result.data.item);
    else setError("This item could not be updated right now. Please try again.");
  }

  return (
    <Card className="border-amber-200 bg-amber-50/70 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-cocoa">Needs review</p>
      <h3 className="mt-2 text-lg font-semibold text-ink">{question(item)}</h3>
      <p className="mt-1 text-sm text-muted">Current suggestion: {item.canonicalSubtype ? choices.find((entry) => entry.value === item.canonicalSubtype)?.label || "Not sure" : "Not sure"} · {taxonomyConfidenceLabel(item)}</p>
      {conflict.status === "conflicting" ? <p className="mt-2 text-sm text-rose-700">Some saved details disagree. Choose the item type you recognize.</p> : null}
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {choices.map((entry) => <button key={entry.value} type="button" onClick={() => setChoice(entry.value)} className={`min-h-11 rounded-xl border px-3 text-sm font-semibold ${choice === entry.value ? "border-olive bg-olive text-white" : "border-line bg-white text-ink"}`}>{entry.label}</button>)}
        <button type="button" onClick={() => setChoice("not_sure")} className={`min-h-11 rounded-xl border px-3 text-sm font-semibold ${choice === "not_sure" ? "border-olive bg-olive text-white" : "border-line bg-white text-ink"}`}>Not sure</button>
      </div>
      {error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}
      <Button className="mt-4 w-full" disabled={saving || !choice} onClick={() => void save()}>{saving ? "Saving…" : "Save and continue"}</Button>
    </Card>
  );
}
