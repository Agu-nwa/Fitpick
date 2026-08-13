import Link from "next/link";
import { ArrowUpRight, ImagePlus, WandSparkles } from "lucide-react";
import { StylistStudioShell } from "@/components/stylist/StylistStudioShell";
import { Card } from "@/components/ui/Card";

export default function StylistPage() {
  return (
    <StylistStudioShell
      eyebrow="Personal stylist"
      title="Your AI fashion studio."
      description="Create from your closet, or style a piece you admire with what you already own."
      badge="Closet-first"
    >

      <section className="grid w-full min-w-0 gap-4 overflow-hidden pb-6 lg:grid-cols-2">
        <Link href="/stylist/create-look" className="focus-ring group block min-w-0 max-w-full rounded-2xl">
          <div className="min-h-72 w-full min-w-0 overflow-hidden rounded-2xl border border-cocoa bg-cocoa p-6 text-white shadow-soft transition duration-200 group-hover:-translate-y-0.5 sm:p-7">
            <div className="flex h-full min-w-0 flex-col justify-between gap-8">
              <div className="min-w-0">
                <span className="inline-flex size-11 items-center justify-center rounded-xl bg-white/12 text-white ring-1 ring-white/20">
                  <WandSparkles size={20} aria-hidden="true" />
                </span>
                <p className="mt-6 max-w-full text-xs font-bold uppercase tracking-[0.16em] text-white/70">Create a Look</p>
                <h2 className="font-editorial mt-3 max-w-full break-words text-3xl font-semibold leading-none text-white sm:text-4xl">Create from your closet.</h2>
                <p className="mt-4 max-w-full text-sm leading-6 text-white/75 sm:max-w-md">
                  Start with an occasion, mood, weather, or favourite piece.
                </p>
              </div>
              <span className="inline-flex max-w-full items-center gap-2 text-sm font-bold text-canvas">
                Start styling
                <ArrowUpRight size={17} className="transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
              </span>
            </div>
          </div>
        </Link>

        <Link href="/stylist/match" className="focus-ring group block min-w-0 max-w-full rounded-2xl">
          <Card className="min-h-72 w-full min-w-0 overflow-hidden bg-surfaceWarm p-6 transition duration-200 group-hover:-translate-y-0.5 group-hover:border-cocoa/40 sm:p-7">
            <div className="flex h-full min-w-0 flex-col justify-between gap-8">
              <div className="min-w-0">
                <span className="inline-flex size-11 items-center justify-center rounded-xl bg-canvasSubtle text-cocoa">
                  <ImagePlus size={20} aria-hidden="true" />
                </span>
                <p className="mt-6 max-w-full text-xs font-bold uppercase tracking-[0.16em] text-cocoa">Match an Outfit</p>
                <h2 className="font-editorial mt-3 max-w-full break-words text-3xl font-semibold leading-none text-ink sm:text-4xl">Style a look you admire.</h2>
                <p className="mt-4 max-w-full text-sm leading-6 text-muted sm:max-w-md">
                  Upload a photo or screenshot and build a closet-led look around it.
                </p>
              </div>
              <span className="inline-flex max-w-full items-center gap-2 text-sm font-bold text-espresso">
                Match a look
                <ArrowUpRight size={17} className="transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
              </span>
            </div>
          </Card>
        </Link>
      </section>
    </StylistStudioShell>
  );
}
