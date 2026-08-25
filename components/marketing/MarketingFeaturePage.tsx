import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import type { MarketingPageConfig, MarketingTone } from "@/lib/marketing/site";
import { CinematicHeroMedia, MarketingReveal } from "@/components/marketing/MarketingReveal";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingProductStoryVisual, type MarketingStoryVariant } from "@/components/marketing/MarketingProductStoryVisual";
import { PublicNavigation } from "@/components/marketing/PublicNavigation";

function toneClasses(tone: MarketingTone) {
  if (tone === "dark") return "bg-surfaceWarm text-ink";
  if (tone === "cocoa") return "bg-white text-ink";
  return "bg-canvas text-ink";
}

export function MarketingFeaturePage({ config, signedIn }: { config: MarketingPageConfig; signedIn: boolean }) {
  const isHome = config.slug === "home";
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
        <section className="relative overflow-hidden border-b border-line bg-canvas text-ink">
          {isHome ? (
            <div className="pointer-events-none absolute inset-0 overflow-hidden lg:hidden" aria-hidden="true">
              <Image
                src="/marketing/myfitpick-brand-models-transparent-v2.png"
                alt=""
                fill
                priority
                sizes="100vw"
                className="object-cover object-[72%_center] opacity-[0.28]"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-canvas/95 via-canvas/58 to-canvas/82" />
            </div>
          ) : null}
          <div className="relative z-10 mx-auto grid min-h-[76svh] max-w-7xl items-center gap-12 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[0.94fr_1.06fr] lg:gap-16 lg:px-12 lg:py-24">
            <MarketingReveal className="relative z-10 max-w-3xl">
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-sage">{config.eyebrow}</p>
              <h1 className="mt-6 max-w-3xl font-editorial text-5xl font-semibold leading-[0.96] tracking-editorial sm:text-7xl lg:text-[80px]">{config.title}</h1>
              <p className="mt-7 max-w-2xl text-base leading-7 text-muted sm:text-lg sm:leading-8">{config.description}</p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link href={primaryHref} className="focus-ring inline-flex min-h-14 items-center justify-center gap-2 rounded-xl bg-sage px-7 text-sm font-bold text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-sageDark">
                  {config.primaryLabel}<ArrowRight size={17} aria-hidden="true" />
                </Link>
                <Link href="/features" className="focus-ring inline-flex min-h-14 items-center justify-center rounded-xl border border-line bg-white px-7 text-sm font-bold text-ink transition hover:bg-surfaceWarm">Explore Features</Link>
              </div>
            </MarketingReveal>
            <MarketingReveal delay={0.08} className={`${isHome ? "hidden lg:block" : ""} relative min-h-[430px] overflow-hidden rounded-[32px] border border-line bg-ink shadow-soft sm:min-h-[560px] lg:min-h-[640px]`}>
              <CinematicHeroMedia still={config.heroImage} alt={config.heroAlt} />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/18 via-transparent to-transparent" aria-hidden="true" />
            </MarketingReveal>
          </div>
        </section>

        {config.sections.map((section, index) => {
          const storyVariant = isHome ? (["closet", "stylist", "studio"] as MarketingStoryVariant[])[index] : undefined;
          return (
            <section key={`${config.slug}-${section.eyebrow}`} className={`${toneClasses(section.tone)} px-5 py-20 sm:px-8 lg:px-12 lg:py-28`}>
              <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2 lg:gap-20">
                <MarketingReveal className={index % 2 ? "lg:order-2" : ""}>
                  <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-sage">{section.eyebrow}</p>
                  <h2 className="mt-5 max-w-2xl font-editorial text-4xl font-semibold leading-[1.02] tracking-editorial sm:text-6xl">{section.title}</h2>
                  <p className="mt-6 max-w-xl text-base leading-7 text-muted sm:text-lg sm:leading-8">{section.body}</p>
                  {section.bullets ? (
                    <ul className="mt-8 grid gap-3">
                      {section.bullets.map((bullet) => <li key={bullet} className="flex items-center gap-3 text-sm font-semibold text-ink"><span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-sage/10 text-sage"><Check size={14} aria-hidden="true" /></span>{bullet}</li>)}
                    </ul>
                  ) : null}
                </MarketingReveal>
                <MarketingReveal delay={0.08} className={index % 2 ? "lg:order-1" : ""}>
                  <div className={storyVariant ? "relative overflow-hidden rounded-[28px] border border-line bg-white shadow-soft lg:aspect-[4/3]" : "relative aspect-[4/3] overflow-hidden rounded-[28px] border border-line bg-white shadow-soft"}>
                    {storyVariant ? <MarketingProductStoryVisual variant={storyVariant} /> : <Image src={section.image} alt={section.imageAlt} fill sizes="(max-width: 1023px) 92vw, 48vw" className="object-cover" />}
                  </div>
                </MarketingReveal>
              </div>
            </section>
          );
        })}

        {config.principles ? (
          <section className="bg-canvas px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
            <div className="mx-auto max-w-7xl">
              <MarketingReveal className="max-w-3xl"><p className="text-[11px] font-bold uppercase tracking-[0.28em] text-sage">DESIGNED AROUND YOUR WARDROBE</p><h2 className="mt-5 font-editorial text-4xl font-semibold tracking-editorial sm:text-6xl">Three principles. No invented promises.</h2></MarketingReveal>
              <div className="mt-12 grid gap-5 md:grid-cols-3">{config.principles.map((item, index) => <MarketingReveal key={item.title} delay={index * 0.06} className="rounded-[24px] border border-line bg-white p-7 shadow-soft"><Sparkles className="text-sage" size={21} aria-hidden="true" /><h3 className="mt-7 font-editorial text-2xl font-semibold">{item.title}</h3><p className="mt-3 text-sm leading-6 text-muted">{item.body}</p></MarketingReveal>)}</div>
            </div>
          </section>
        ) : null}

        {config.faqs ? (
          <section className="bg-surfaceWarm px-5 py-20 text-ink sm:px-8 lg:px-12 lg:py-28">
            <div className="mx-auto max-w-3xl"><MarketingReveal><p className="text-[11px] font-bold uppercase tracking-[0.28em] text-sage">USEFUL DETAILS</p><h2 className="mt-5 font-editorial text-4xl font-semibold sm:text-6xl">Clear answers before you begin.</h2></MarketingReveal><div className="mt-10 divide-y divide-line border-y border-line">{config.faqs.map((faq) => <details key={faq.question} className="group"><summary className="focus-ring flex min-h-16 cursor-pointer list-none items-center justify-between gap-5 rounded-lg py-5 text-base font-bold sm:text-lg">{faq.question}<span className="text-2xl font-normal text-sage transition group-open:rotate-45" aria-hidden="true">+</span></summary><p className="max-w-2xl pb-6 pr-10 text-sm leading-7 text-muted sm:text-base">{faq.answer}</p></details>)}</div></div>
          </section>
        ) : null}

        <section className="bg-sage px-5 py-20 text-center text-white sm:px-8 lg:py-28">
          <MarketingReveal className="mx-auto max-w-4xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-white/72">START WITH WHAT YOU OWN</p>
            <h2 className="mt-6 font-editorial text-5xl font-semibold leading-[0.98] tracking-editorial sm:text-7xl">Your next outfit may already be in your closet.</h2>
            <Link href={primaryHref} className="focus-ring mt-9 inline-flex min-h-14 items-center justify-center gap-2 rounded-xl bg-white px-8 font-bold text-ink shadow-soft transition hover:-translate-y-0.5 hover:bg-canvas">{config.primaryLabel}<ArrowRight size={17} aria-hidden="true" /></Link>
          </MarketingReveal>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
