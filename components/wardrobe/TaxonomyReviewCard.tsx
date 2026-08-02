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

export function TaxonomyReviewCard({ item, onSaved, queueMode = false }: { item: WardrobeItem; onSaved: (item: WardrobeItem) => void; queueMode?: boolean }) {
  const [choice, setChoice] = useState(item.canonicalSubtype || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [detailOne, setDetailOne] = useState("unknown");
  const [detailTwo, setDetailTwo] = useState("unknown");
  const conflict = detectTaxonomyConflicts(item);
  const choices = useMemo(() => getCanonicalSubtypeOptions(item.category).filter((entry) => !entry.needsReview).slice(0, 16), [item.category]);

  async function save() {
    setSaving(true);
    setError("");
    const setComponents = ["suit", "trouser_suit", "three_piece_suit", "tuxedo"].includes(choice) ? ["top_layer", "bottom"] as const : choice === "skirt_suit" ? ["top_layer", "bottom"] as const : ["co_ord_set", "matching_set", "other_set"].includes(choice) ? ["top", "bottom"] as const : [];
    const identity = buildUserTaxonomyConfirmation(item, choice || "not_sure", [...setComponents]);
    const metadata: Record<string, unknown> = {};
    if (["necklace", "pendant", "chain", "earrings", "bracelet", "bangle", "cuff"].includes(choice)) metadata.accessoryScale = detailOne;
    if (choice === "belt") metadata.beltCompatible = detailOne === "yes" ? true : detailOne === "no" ? false : null;
    if (choice === "cufflinks") metadata.cuffType = detailOne === "yes" ? "french_cuff" : detailOne === "no" ? "standard" : "unknown";
    if (item.category === "shoes") metadata.footwearAttributes = { ...(item.footwearAttributes || {}), toeStyle: detailOne, comfortLevel: detailTwo };
    if (item.category === "bags") metadata.visibilityRole = detailOne === "main" ? "primary_carry" : detailOne === "small" ? "small_leather_good" : detailOne === "travel" ? "travel_luggage" : identity.visibilityRole;
    metadata.metadataSources = { ...(item.metadataSources || {}), ...Object.fromEntries(Object.keys(metadata).filter((key) => key !== "metadataSources").map((key) => [key, "user"])) };
    const payload = { ...identity, ...metadata, expectedUpdatedAt: item.updatedAt };
    const result = await updateWardrobeItem(item.id, payload);
    setSaving(false);
    if (result.ok) onSaved(result.data.item);
    else setError(result.error.code === "CONFLICT" ? "This item was updated elsewhere. Refresh before saving your choice." : "This item could not be updated right now. Please try again.");
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
      {["necklace", "pendant", "chain", "earrings", "bracelet", "bangle", "cuff"].includes(choice) ? <label className="mt-4 block text-sm font-semibold text-ink">How noticeable is it?<select className="mt-2 min-h-11 w-full rounded-xl border border-line bg-white px-3" value={detailOne} onChange={(event) => setDetailOne(event.target.value)}><option value="unknown">Not sure</option><option value="delicate">Delicate or small</option><option value="medium">Medium</option><option value="statement">Statement</option></select></label> : null}
      {choice === "belt" ? <label className="mt-4 block text-sm font-semibold text-ink">Does it work with belt loops?<select className="mt-2 min-h-11 w-full rounded-xl border border-line bg-white px-3" value={detailOne} onChange={(event) => setDetailOne(event.target.value)}><option value="unknown">Not sure</option><option value="yes">Yes</option><option value="no">No</option></select></label> : null}
      {choice === "cufflinks" ? <label className="mt-4 block text-sm font-semibold text-ink">Are these for French-cuff shirts?<select className="mt-2 min-h-11 w-full rounded-xl border border-line bg-white px-3" value={detailOne} onChange={(event) => setDetailOne(event.target.value)}><option value="unknown">Not sure</option><option value="yes">Yes</option><option value="no">No</option></select></label> : null}
      {item.category === "bags" ? <label className="mt-4 block text-sm font-semibold text-ink">How is it used?<select className="mt-2 min-h-11 w-full rounded-xl border border-line bg-white px-3" value={detailOne} onChange={(event) => setDetailOne(event.target.value)}><option value="unknown">Not sure</option><option value="main">Main outfit bag</option><option value="small">Small personal item</option><option value="travel">Travel luggage</option></select></label> : null}
      {item.category === "shoes" ? <div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-sm font-semibold text-ink">Toe style<select className="mt-2 min-h-11 w-full rounded-xl border border-line bg-white px-3" value={detailOne} onChange={(event) => setDetailOne(event.target.value)}><option value="unknown">Not sure</option><option value="closed">Closed</option><option value="open">Open</option><option value="peep">Peep toe</option></select></label><label className="text-sm font-semibold text-ink">Comfort<select className="mt-2 min-h-11 w-full rounded-xl border border-line bg-white px-3" value={detailTwo} onChange={(event) => setDetailTwo(event.target.value)}><option value="unknown">Not sure</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></label></div> : null}
      {error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}
      <Button className="mt-4 w-full" disabled={saving || !choice} onClick={() => void save()}>{saving ? "Saving…" : queueMode ? "Save and continue" : "Save item type"}</Button>
    </Card>
  );
}
