import { CalendarDays } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { OccasionPickerClient } from "@/components/occasion/OccasionPickerClient";

export default function OccasionPage() {
  return (
    <AppShell>
      <header className="relative overflow-hidden rounded-xl4 border border-line bg-surface/80 p-5 shadow-card sm:p-8">
        <div className="absolute right-[-5rem] top-[-6rem] size-60 rounded-full bg-cocoa/10 blur-3xl" />
        <div className="relative max-w-4xl">
          <p className="mb-4 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-cocoa">
            <CalendarDays size={14} aria-hidden="true" />
            Occasion
          </p>
          <h1 className="font-editorial text-balance text-5xl font-semibold leading-[0.9] tracking-editorial text-ink sm:text-6xl lg:text-7xl">
            Where are you going?
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-muted sm:text-base">
            Choose the moment, then FitPick will tune the outfit for formality, weather, and what is already in your closet.
          </p>
        </div>
      </header>
      <OccasionPickerClient />
    </AppShell>
  );
}
