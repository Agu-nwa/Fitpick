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

      <section className="grid w-full min-w-0 gap-5 overflow-hidden pb-6 lg:grid-cols-2">
        <Link href="/stylist/create-look" className="focus-ring group block min-w-0 max-w-full rounded-xl3">
          <div className="min-h-[22rem] w-full min-w-0 overflow-hidden rounded-xl3 border border-cocoa bg-cocoa p-6 text-canvas shadow-glow transition duration-300 group-hover:-translate-y-1 sm:min-h-[24rem] sm:p-7">
            <div className="flex h-full min-w-0 flex-col justify-between gap-8 sm:gap-10">
              <div className="min-w-0">
                <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-canvas/12 text-canvas shadow-soft ring-1 ring-canvas/25">
                  <WandSparkles size={20} aria-hidden="true" />
                </span>
                <p className="mt-8 max-w-full text-[10px] font-bold uppercase tracking-[0.18em] text-canvas/70 sm:tracking-[0.24em]">Create a Look</p>
                <h2 className="font-editorial mt-3 max-w-full break-words text-4xl font-semibold leading-[0.95] text-canvas sm:text-5xl">Create from your closet.</h2>
                <p className="mt-4 max-w-full text-[15px] leading-6 text-canvas/72 sm:max-w-md sm:text-sm">
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

        <Link href="/stylist/match" className="focus-ring group block min-w-0 max-w-full rounded-xl3">
          <Card className="min-h-[22rem] w-full min-w-0 overflow-hidden border-cocoa/25 bg-[#FBF3EC] p-6 shadow-card transition duration-300 group-hover:-translate-y-1 group-hover:border-cocoa/40 sm:min-h-[24rem] sm:p-7">
            <div className="flex h-full min-w-0 flex-col justify-between gap-8 sm:gap-10">
              <div className="min-w-0">
                <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-espresso text-canvas shadow-soft">
                  <ImagePlus size={20} aria-hidden="true" />
                </span>
                <p className="mt-8 max-w-full text-[10px] font-bold uppercase tracking-[0.18em] text-espresso sm:tracking-[0.24em]">Match an Outfit</p>
                <h2 className="font-editorial mt-3 max-w-full break-words text-4xl font-semibold leading-[0.95] text-ink sm:text-5xl">Style a look you admire.</h2>
                <p className="mt-4 max-w-full text-[15px] leading-6 text-muted sm:max-w-md sm:text-sm">
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
