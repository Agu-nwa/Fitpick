"use client";

import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { wardrobeItems } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const groups = ["Best match", "More polished", "More casual", "Weather-safe"];

export function SwapItemSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const options = wardrobeItems.slice(4, 9);
  return (
    <BottomSheet open={open} onClose={onClose} title="Swap item">
      <p className="mb-4 text-sm leading-6 text-muted">Change one piece without rebuilding the whole outfit.</p>
      <div className="mobile-scrollbar mb-4 flex gap-2 overflow-x-auto pb-1">
        {groups.map((group, index) => <Chip key={group} active={index === 0}>{group}</Chip>)}
      </div>
      <div className="max-h-[430px] space-y-3 overflow-y-auto pr-1">
        {options.map((item, index) => (
          <article key={item.id} className="rounded-2xl border border-line bg-canvas/60 p-3">
            <div className="flex gap-3">
              <div className={cn("h-20 w-20 shrink-0 rounded-2xl bg-gradient-to-br", item.imageTone)} role="img" aria-label={item.name} />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-ink">{item.name}</h3>
                    <p className="mt-1 text-xs text-muted">{item.color} · {item.category}</p>
                  </div>
                  <span className="rounded-full bg-success/15 px-2 py-1 text-[10px] font-bold text-success">{index === 0 ? "Best" : "Good"}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {index === 1 ? <Chip>Changes formality</Chip> : null}
                  {item.weather.includes("rainy") ? <Chip active>Weather-safe</Chip> : <Chip>Color match</Chip>}
                </div>
              </div>
            </div>
            <Button className="mt-3 w-full" variant={index === 0 ? "primary" : "secondary"}>Apply swap</Button>
          </article>
        ))}
      </div>
    </BottomSheet>
  );
}
