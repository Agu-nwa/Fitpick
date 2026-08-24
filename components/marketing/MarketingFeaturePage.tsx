import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import type { MarketingPageConfig, MarketingTone } from "@/lib/marketing/site";
import { CinematicHeroMedia, MarketingReveal } from "@/components/marketing/MarketingReveal";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { PublicNavigation } from "@/components/marketing/PublicNavigation";

function toneClasses(tone: MarketingTone) {
  if (tone === "dark") return "bg-[#0a0a09] text-white";
  if (tone === "cocoa") return "bg-cocoa text-white";
  return "bg-canvas text-ink";
}

export function MarketingFeaturePage({ config, signedIn }: { config: MarketingPageConfig; signedIn: boolean }) {
  const protectedDestination = config.primaryHref.startsWith("/stylist") || config.primaryHref.startsWith("/wardrobe");
  const primaryHref = protectedDestination
    ? signedIn
      ? config.primaryHref === "/stylist" ? "/stylist/create-look" : config.primaryHref
      : "/register"
    : signedIn && config.primaryHref === "/register" ? "/home" : config.primaryHref;

  return (
    <div className="marketing-editorial min-h-screen overflow-x-clip bg-canvas text-ink">
      <PublicNavigation signedIn={signedIn} />
      <main id="main-content">
        <section className="relative isolate min-h-[76svh] overflow-hidden bg-[#0a0a09] text-white">
          <CinematicHeroMedia still={config.heroImage} alt={config.heroAlt} />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/84 to-black/10" aria-hidden="true" />
          <div className="relative mx-auto flex min-h-[76svh] max-w-7xl items-center px-5 py-24 sm:px-8 lg:px-12">
            <MarketingReveal className="max-w-3xl">
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-cocoa">{config.eyebrow}</p>
              <h1 className="mt-6 max-w-3xl font-editorial text-5xl font-semibold leading-[0.96] tracking-editorial sm:text-7xl lg:text-[88px]">{config.title}</h1>
              <p className="mt-7 max-w-2xl text-base leading-7 text-white/68 sm:text-lg sm:leading-8">{config.description}</p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link href={primaryHref} className="focus-ring inline-flex min-h-14 items-center justify-center gap-2 rounded-xl bg-white px-7 text-sm font-bold text-ink transition hover:-translate-y-0.5 hover:bg-canvas">
                  {config.primaryLabel}<ArrowRight size={17} aria-hidden="true" />
                </Link>
                <Link href="/features" className="focus-ring inline-flex min-h-14 items-center justify-center rounded-xl border border-white/25 bg-white/5 px-7 text-sm font-bold text-white backdrop-blur transition hover:bg-white/10">Explore Features</Link>
              </div>
            </MarketingReveal>
          </div>
        </section>

        {config.sections.map((section, index) => {
          const dark = section.tone !== "light";
          return (
            <section key={`${config.slug}-${section.eyebrow}`} className={`${toneClasses(section.tone)} px-5 py-20 sm:px-8 lg:px-12 lg:py-28`}>
              <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2 lg:gap-20">
                <MarketingReveal className={index % 2 ? "lg:order-2" : ""}>
                  <p className={`text-[11px] font-bold uppercase tracking-[0.28em] ${dark ? "text-canvas/72" : "text-cocoa"}`}>{section.eyebrow}</p>
                  <h2 className="mt-5 max-w-2xl font-editorial text-4xl font-semibold leading-[1.02] tracking-editorial sm:text-6xl">{section.title}</h2>
                  <p className={`mt-6 max-w-xl text-base leading-7 sm:text-lg sm:leading-8 ${dark ? "text-white/64" : "text-muted"}`}>{section.body}</p>
                  {section.bullets ? (
                    <ul className="mt-8 grid gap-3">
                      {section.bullets.map((bullet) => <li key={bullet} className={`flex items-center gap-3 text-sm font-semibold ${dark ? "text-white/78" : "text-ink"}`}><span className={`flex size-7 shrink-0 items-center justify-center rounded-full ${dark ? "bg-cocoa text-canvas" : "bg-cocoa/10 text-cocoa"}`}><Check size={14} aria-hidden="true" /></span>{bullet}</li>)}
                    </ul>
                  ) : null}
                </MarketingReveal>
                <MarketingReveal delay={0.08} className={index % 2 ? "lg:order-1" : ""}>
                  <div className={`relative aspect-[4/3] overflow-hidden rounded-[28px] border ${dark ? "border-white/10 bg-white/5" : "border-line bg-white"}`}>
                    <Image src={section.image} alt={section.imageAlt} fill sizes="(max-width: 1023px) 92vw, 48vw" className="object-cover" />
                  </div>
                </MarketingReveal>
              </div>
            </section>
          );
        })}

        {config.principles ? (
          <section className="bg-white px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
            <div className="mx-auto max-w-7xl">
              <MarketingReveal className="max-w-3xl"><p className="text-[11px] font-bold uppercase tracking-[0.28em] text-cocoa">DESIGNED AROUND YOUR WARDROBE</p><h2 className="mt-5 font-editorial text-4xl font-semibold tracking-editorial sm:text-6xl">Three principles. No invented promises.</h2></MarketingReveal>
              <div className="mt-12 grid gap-5 md:grid-cols-3">{config.principles.map((item, index) => <MarketingReveal key={item.title} delay={index * 0.06} className="rounded-[24px] border border-line bg-surfaceWarm p-7"><Sparkles className="text-cocoa" size={21} aria-hidden="true" /><h3 className="mt-7 font-editorial text-2xl font-semibold">{item.title}</h3><p className="mt-3 text-sm leading-6 text-muted">{item.body}</p></MarketingReveal>)}</div>
            </div>
          </section>
        ) : null}

        {config.faqs ? (
          <section className="bg-cocoa px-5 py-20 text-white sm:px-8 lg:px-12 lg:py-28">
            <div className="mx-auto max-w-3xl"><MarketingReveal><p className="text-[11px] font-bold uppercase tracking-[0.28em] text-canvas/72">USEFUL DETAILS</p><h2 className="mt-5 font-editorial text-4xl font-semibold sm:text-6xl">Clear answers before you begin.</h2></MarketingReveal><div className="mt-10 divide-y divide-white/14 border-y border-white/14">{config.faqs.map((faq) => <details key={faq.question} className="group"><summary className="focus-ring flex min-h-16 cursor-pointer list-none items-center justify-between gap-5 rounded-lg py-5 text-base font-bold sm:text-lg">{faq.question}<span className="text-2xl font-normal text-canvas/72 transition group-open:rotate-45" aria-hidden="true">+</span></summary><p className="max-w-2xl pb-6 pr-10 text-sm leading-7 text-white/62 sm:text-base">{faq.answer}</p></details>)}</div></div>
          </section>
        ) : null}

        <section className="bg-[#0a0a09] px-5 py-20 text-center text-white sm:px-8 lg:py-28">
          <MarketingReveal className="mx-auto max-w-4xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-cocoa">START WITH WHAT YOU OWN</p>
            <h2 className="mt-6 font-editorial text-5xl font-semibold leading-[0.98] tracking-editorial sm:text-7xl">Your next outfit may already be in your closet.</h2>
            <Link href={primaryHref} className="focus-ring mt-9 inline-flex min-h-14 items-center justify-center gap-2 rounded-xl bg-white px-8 font-bold text-ink transition hover:-translate-y-0.5 hover:bg-canvas">{config.primaryLabel}<ArrowRight size={17} aria-hidden="true" /></Link>
          </MarketingReveal>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
