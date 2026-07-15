import { AppShell } from "@/components/layout/AppShell";
import { SimpleHomeActions } from "@/components/home/SimpleHomeActions";
import { SimpleStartGuide } from "@/components/onboarding/SimpleStartGuide";

export default function HomePage() {
  return (
    <AppShell>
      <header className="flex flex-col gap-8 border-b border-line pb-10 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-4xl">
          <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.3em] text-cocoa">Your daily edit</p>
          <h1 className="font-editorial text-balance text-6xl font-semibold leading-[0.83] tracking-editorial text-ink sm:text-7xl lg:text-8xl xl:text-9xl">
            Dress with
            <br />
            <span className="italic text-olive">intention.</span>
          </h1>
        </div>
        <p className="max-w-sm text-pretty text-sm leading-6 text-muted lg:pb-2">
          A wardrobe that thinks with you. Build considered looks from what you own, preview the fit, and step out with confidence.
        </p>
      </header>
      <div className="mt-6 flex items-center justify-between border-b border-line pb-6 text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
        <span>FitPick intelligence</span>
        <span>Collection / 2026</span>
      </div>
      <div className="mt-8 flex flex-col gap-12">
        <SimpleHomeActions />
        <SimpleStartGuide />
      </div>
    </AppShell>
  );
}
