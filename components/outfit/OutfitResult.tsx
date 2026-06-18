"use client";

import { useState } from "react";
import Link from "next/link";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { CTABar } from "@/components/ui/CTABar";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Toast } from "@/components/ui/Toast";
import { OutfitCard } from "@/components/cards/OutfitCard";
import { OutfitItemCard } from "@/components/outfit/OutfitItemCard";
import { OutfitApiErrorState } from "@/components/outfit/OutfitIntegrationStates";
import { saveOutfit, submitOutfitFeedback, swapOutfitItem, wearOutfit } from "@/lib/api-client";
import type { OutfitRecommendation } from "@/types/outfit";

const swapDirections = [
  { value: "best-match", label: "Best match" },
  { value: "more-polished", label: "More polished" },
  { value: "more-casual", label: "More casual" },
  { value: "color-change", label: "Color change" },
  { value: "weather-safe", label: "Weather-safe" },
  { value: "native-touch", label: "Native touch" }
];

const feedbackRatings = [
  { label: "Perfect", value: 5 },
  { label: "Good", value: 4 },
  { label: "Okay", value: 3 },
  { label: "Not today", value: 2 },
  { label: "Not my style", value: 1 }
];

const feedbackTags = [
  { label: "Too casual", value: "too-casual" },
  { label: "Too formal", value: "too-formal" },
  { label: "Wrong color", value: "wrong-color" },
  { label: "Weather issue", value: "weather-issue" },
  { label: "Needs native touch", value: "needs-native-touch" }
];

function Notes({ outfit }: { outfit: OutfitRecommendation }) {
  return (
    <Card>
      <p className="text-sm leading-6 text-muted">{outfit.summary}</p>
      <div className="mt-4 space-y-3 text-sm text-muted">
        <p><strong className="text-ink">Weather:</strong> {outfit.weatherFit}</p>
        <p><strong className="text-ink">Color:</strong> {outfit.colorNote}</p>
        <p><strong className="text-ink">Repeat:</strong> {outfit.repeatNote}</p>
        <p><strong className="text-ink">Care:</strong> {outfit.careNote}</p>
      </div>
    </Card>
  );
}

