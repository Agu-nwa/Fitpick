import Link from "next/link";
import { ArrowUpRight, ImagePlus, Sparkles, WandSparkles } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";

export default function StylistPage() {
  return (
    <AppShell>
      <header className="flex min-w-0 flex-col gap-3 pt-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="mb-3 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.26em] text-cocoa">
            <Sparkles size={14} aria-hidden="true" />
            Personal stylist
          </p>
          <h1 className="font-editorial text-4xl font-semibold leading-none text-ink sm:text-5xl">Your Stylist</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
            Choose how you want MyFitPick to style you today.
          </p>
        </div>
        <p className="max-w-full self-start rounded-full border border-line bg-surface/80 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-muted sm:self-auto">
          Closet-first
        </p>
      </header>

      <section className="grid w-full min-w-0 gap-5 overflow-hidden pb-6 pt-7 lg:grid-cols-2">
        <Link href="/stylist/create-look" className="focus-ring group block min-w-0 max-w-full rounded-xl3">
          <Card className="min-h-[22rem] w-full min-w-0 overflow-hidden border-cocoa/20 bg-gradient-to-br from-white via-surface to-olive/10 p-5 shadow-card transition duration-300 group-hover:-translate-y-1 group-hover:border-cocoa/40 sm:min-h-[24rem] sm:p-6">
            <div className="flex h-full min-w-0 flex-col justify-between gap-8 sm:gap-10">
              <div className="min-w-0">
                <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-cocoa text-canvas shadow-glow">
                  <WandSparkles size={20} aria-hidden="true" />
                </span>
                <p className="mt-8 max-w-full text-[10px] font-bold uppercase tracking-[0.18em] text-cocoa sm:tracking-[0.24em]">Create a Look</p>
                <h2 className="font-editorial mt-3 max-w-full break-words text-4xl font-semibold leading-[0.95] text-ink sm:text-5xl">Build from your closet.</h2>
                <p className="mt-4 max-w-full text-[15px] leading-6 text-muted sm:max-w-md sm:text-sm">
                  Start with an occasion, mood, weather, or favorite piece.
                </p>
              </div>
              <span className="inline-flex max-w-full items-center gap-2 text-sm font-bold text-ink">
                Start styling
                <ArrowUpRight size={17} className="transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
              </span>
            </div>
          </Card>
        </Link>

        <Link href="/stylist/match" className="focus-ring group block min-w-0 max-w-full rounded-xl3">
          <Card className="min-h-[22rem] w-full min-w-0 overflow-hidden border-olive/25 bg-gradient-to-br from-cocoa/10 via-surface to-terracotta/20 p-5 shadow-card transition duration-300 group-hover:-translate-y-1 group-hover:border-cocoa/40 sm:min-h-[24rem] sm:p-6">
            <div className="flex h-full min-w-0 flex-col justify-between gap-8 sm:gap-10">
              <div className="min-w-0">
                <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-espresso text-canvas shadow-soft">
                  <ImagePlus size={20} aria-hidden="true" />
                </span>
                <p className="mt-8 max-w-full text-[10px] font-bold uppercase tracking-[0.18em] text-cocoa sm:tracking-[0.24em]">Match an Outfit</p>
                <h2 className="font-editorial mt-3 max-w-full break-words text-4xl font-semibold leading-[0.95] text-ink sm:text-5xl">Style a look you admire.</h2>
                <p className="mt-4 max-w-full text-[15px] leading-6 text-muted sm:max-w-md sm:text-sm">
                  Upload a photo or screenshot and receive three closet-led options when possible.
                </p>
              </div>
              <span className="inline-flex max-w-full items-center gap-2 text-sm font-bold text-ink">
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
