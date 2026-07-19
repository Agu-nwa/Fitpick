"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, CalendarCheck, Edit3, Heart, Save, Shirt, Trash2 } from "lucide-react";
import { AuthRequiredState } from "@/components/integration/AuthRequiredState";
import { BackendUnavailableState } from "@/components/integration/BackendUnavailableState";
import { LoadingCard } from "@/components/integration/LoadingCard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { FieldGroup } from "@/components/ui/FieldGroup";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { useSession } from "@/hooks/use-session";
import {
  createManualLook,
  deleteLook,
  getLooks,
  getWardrobe,
  updateLook,
  type LooksData,
  type SavedLookSummary
} from "@/lib/api-client";
import type { WardrobeItem } from "@/types/wardrobe";

const tabs = ["Saved", "Worn", "Favorites"] as const;
const inputClass = "focus-ring min-h-11 w-full rounded-2xl border border-line bg-canvas/70 px-3 py-2 text-sm text-ink outline-none shadow-inner placeholder:text-muted";

function itemLabel(item?: WardrobeItem) {
  if (!item) return "Closet item";
  return [item.name, item.color ? `(${item.color})` : ""].filter(Boolean).join(" ");
}

function LookCard({
  look,
  itemMap,
  onEdit,
  onFavorite,
  onDelete
}: {
  look: SavedLookSummary;
  itemMap: Map<string, WardrobeItem>;
  onEdit: (look: SavedLookSummary) => void;
  onFavorite: (look: SavedLookSummary) => void;
  onDelete: (look: SavedLookSummary) => void;
}) {
  const itemNames = look.itemIds.map((id) => itemLabel(itemMap.get(id))).slice(0, 6);
  const isManual = look.source === "manual";
  const card = (
    <Card className="min-h-44 overflow-hidden border-olive/20 bg-gradient-to-br from-surface via-surface to-olive/10 p-5">
      <div className="flex h-full flex-col">
        <div className="flex items-start justify-between gap-4">
          <span className="flex size-10 items-center justify-center rounded-full bg-cocoa text-canvas">
            {look.favorite ? <Heart size={18} aria-hidden="true" /> : <Shirt size={18} aria-hidden="true" />}
          </span>
          <span className="rounded-full border border-line bg-canvas/60 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
            {look.favorite ? "Favourite" : isManual ? "Manual" : "Saved"}
          </span>
        </div>
        <div className="mt-auto pt-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-cocoa">{look.occasion || "Look"}</p>
          <h3 className="font-editorial mt-2 text-3xl font-semibold leading-none text-ink">{look.title}</h3>
          <p className="mt-3 text-sm leading-6 text-muted">{itemNames.length ? itemNames.join(", ") : "No items listed."}</p>
          {look.outfitId && !isManual ? (
            <span className="mt-5 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-muted transition group-hover:text-cocoa">
              View full look
              <ArrowUpRight size={15} className="transition group-hover:-translate-y-1 group-hover:translate-x-1" aria-hidden="true" />
            </span>
          ) : null}
        </div>
      </div>
    </Card>
  );

  return (
    <article className="space-y-2">
      {look.outfitId && !isManual ? (
        <Link href={`/outfit/${look.outfitId}/preview`} className="focus-ring group block rounded-xl3">
          {card}
        </Link>
      ) : card}
      <div className="grid grid-cols-3 gap-2">
        <Button type="button" variant="secondary" className="min-h-10 rounded-2xl px-2 text-[11px]" onClick={() => onEdit(look)}>
          <Edit3 size={14} aria-hidden="true" />
          Edit
        </Button>
        <Button type="button" variant="ghost" className="min-h-10 rounded-2xl px-2 text-[11px]" onClick={() => onFavorite(look)}>
          <Heart size={14} aria-hidden="true" />
          {look.favorite ? "Saved" : "Like"}
        </Button>
        <Button type="button" variant="ghost" className="min-h-10 rounded-2xl px-2 text-[11px]" onClick={() => onDelete(look)}>
          <Trash2 size={14} aria-hidden="true" />
          Delete
        </Button>
      </div>
    </article>
  );
}

