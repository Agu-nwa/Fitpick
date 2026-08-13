"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronLeft, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ImageFrame } from "@/components/ui/ImageFrame";
import { TaxonomyReviewCard } from "@/components/wardrobe/TaxonomyReviewCard";
import { getTaxonomyReviewPriority, isTaxonomyReviewable, sortTaxonomyReviewQueue, taxonomyReviewReasonLabel } from "@/lib/wardrobe/taxonomy-review-queue";
import { logTaxonomyMetric } from "@/lib/wardrobe/taxonomy-observability";
import type { WardrobeItem } from "@/types/wardrobe";

export function TaxonomyReviewQueue({ initialItems }: { initialItems: WardrobeItem[] }) {
  const [items, setItems] = useState(() => sortTaxonomyReviewQueue(initialItems));
  const [index, setIndex] = useState(0);
  const [history, setHistory] = useState<number[]>([]);
  const [skipped, setSkipped] = useState(0);
  const [confirmed, setConfirmed] = useState(0);
  const [unresolved, setUnresolved] = useState(0);
  const current = items[index];
  const review = useMemo(() => current ? getTaxonomyReviewPriority(current) : null, [current]);
  useEffect(() => { if (current && review) logTaxonomyMetric("wardrobe.review_queue.item_viewed", { category: current.category, reason: review.reasons[0], positionBand: index < 5 ? "first_5" : index < 15 ? "six_to_15" : "later" }); }, [current, index, review]);
  useEffect(() => { if (!current && (confirmed || skipped || unresolved)) logTaxonomyMetric("wardrobe.review_queue.completed", { confirmed, skipped, unresolved }); }, [confirmed, current, skipped, unresolved]);
  function advance() { if (index < items.length - 1) { setHistory((value) => [...value, index]); setIndex(index + 1); } else setIndex(items.length); }
  function resolved(saved: WardrobeItem) { const stillReviewable = isTaxonomyReviewable(saved); setConfirmed((value) => value + (!stillReviewable ? 1 : 0)); setUnresolved((value) => value + (stillReviewable ? 1 : 0)); logTaxonomyMetric(stillReviewable ? "wardrobe.review_queue.not_sure" : "wardrobe.review_queue.item_confirmed", { category: saved.category, canonicalSubtype: saved.canonicalSubtype || "unknown", outcome: stillReviewable ? "unresolved" : "confirmed" }); setItems((value) => value.filter((entry) => entry.id !== saved.id)); setHistory([]); setIndex((value) => Math.min(value, Math.max(items.length - 1, 0))); }
  function skip() { setSkipped((value) => value + 1); logTaxonomyMetric("wardrobe.review_queue.item_skipped", { category: current.category, reason: review?.reasons[0] || "optional_metadata", positionBand: index < 5 ? "first_5" : index < 15 ? "six_to_15" : "later" }); advance(); }
  if (!current) { return <Card className="p-7 text-center"><h1 className="font-editorial text-4xl font-semibold text-ink">{unresolved || skipped ? "Review session complete" : "Your closet is up to date"}</h1><p className="mt-3 text-sm leading-6 text-muted">Core item types reviewed here help MyFitPick make more complete outfit recommendations. Optional styling details may still be available on individual items.</p>{confirmed || skipped || unresolved ? <p className="mt-3 text-sm font-semibold text-ink">{confirmed} confirmed · {skipped} skipped · {unresolved} still unresolved</p> : null}<Link href="/wardrobe" className="mt-5 inline-flex min-h-11 items-center text-sm font-semibold text-olive"><ArrowLeft size={16} className="mr-2" />Back to closet</Link></Card>; }
  return <div className="mx-auto max-w-2xl"><div className="mb-4 flex items-center justify-between gap-3 text-sm"><Link href="/wardrobe" className="inline-flex items-center font-semibold text-muted"><ArrowLeft size={16} className="mr-2" />Closet</Link><span className="font-bold text-ink">Reviewing {Math.min(index + 1, items.length)} of {items.length}</span></div><div className="h-2 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-olive transition-all" style={{ width: `${Math.max(5, ((index + 1) / items.length) * 100)}%` }} /></div><Card className="mt-5 overflow-hidden p-4 sm:p-5">{current.imageUrl ? <ImageFrame src={current.thumbnailUrl || current.imageUrl} fallbackSrc={current.thumbnailUrl ? current.imageUrl : undefined} alt="Wardrobe item being reviewed" aspect="portrait" fit="contain" showRetry context="wardrobe.taxonomy_review" className="mx-auto max-h-80 max-w-sm border-0 bg-canvas" /> : null}<p className="mt-4 text-xs font-bold uppercase tracking-[0.14em] text-muted">{current.category.replace(/_/g, " ")}</p><h1 className="mt-1 text-2xl font-semibold text-ink">{current.name}</h1>{current.subcategory ? <p className="mt-1 text-sm text-muted">Currently saved as {current.subcategory}</p> : null}{review ? <p className="mt-3 rounded-xl bg-cocoa/10 px-3 py-2 text-sm font-semibold text-cocoa">{taxonomyReviewReasonLabel[review.reasons[0]]}</p> : null}</Card><div className="mt-4"><TaxonomyReviewCard item={current} queueMode onSaved={resolved} /></div><div className="mt-3 grid grid-cols-2 gap-3"><Button variant="secondary" disabled={!history.length} onClick={() => { const previous = history[history.length - 1]; setHistory((value) => value.slice(0, -1)); setIndex(previous); }}><ChevronLeft size={16} />Previous</Button><Button variant="secondary" onClick={skip}>Skip<SkipForward size={16} /></Button></div></div>;
}
