"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronLeft, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { TaxonomyReviewCard } from "@/components/wardrobe/TaxonomyReviewCard";
import { getTaxonomyReviewPriority, sortTaxonomyReviewQueue, taxonomyReviewReasonLabel } from "@/lib/wardrobe/taxonomy-review-queue";
import type { WardrobeItem } from "@/types/wardrobe";

export function TaxonomyReviewQueue({ initialItems }: { initialItems: WardrobeItem[] }) {
  const [items, setItems] = useState(() => sortTaxonomyReviewQueue(initialItems));
  const [index, setIndex] = useState(0);
  const [history, setHistory] = useState<number[]>([]);
  const [skipped, setSkipped] = useState(0);
  const [confirmed, setConfirmed] = useState(0);
  const current = items[index];
  const review = useMemo(() => current ? getTaxonomyReviewPriority(current) : null, [current]);
  function advance() { if (index < items.length - 1) { setHistory((value) => [...value, index]); setIndex(index + 1); } else setIndex(items.length); }
  function resolved(saved: WardrobeItem) { setConfirmed((value) => value + (saved.taxonomyStatus === "confirmed" ? 1 : 0)); setItems((value) => value.filter((entry) => entry.id !== saved.id)); setHistory([]); setIndex((value) => Math.min(value, Math.max(items.length - 1, 0))); }
  function skip() { setSkipped((value) => value + 1); advance(); }
  if (!current) return <Card className="p-7 text-center"><h1 className="font-editorial text-4xl font-semibold text-ink">Your closet is up to date</h1><p className="mt-3 text-sm leading-6 text-muted">Core item types reviewed here help MyFitPick make more complete outfit recommendations. Optional styling details may still be available on individual items.</p>{confirmed || skipped ? <p className="mt-3 text-sm font-semibold text-ink">{confirmed} confirmed · {skipped} skipped</p> : null}<Link href="/wardrobe" className="mt-5 inline-flex min-h-11 items-center text-sm font-semibold text-olive"><ArrowLeft size={16} className="mr-2" />Back to closet</Link></Card>;
  return <div className="mx-auto max-w-2xl"><div className="mb-4 flex items-center justify-between gap-3 text-sm"><Link href="/wardrobe" className="inline-flex items-center font-semibold text-muted"><ArrowLeft size={16} className="mr-2" />Closet</Link><span className="font-bold text-ink">Reviewing {Math.min(index + 1, items.length)} of {items.length}</span></div><div className="h-2 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-olive transition-all" style={{ width: `${Math.max(5, ((index + 1) / items.length) * 100)}%` }} /></div><Card className="mt-5 overflow-hidden p-4 sm:p-5">{current.imageUrl ? <div className="mx-auto aspect-[4/5] max-h-80 overflow-hidden rounded-2xl bg-canvas"><img src={current.thumbnailUrl || current.imageUrl} alt="Wardrobe item being reviewed" className="h-full w-full object-contain" /></div> : null}<p className="mt-4 text-xs font-bold uppercase tracking-[0.14em] text-muted">{current.category.replace(/_/g, " ")}</p><h1 className="mt-1 text-2xl font-semibold text-ink">{current.name}</h1>{current.subcategory ? <p className="mt-1 text-sm text-muted">Currently saved as {current.subcategory}</p> : null}{review ? <p className="mt-3 rounded-xl bg-cocoa/10 px-3 py-2 text-sm font-semibold text-cocoa">{taxonomyReviewReasonLabel[review.reasons[0]]}</p> : null}</Card><div className="mt-4"><TaxonomyReviewCard item={current} onSaved={resolved} /></div><div className="mt-3 grid grid-cols-2 gap-3"><Button variant="secondary" disabled={!history.length} onClick={() => { const previous = history[history.length - 1]; setHistory((value) => value.slice(0, -1)); setIndex(previous); }}><ChevronLeft size={16} />Previous</Button><Button variant="secondary" onClick={skip}>Skip<SkipForward size={16} /></Button></div></div>;
}