function BackendLooks({
  data,
  tab,
  itemMap,
  onEdit,
  onFavorite,
  onDelete
}: {
  data: LooksData;
  tab: (typeof tabs)[number];
  itemMap: Map<string, WardrobeItem>;
  onEdit: (look: SavedLookSummary) => void;
  onFavorite: (look: SavedLookSummary) => void;
  onDelete: (look: SavedLookSummary) => void;
}) {
  const saved = tab === "Favorites" ? data.favorites : data.saved;
  const showSaved = tab === "Saved" || tab === "Favorites";
  const showWorn = tab === "Worn";

  if (showSaved && !saved.length) {
    return (
      <EmptyState
        title="No saved looks yet"
        body="Save outfits you like so you can wear them again later."
        cta="Pick outfit"
        href="/outfit"
      />
    );
  }
  if (showWorn && !data.worn.length) {
    return (
      <EmptyState
        title="No worn looks yet"
        body="Mark an outfit as worn and it will appear here."
        cta="Pick outfit"
        href="/outfit"
      />
    );
  }

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {showSaved ? saved.map((look) => (
        <LookCard key={look.id} look={look} itemMap={itemMap} onEdit={onEdit} onFavorite={onFavorite} onDelete={onDelete} />
      )) : null}
      {showWorn ? data.worn.map((look) => (
        <Link key={look.id} href={`/outfit/${look.outfitId}/preview`} className="focus-ring group block rounded-xl3">
          <Card className="min-h-44 overflow-hidden p-5">
            <div className="flex h-full flex-col">
              <div className="flex items-start justify-between gap-4">
                <span className="flex size-10 items-center justify-center rounded-full bg-olive/20 text-olive">
                  <CalendarCheck size={18} aria-hidden="true" />
                </span>
                {look.repeatWarning ? <Chip>{look.repeatWarning}</Chip> : <Chip active>Worn</Chip>}
              </div>
              <div className="mt-auto pt-8">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-cocoa">{look.wornAt ? new Date(look.wornAt).toLocaleDateString() : "Worn"}</p>
                <h3 className="font-editorial mt-2 text-3xl font-semibold leading-none text-ink">{look.occasion} outfit</h3>
                <p className="mt-2 text-sm text-muted">{look.rating || "Style memory"}</p>
              </div>
            </div>
          </Card>
        </Link>
      )) : null}
    </div>
  );
}

