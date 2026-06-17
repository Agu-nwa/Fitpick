"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { CTABar } from "@/components/ui/CTABar";
import { Toast } from "@/components/ui/Toast";
import { SwapItemSheet } from "@/components/sheets/SwapItemSheet";
import { RatingSheet } from "@/components/sheets/RatingSheet";

export function OutfitActions() {
  const [swapOpen, setSwapOpen] = useState(false);
  const [ratingOpen, setRatingOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!saved) return;
    const timer = window.setTimeout(() => setSaved(false), 1800);
    return () => window.clearTimeout(timer);
  }, [saved]);

  return (
    <>
      <CTABar className="mt-6 grid grid-cols-3 gap-2">
        <Button className="col-span-2" onClick={() => setRatingOpen(true)}>Wear this</Button>
        <Button variant="secondary" onClick={() => setSwapOpen(true)}>Swap</Button>
        <Link href="/looks" className="col-span-3" onClick={() => setSaved(true)}>
          <Button variant="ghost" className="w-full">Save look</Button>
        </Link>
      </CTABar>
      <Toast show={saved} message="Look saved" />
      <SwapItemSheet open={swapOpen} onClose={() => setSwapOpen(false)} />
      <RatingSheet open={ratingOpen} onClose={() => setRatingOpen(false)} />
    </>
  );
}
