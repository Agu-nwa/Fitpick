"use client";

import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";

const ratings = ["Perfect", "Good", "Okay", "Not today", "Not my style"];
const followUps = ["Too casual", "Too formal", "Wrong color", "Not my style", "Save more like this"];

export function RatingSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <BottomSheet open={open} onClose={onClose} title="How does this outfit feel?">
      <p className="text-sm leading-6 text-muted">Your rating helps FitPick improve future picks without judging your appearance.</p>
      <div className="mt-5 grid grid-cols-2 gap-3">
        {ratings.map((rating, index) => (
          <Button key={rating} variant={index === 0 ? "primary" : "secondary"}>{rating}</Button>
        ))}
      </div>
      <div className="mt-5">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-terracotta">Optional feedback</p>
        <div className="flex flex-wrap gap-2">
          {followUps.map((item) => <Chip key={item}>{item}</Chip>)}
        </div>
      </div>
    </BottomSheet>
  );
}
