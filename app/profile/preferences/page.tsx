import { SlidersHorizontal } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PreferencesClient } from "@/components/profile/PreferencesClient";

export default function PreferencesPage() {
  return (
    <AppShell>
      <header className="relative overflow-hidden rounded-xl4 border border-line bg-surface/80 p-5 shadow-card sm:p-8">
        <div className="absolute right-[-5rem] top-[-6rem] size-60 rounded-full bg-cocoa/10 blur-3xl" />
        <div className="relative max-w-4xl">
          <p className="mb-4 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-cocoa">
            <SlidersHorizontal size={14} aria-hidden="true" />
            Style profile
          </p>
          <h1 className="font-editorial text-balance text-5xl font-semibold leading-[0.9] tracking-editorial text-ink sm:text-6xl lg:text-7xl">
            Style preferences.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-muted sm:text-base">
            Help FitPick understand what feels right, what to avoid, and how much context it should use.
          </p>
        </div>
      </header>
      <PreferencesClient />
    </AppShell>
  );
}
