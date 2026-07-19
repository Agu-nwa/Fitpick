import { AppShell } from "@/components/layout/AppShell";
import { Camera, Check } from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card } from "@/components/ui/Card";
import { WardrobeAddClient } from "@/components/wardrobe/WardrobeAddClient";

const tips = [
  "Use a clear photo of one garment.",
  "Start with one full main photo.",
  "Natural light helps MyFitPick read color better.",
  "Add a product-detail photo when a label, serial, size, or material mark is visible."
];

export default function AddClothesPage() {
  return (
    <AppShell>
      <header className="relative overflow-hidden rounded-xl4 border border-line bg-surface/80 p-5 shadow-card sm:p-8">
        <div className="absolute right-[-5rem] top-[-6rem] size-60 rounded-full bg-cocoa/10 blur-3xl" />
        <div className="absolute bottom-[-7rem] left-[-5rem] size-72 rounded-full bg-olive/10 blur-3xl" />
        <div className="relative max-w-4xl">
          <p className="mb-4 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-cocoa">
            <Camera size={14} aria-hidden="true" />
            Closet intake
          </p>
          <h1 className="font-editorial text-balance text-4xl font-semibold leading-[0.98] tracking-editorial text-ink sm:text-5xl lg:text-6xl">
            Add the piece. MyFitPick reads the details.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-muted sm:text-base">
            Choose what you are adding, capture one clear main photo, then add optional detail photos when they help identify the piece.
          </p>
        </div>
      </header>
      <WardrobeAddClient />

      <section className="mt-7">
        <SectionHeader title="Photo tips" eyebrow="Better analysis" />
        <Card className="grid gap-3 md:grid-cols-2">
          {tips.map((tip) => (
            <div key={tip} className="flex gap-3 rounded-2xl border border-line bg-canvas/60 p-3 text-sm text-muted">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cocoa text-[10px] font-bold text-canvas">
                <Check size={13} aria-hidden="true" />
              </span>
              <p>{tip}</p>
            </div>
          ))}
        </Card>
      </section>
    </AppShell>
  );
}
