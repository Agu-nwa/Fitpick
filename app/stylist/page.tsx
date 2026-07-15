import { MessageCircle, Sparkles } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { StylistChat } from "@/components/stylist/StylistChat";

export default function StylistPage() {
  return (
    <AppShell>
      <header className="relative overflow-hidden rounded-xl4 border border-line bg-surface/80 p-5 shadow-card sm:p-8">
        <div className="absolute right-[-5rem] top-[-6rem] size-60 rounded-full bg-cocoa/10 blur-3xl" />
        <div className="absolute bottom-[-7rem] left-[-5rem] size-72 rounded-full bg-olive/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-4xl">
            <p className="mb-4 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-cocoa">
              <MessageCircle size={14} aria-hidden="true" />
              Personal stylist
            </p>
            <h1 className="font-editorial text-balance text-5xl font-semibold leading-[0.9] tracking-editorial text-ink sm:text-6xl lg:text-7xl">
              Ask for the look. FitPick styles the closet.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-muted sm:text-base">
              Tell the stylist the occasion, mood, weather, and dress code. FitPick turns your wardrobe into a styled recommendation with try-on support.
            </p>
          </div>
          <div className="rounded-full border border-cocoa/25 bg-cocoa/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-cocoa">
            <Sparkles size={14} className="mr-2 inline" aria-hidden="true" />
            Closet-led advice
          </div>
        </div>
      </header>
      <StylistChat />
    </AppShell>
  );
}
