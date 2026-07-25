import Link from "next/link";
import { ArrowUpRight, ImagePlus, Sparkles, WandSparkles } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";

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
            Choose how you want to be styled today.
          </p>
        </div>
        <p className="rounded-full border border-line bg-surface/80 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-muted">
          Closet-first
        </p>
      </header>

      <section className="grid gap-5 pb-6 pt-7 lg:grid-cols-2">
        <Link href="/stylist/create-look" className="focus-ring group block rounded-xl3">
          <Card className="min-h-[24rem] overflow-hidden border-cocoa/20 bg-gradient-to-br from-white via-surface to-olive/10 p-6 shadow-card transition duration-300 group-hover:-translate-y-1 group-hover:border-cocoa/40">
            <div className="flex h-full flex-col justify-between gap-10">
              <div>
                <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-cocoa text-canvas shadow-glow">
                  <WandSparkles size={20} aria-hidden="true" />
                </span>
                <p className="mt-8 text-[10px] font-bold uppercase tracking-[0.24em] text-cocoa">Create a Look</p>
                <h2 className="font-editorial mt-3 text-5xl font-semibold leading-[0.9] text-ink">Build from your closet.</h2>
                <p className="mt-4 max-w-md text-sm leading-6 text-muted">
                  Tell MyFitPick the occasion, mood, weather, or piece you want to start with.
                </p>
              </div>
              <span className="inline-flex items-center gap-2 text-sm font-bold text-ink">
                Start styling
                <ArrowUpRight size={17} className="transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
              </span>
            </div>
          </Card>
        </Link>

        <Link href="/stylist/match" className="focus-ring group block rounded-xl3">
          <Card className="min-h-[24rem] overflow-hidden border-olive/25 bg-gradient-to-br from-cocoa/10 via-surface to-terracotta/20 p-6 shadow-card transition duration-300 group-hover:-translate-y-1 group-hover:border-cocoa/40">
            <div className="flex h-full flex-col justify-between gap-10">
              <div>
                <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-espresso text-canvas shadow-soft">
                  <ImagePlus size={20} aria-hidden="true" />
                </span>
                <p className="mt-8 text-[10px] font-bold uppercase tracking-[0.24em] text-cocoa">Match an Outfit</p>
                <h2 className="font-editorial mt-3 text-5xl font-semibold leading-[0.9] text-ink">Style a look you admire.</h2>
                <p className="mt-4 max-w-md text-sm leading-6 text-muted">
                  Upload a photo or screenshot and receive closet-led outfit options.
                </p>
              </div>
              <span className="inline-flex items-center gap-2 text-sm font-bold text-ink">
                Match a look
                <ArrowUpRight size={17} className="transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
              </span>
            </div>
          </Card>
        </Link>
      </section>
    </AppShell>
  );
}
