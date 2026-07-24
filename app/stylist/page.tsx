import { Sparkles } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { StylistChat } from "@/components/stylist/StylistChat";

export default function StylistPage() {
  return (
    <AppShell>
      <header className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-3 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.26em] text-cocoa">
            <Sparkles size={14} aria-hidden="true" />
            Personal stylist
          </p>
          <h1 className="font-editorial text-4xl font-semibold leading-none text-ink sm:text-5xl">Your Stylist</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
            Build a look, recreate an outfit, or get styled from your wardrobe.
          </p>
        </div>
        <p className="rounded-full border border-line bg-surface/80 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-muted">
          Closet-first
        </p>
      </header>
      <StylistChat />
    </AppShell>
  );
}