export function OutfitResult({
  outfit,
  canSwap = false,
  onOutfitChange
}: {
  outfit: OutfitRecommendation;
  canSwap?: boolean;
  onOutfitChange?: (outfit: OutfitRecommendation) => void;
}) {
  const [swapOpen, setSwapOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState(outfit.items[0]?.id || "");
  const [swapDirection, setSwapDirection] = useState("best-match");
  const [isSwapping, setIsSwapping] = useState(false);
  const [swapFailed, setSwapFailed] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [rating, setRating] = useState(4);
  const [selectedFeedbackTags, setSelectedFeedbackTags] = useState<string[]>([]);
  const [toast, setToast] = useState("");
  const [actionFailed, setActionFailed] = useState(false);

  async function handleSwap() {
    if (!selectedItemId) return;
    setIsSwapping(true);
    setSwapFailed(false);
    const item = outfit.items.find((entry) => entry.id === selectedItemId);
    const result = await swapOutfitItem(outfit.id, {
      itemIdToReplace: selectedItemId,
      category: item?.category,
      swapDirection
    });
    setIsSwapping(false);

    if (result.ok) {
      onOutfitChange?.(result.data.outfit);
      setSwapOpen(false);
      return;
    }

    setSwapFailed(true);
  }

  async function handleSave(favorite = false) {
    setActionFailed(false);
    const result = await saveOutfit(outfit.id, { title: outfit.title, favorite });
    if (result.ok) {
      setToast(favorite ? "Added to favorites" : "Look saved");
      window.setTimeout(() => setToast(""), 1800);
      return;
    }
    setActionFailed(true);
  }

  async function handleWear() {
    setActionFailed(false);
    const result = await wearOutfit(outfit.id, { wornAt: new Date().toISOString(), rating: feedbackRatings.find((item) => item.value === rating)?.label || "Good" });
    if (result.ok) {
      setToast("Marked as worn");
      window.setTimeout(() => setToast(""), 1800);
      return;
    }
    setActionFailed(true);
  }

  async function handleFeedback() {
    setActionFailed(false);
    const result = await submitOutfitFeedback(outfit.id, { rating, feedbackTags: selectedFeedbackTags });
    if (result.ok) {
      setToast("Feedback saved");
      window.setTimeout(() => setToast(""), 1800);
      setFeedbackOpen(false);
      return;
    }
    setActionFailed(true);
  }

  return (
    <>
      <OutfitCard outfit={outfit} />

      <section className="mt-7">
        <SectionHeader title="Items in this look" />
        <div className="mobile-scrollbar flex gap-3 overflow-x-auto pb-2">
          {outfit.items.map((item) => <OutfitItemCard key={item.id} item={item} />)}
        </div>
      </section>

      <section className="mt-7">
        <SectionHeader title="Why this works" />
        <Notes outfit={outfit} />
      </section>

      {outfit.swapGroups?.length ? (
        <section className="mt-7">
          <SectionHeader title="Swap preview" />
          <Card className="space-y-3">
            {outfit.swapGroups.slice(0, 3).map((group) => (
              <div key={group.category} className="rounded-2xl bg-canvas p-3">
                <p className="text-xs font-semibold capitalize text-ink">{group.category}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(group.warningChips.length ? group.warningChips : ["Best match"]).map((warning) => <Chip key={warning}>{warning}</Chip>)}
                </div>
              </div>
            ))}
          </Card>
        </section>
      ) : null}

      {actionFailed ? <div className="mt-6"><OutfitApiErrorState /></div> : null}

      <CTABar className="mt-6 grid grid-cols-2 gap-2">
        {canSwap ? <Button onClick={() => void handleWear()}>Wear this</Button> : <Link href="/wardrobe/add"><Button className="w-full">Add clothes</Button></Link>}
        {canSwap ? <Button variant="secondary" onClick={() => setSwapOpen(true)}>Swap item</Button> : <Link href={`/outfit/${outfit.id}`}><Button variant="secondary" className="w-full">Open detail</Button></Link>}
        {canSwap ? <Button variant="secondary" onClick={() => void handleSave(false)}>Save look</Button> : null}
        {canSwap ? <Button variant="ghost" onClick={() => setFeedbackOpen(true)}>Rate</Button> : null}
      </CTABar>
      <Toast show={Boolean(toast)} message={toast} />

      <BottomSheet open={swapOpen} onClose={() => setSwapOpen(false)} title="Swap item">
        <div className="space-y-4">
          {swapFailed ? <OutfitApiErrorState /> : null}
          <label className="block text-xs font-semibold text-ink">
            Item to swap
            <select className="focus-ring mt-1 min-h-11 w-full rounded-2xl border border-line bg-white px-3 py-2 text-sm text-ink" value={selectedItemId} onChange={(event) => setSelectedItemId(event.target.value)}>
              {outfit.items.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {swapDirections.map((direction) => (
              <button
                key={direction.value}
                type="button"
                className={`focus-ring min-h-11 rounded-2xl border px-3 py-2 text-sm font-semibold ${swapDirection === direction.value ? "border-cocoa bg-cocoa text-white" : "border-line bg-white text-ink"}`}
                onClick={() => setSwapDirection(direction.value)}
              >
                {direction.label}
              </button>
            ))}
          </div>
          <Button className="w-full" onClick={() => void handleSwap()} disabled={isSwapping}>
            {isSwapping ? "Swapping..." : "Apply swap"}
          </Button>
        </div>
      </BottomSheet>

      <BottomSheet open={feedbackOpen} onClose={() => setFeedbackOpen(false)} title="Rate outfit">
        <p className="text-sm leading-6 text-muted">Your rating helps FitPick improve clothing, color, occasion, and weather matches.</p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          {feedbackRatings.map((item) => (
            <Button key={item.label} variant={rating === item.value ? "primary" : "secondary"} onClick={() => setRating(item.value)}>
              {item.label}
            </Button>
          ))}
        </div>
        <div className="mt-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-terracotta">Optional feedback</p>
          <div className="flex flex-wrap gap-2">
            {feedbackTags.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setSelectedFeedbackTags((current) => current.includes(item.value) ? current.filter((tag) => tag !== item.value) : [...current, item.value])}
              >
                <Chip active={selectedFeedbackTags.includes(item.value)}>{item.label}</Chip>
              </button>
            ))}
          </div>
        </div>
        <Button className="mt-5 w-full" onClick={() => void handleFeedback()}>Save feedback</Button>
        <Button className="mt-2 w-full" variant="ghost" onClick={() => void handleSave(true)}>Favorite this look</Button>
      </BottomSheet>
    </>
  );
}
