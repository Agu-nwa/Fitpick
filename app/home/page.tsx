import { AppShell } from "@/components/layout/AppShell";
import { SimpleHomeActions } from "@/components/home/SimpleHomeActions";
import { SimpleStartGuide } from "@/components/onboarding/SimpleStartGuide";

export default function HomePage() {
  return (
    <AppShell>
      <header className="relative overflow-hidden rounded-xl4 border border-line bg-white/76 p-6 shadow-card backdrop-blur-xl sm:p-8 lg:p-10">
        <div className="max-w-4xl">
          <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.22em] text-cocoa">Your daily edit</p>
          <h1 className="font-editorial text-balance text-5xl font-semibold leading-[0.9] tracking-editorial text-ink sm:text-6xl lg:text-7xl xl:text-8xl">
            Dress with{" "}
            <br />
            <span className="italic text-cocoa">intention.</span>
          </h1>
          <p className="mt-6 max-w-xl text-pretty text-sm leading-6 text-muted sm:text-base">
            A wardrobe that thinks with you. Build considered looks from what you own, preview the fit, and step out with confidence.
          </p>
        </div>
      </header>
      <div className="mt-6 flex items-center justify-between gap-4 border-b border-line pb-6 text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
        <span>MyFitPick intelligence</span>
        <span>Collection / 2026</span>
      </div>
      <div className="mt-8 flex flex-col gap-12">
        <SimpleHomeActions />
        <SimpleStartGuide />
      </div>
    </AppShell>
  );
}
