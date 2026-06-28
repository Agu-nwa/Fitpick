import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
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
      <PageHeader eyebrow="Add clothes" title="Upload your clothing photos" subtitle="Add front, back, fabric, and label photos. FitPick will check the details before you save." />
      <WardrobeAddClient />

      <section className="mt-7">
        <SectionHeader title="Photo tips" />
        <Card className="space-y-3">
          {tips.map((tip) => (
            <div key={tip} className="flex gap-3 text-sm text-muted">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cocoa/10 text-[10px] font-bold text-cocoa">✓</span>
              <p>{tip}</p>
            </div>
          ))}
        </Card>
      </section>

      <section className="mt-7">
        <SectionHeader title="Recent uploads" />
        <div className="mobile-scrollbar flex gap-3 overflow-x-auto pb-1">
          {uploadPreviewItems.map((item) => (
            <article key={item.id} className="min-w-[128px] rounded-2xl border border-line bg-surface p-3">
              <div className={cn("mb-3 h-28 rounded-2xl bg-gradient-to-br", item.imageTone)} role="img" aria-label={item.name} />
              <h3 className="text-xs font-semibold text-ink">{item.name}</h3>
              <p className="mt-1 text-[11px] text-muted">{item.status}</p>
            </article>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
