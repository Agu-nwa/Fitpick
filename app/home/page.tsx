import { AppShell } from "@/components/layout/AppShell";
import { DynamicEditorialGreeting } from "@/components/home/DynamicEditorialGreeting";
import { SimpleHomeActions } from "@/components/home/SimpleHomeActions";
import { SimpleStartGuide } from "@/components/onboarding/SimpleStartGuide";
import { WeatherStylingCard } from "@/components/home/WeatherStylingCard";

export default function HomePage() {
  return (
    <AppShell>
      <header className="relative overflow-hidden rounded-xl4 border border-line bg-white/76 p-6 shadow-card backdrop-blur-xl sm:p-8">
        <div className="max-w-4xl">
          <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.22em] text-cocoa">Home</p>
          <DynamicEditorialGreeting />
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
