import { AppShell } from "@/components/layout/AppShell";
import { OutfitDetailClient } from "@/components/outfit/OutfitDetailClient";

export default async function OutfitDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <AppShell>
      <header className="relative overflow-hidden rounded-xl4 border border-line bg-surface/80 p-5 shadow-card sm:p-8">
        <div className="absolute right-[-5rem] top-[-6rem] size-60 rounded-full bg-cocoa/10 blur-3xl" />
        <div className="absolute bottom-[-7rem] left-[-5rem] size-72 rounded-full bg-olive/10 blur-3xl" />
        <div className="relative max-w-4xl">
          <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.3em] text-cocoa">Outfit detail</p>
          <h1 className="font-editorial text-balance text-4xl font-semibold leading-[0.98] tracking-editorial text-ink sm:text-5xl lg:text-6xl">Outfit detail</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-muted sm:text-base">Review outfit items, styling notes, swaps, and try-on previews.</p>
        </div>
      </header>
      <OutfitDetailClient id={id} />
    </AppShell>
  );
}