export function LooksClient() {
  const session = useSession();
  const [tab, setTab] = useState<(typeof tabs)[number]>("Saved");
  const [data, setData] = useState<LooksData | null>(null);
  const [wardrobe, setWardrobe] = useState<WardrobeItem[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "unavailable" | "error">("idle");
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState("");
  const [title, setTitle] = useState("");
  const [occasion, setOccasion] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);

  const itemMap = useMemo(() => new Map(wardrobe.map((item) => [item.id, item])), [wardrobe]);

  const loadLooks = useCallback(async () => {
    setStatus("loading");
    const [looksResult, wardrobeResult] = await Promise.all([getLooks(), getWardrobe()]);
    if (looksResult.ok) setData(looksResult.data);
    if (wardrobeResult.ok) setWardrobe(wardrobeResult.data.items);
    setStatus(looksResult.ok || wardrobeResult.ok ? "idle" : "unavailable");
  }, []);

  useEffect(() => {
    if (session.status === "authenticated") void loadLooks();
  }, [loadLooks, session.status]);

  function resetForm() {
    setEditingId("");
    setTitle("");
    setOccasion("");
    setNotes("");
    setSelectedItemIds([]);
  }

  function toggleItem(itemId: string) {
    setSelectedItemIds((current) => current.includes(itemId) ? current.filter((id) => id !== itemId) : [...current, itemId]);
  }

  function editLook(look: SavedLookSummary) {
    setEditingId(look.id);
    setTitle(look.title || "");
    setOccasion(look.occasion || "");
    setNotes(look.notes || "");
    setSelectedItemIds(look.itemIds);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveManualLook() {
    if (!title.trim() || !selectedItemIds.length) {
      setMessage("Name the look and choose at least one closet item.");
      return;
    }

    setStatus("loading");
    const payload = { title: title.trim(), occasion: occasion.trim(), notes: notes.trim(), itemIds: selectedItemIds };
    const result = editingId ? await updateLook(editingId, payload) : await createManualLook(payload);
    setStatus("idle");

    if (!result.ok) {
      setMessage("We could not save this look right now.");
      return;
    }

    setMessage(editingId ? "Look updated." : "Look saved.");
    resetForm();
    await loadLooks();
  }

  async function toggleFavorite(look: SavedLookSummary) {
    const result = await updateLook(look.id, { favorite: !look.favorite });
    if (!result.ok) {
      setMessage("We could not update this look right now.");
      return;
    }
    await loadLooks();
  }

  async function removeLook(look: SavedLookSummary) {
    const result = await deleteLook(look.id);
    if (!result.ok) {
      setMessage("We could not delete this look right now.");
      return;
    }
    if (editingId === look.id) resetForm();
    setMessage("Look deleted.");
    await loadLooks();
  }

  if (session.status === "loading" || status === "loading") return <LoadingCard title="Loading looks" />;
  if (session.status === "logged-out") return <AuthRequiredState />;
  if (session.status === "backend-unavailable" || status === "unavailable") {
    return <BackendUnavailableState onRetry={session.status === "backend-unavailable" ? session.refresh : loadLooks} />;
  }

  return (
    <>
      {session.status === "authenticated" ? (
        <section id="manual-look-builder" className="mt-7">
          <SectionHeader title="Build a look" eyebrow="Free manual builder" />
          <Card className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FieldGroup label="Look name" htmlFor="look-title" required>
                <input id="look-title" className={inputClass} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Dinner polish" />
              </FieldGroup>
              <FieldGroup label="Occasion" htmlFor="look-occasion">
                <input id="look-occasion" className={inputClass} value={occasion} onChange={(event) => setOccasion(event.target.value)} placeholder="Dinner, work, weekend" />
              </FieldGroup>
            </div>
            <FieldGroup label="Notes" htmlFor="look-notes">
              <textarea id="look-notes" className={`${inputClass} min-h-20`} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional reminder for how to wear it." />
            </FieldGroup>
            <div>
              <p className="mb-2 text-xs font-semibold text-ink">Choose closet items</p>
              {wardrobe.length ? (
                <div className="grid max-h-[360px] gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                  {wardrobe.map((item) => {
                    const active = selectedItemIds.includes(item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={`focus-ring flex min-h-16 items-center gap-3 rounded-2xl border p-2 text-left transition ${active ? "border-cocoa bg-cocoa/10" : "border-line bg-canvas/70 hover:border-cocoa/35"}`}
                        onClick={() => toggleItem(item.id)}
                      >
                        <span className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-olive/10">
                          {item.thumbnailUrl || item.imageUrl ? <img src={item.thumbnailUrl || item.imageUrl} alt="" className="h-full w-full object-cover" /> : null}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-ink">{item.name}</span>
                          <span className="mt-0.5 block truncate text-xs text-muted">{[item.category, item.color].filter(Boolean).join(" • ")}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-line bg-canvas/60 p-4 text-sm text-muted">Add closet items before building a manual look.</div>
              )}
            </div>
            {message ? <p className="rounded-2xl border border-cocoa/20 bg-cocoa/10 px-3 py-2 text-xs font-semibold text-ink">{message}</p> : null}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Button type="button" variant="secondary" onClick={resetForm}>
                Clear
              </Button>
              <Button type="button" onClick={() => void saveManualLook()} disabled={!wardrobe.length}>
                <Save size={16} aria-hidden="true" />
                {editingId ? "Update look" : "Save look"}
              </Button>
            </div>
          </Card>
        </section>
      ) : null}

      <div className="mobile-scrollbar mb-6 mt-6 flex gap-2 overflow-x-auto pb-1">
        {tabs.map((item) => <button key={item} type="button" onClick={() => setTab(item)}><Chip active={tab === item}>{item}{data ? ` ${data.counts[item.toLowerCase() as "saved" | "worn" | "favorites"]}` : ""}</Chip></button>)}
      </div>
      <section>
        <SectionHeader title={tab === "Saved" ? "Saved looks" : tab === "Worn" ? "Style history" : "Favourite looks"} eyebrow="Lookbook" />
        {data && session.status === "authenticated" ? (
          <BackendLooks data={data} tab={tab} itemMap={itemMap} onEdit={editLook} onFavorite={(look) => void toggleFavorite(look)} onDelete={(look) => void removeLook(look)} />
        ) : <EmptyState title="Looks unavailable" body="MyFitPick could not load your saved looks right now." />}
      </section>
    </>
  );
}
