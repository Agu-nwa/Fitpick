import { AppShell } from "@/components/layout/AppShell";
import { SimpleHomeActions } from "@/components/home/SimpleHomeActions";
import { SimpleStartGuide } from "@/components/onboarding/SimpleStartGuide";
import { WeatherStylingCard } from "@/components/home/WeatherStylingCard";

export default function HomePage() {
  return (
    <AppShell>
      <header className="relative overflow-hidden rounded-xl4 border border-line bg-white/76 p-6 shadow-card backdrop-blur-xl sm:p-8">
        <div className="max-w-4xl">
          <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.22em] text-cocoa">Home</p>
          <h1 className="font-editorial text-balance text-4xl font-semibold leading-[0.98] tracking-editorial text-ink sm:text-5xl lg:text-6xl">
            What should you do next?
          </h1>
          <p className="mt-4 max-w-xl text-pretty text-sm leading-6 text-muted sm:text-base">
            Ask your Stylist for an outfit, or add the pieces MyFitPick needs to make better suggestions.
          </p>
        </div>
      </header>
      <div className="mt-6 flex flex-col gap-6">
        <WeatherStylingCard />
        <SimpleHomeActions />
        <SimpleStartGuide />
      </div>
    </AppShell>
  );
}
