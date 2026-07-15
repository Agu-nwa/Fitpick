import { AppShell } from "@/components/layout/AppShell";
import { Camera, Check, Images, Sparkles } from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card } from "@/components/ui/Card";
import { WardrobeAddClient } from "@/components/wardrobe/WardrobeAddClient";
import { uploadPreviewItems } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const tips = [
  "Use a clear photo of one garment.",
  "Capture the full front and back.",
  "Natural light helps FitPick read color better.",
  "Keep the care label flat so OCR can read it."
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
          <h1 className="font-editorial text-balance text-5xl font-semibold leading-[0.9] tracking-editorial text-ink sm:text-6xl lg:text-7xl">
            Add the piece. FitPick reads the details.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-muted sm:text-base">
            Capture the front, back, fabric, and label so styling, fit notes, and virtual try-on have better wardrobe context.
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

      <section className="mt-7">
        <SectionHeader title="Recent uploads" eyebrow="Upload states" />
        <div className="mobile-scrollbar flex gap-3 overflow-x-auto pb-1">
          {uploadPreviewItems.map((item) => (
            <article key={item.id} className="min-w-[148px] rounded-2xl border border-line bg-surface/90 p-3 shadow-card">
              <div className={cn("mb-3 h-28 rounded-2xl bg-gradient-to-br", item.imageTone)} role="img" aria-label={item.name} />
              <p className="mb-1 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.18em] text-cocoa">
                <Images size={12} aria-hidden="true" />
                Upload
              </p>
              <h3 className="text-xs font-semibold text-ink">{item.name}</h3>
              <p className="mt-1 text-[11px] text-muted">{item.status}</p>
            </article>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
