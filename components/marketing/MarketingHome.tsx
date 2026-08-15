import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Camera,
  Check,
  CloudSun,
  Footprints,
  Handbag,
  Play,
  Shirt,
  Sparkles
} from "lucide-react";
import { PublicNavigation } from "@/components/marketing/PublicNavigation";

const publicLinks = {
  privacy: "/legal/privacy",
  terms: "/legal/terms",
  ai: "/legal/ai-virtual-try-on-disclosure",
  credits: "/legal/subscription-and-credits-policy",
  deletion: "/legal/privacy",
  support: "mailto:support@myfitpick.com"
};

function Eyebrow({ children, tone = "cocoa" }: { children: React.ReactNode; tone?: "cocoa" | "light" }) {
  return (
    <p className={`text-[11px] font-bold uppercase tracking-[0.28em] ${tone === "light" ? "text-olive" : "text-cocoa"}`}>
      {children}
    </p>
  );
}

function HeroDemo() {
  return (
    <div className="relative mx-auto w-full max-w-[620px] lg:ml-auto">
      <div className="relative aspect-[4/5] overflow-hidden rounded-[32px] border border-line bg-white p-3 shadow-lift sm:rounded-[40px] sm:p-4">
        <div className="relative h-full overflow-hidden rounded-[24px] bg-canvasSubtle sm:rounded-[30px]">
          <Image
            src="/fashion/editorial-blue-blouse-canonical-v1.png"
            alt="A complete outfit styled by MyFitPick"
            fill
            priority
            sizes="(max-width: 1023px) 92vw, 560px"
            className="object-cover"
          />
          <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-ink/35 to-transparent" />
          <div className="absolute left-4 right-4 top-4 rounded-2xl border border-white/25 bg-white/92 p-4 text-left shadow-card backdrop-blur sm:left-6 sm:right-auto sm:top-6 sm:max-w-[330px]">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-cocoa">Your request</p>
            <p className="mt-2 text-sm font-semibold leading-5 text-ink sm:text-base">Dinner by the coast. Polished, but relaxed.</p>
          </div>
          <div className="absolute bottom-4 left-4 right-4 rounded-2xl border border-white/25 bg-espresso/92 p-4 text-left text-white shadow-card backdrop-blur sm:bottom-6 sm:left-6 sm:right-6 sm:p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-olive">Complete look</p>
                <p className="mt-1 text-sm font-semibold sm:text-base">Clothes, shoes and finishing pieces</p>
              </div>
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-espresso">
                <Sparkles size={18} aria-hidden="true" />
              </span>
            </div>
          </div>
        </div>
      </div>

      <Link href="#complete-look" className="focus-ring absolute -bottom-5 -left-1 flex items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3 shadow-card transition hover:-translate-y-0.5 sm:-left-8 sm:bottom-10">
        <span className="flex size-9 items-center justify-center rounded-xl bg-cocoa/10 text-cocoa"><Play size={16} fill="currentColor" aria-hidden="true" /></span>
        <div className="text-left"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-cocoa">See it work</p><p className="text-xs font-semibold text-ink">Styling demo</p></div>
      </Link>
    </div>
  );
}

function CompleteLookProof() {
  return (
    <div className="grid auto-rows-[150px] grid-cols-2 gap-3 sm:auto-rows-[190px] sm:grid-cols-3">
      <div className="group relative col-span-2 row-span-2 overflow-hidden rounded-[22px] border border-line bg-white">
        <Image src="/fashion/product-blue-blouse.webp" alt="A coordinated outfit with blouse, trousers, heels and handbag" fill sizes="(max-width: 639px) 92vw, 440px" className="object-cover transition duration-500 group-hover:scale-[1.02]" />
        <span className="absolute bottom-3 left-3 rounded-full bg-white/92 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-ink shadow-soft">Complete outfit</span>
      </div>
      <div className="group relative overflow-hidden rounded-[22px] border border-line bg-white">
        <Image src="/fashion/product-blush-bag.webp" alt="Light blue blouse" fill sizes="(max-width: 639px) 45vw, 220px" className="object-cover transition duration-500 group-hover:scale-[1.02]" />
        <span className="absolute bottom-3 left-3 rounded-full bg-white/92 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-ink shadow-soft">Blouse</span>
      </div>
      <div className="group relative overflow-hidden rounded-[22px] border border-line bg-white">
        <Image src="/fashion/product-espresso-boots.webp" alt="Blush structured handbag" fill sizes="(max-width: 639px) 45vw, 220px" className="object-cover transition duration-500 group-hover:scale-[1.02]" />
        <span className="absolute bottom-3 left-3 rounded-full bg-white/92 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-ink shadow-soft">Bag</span>
      </div>
      <div className="flex flex-col justify-between rounded-[22px] border border-line bg-canvas p-5 text-ink sm:p-6">
        <Footprints className="text-cocoa" size={22} aria-hidden="true" />
        <div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">Footwear</p><p className="mt-2 text-sm font-semibold leading-5">Chosen for the occasion.</p></div>
      </div>
      <div className="col-span-1 flex flex-col justify-between rounded-[22px] bg-cocoa p-5 text-white sm:col-span-2 sm:p-6">
        <Sparkles className="text-olive" size={22} aria-hidden="true" />
        <div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/65">Stylist&apos;s note</p><p className="mt-2 text-sm font-semibold leading-5">Balanced color, proportion and finish.</p></div>
      </div>
    </div>
  );
}

export function MarketingHome({ signedIn }: { signedIn: boolean }) {
  const primaryHref = signedIn ? "/home" : "/register";
  const primaryLabel = signedIn ? "Open MyFitPick" : "Style my closet";

  return (
    <div className="min-h-screen overflow-x-clip bg-canvas text-ink">
      <PublicNavigation signedIn={signedIn} />

      <main id="main-content">
        <section className="px-4 pb-24 pt-16 sm:px-6 sm:pt-20 lg:px-8 lg:pb-32 lg:pt-24">
          <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[0.93fr_1.07fr] lg:gap-20">
            <div>
              <Eyebrow>Your personal stylist</Eyebrow>
              <h1 className="mt-6 max-w-3xl font-editorial text-5xl font-semibold leading-[0.96] tracking-editorial sm:text-6xl lg:text-[78px]">
                Know what to wear, <span className="italic text-cocoa">using what you already own.</span>
              </h1>
              <p className="mt-7 max-w-xl text-base leading-7 text-muted sm:text-xl sm:leading-8">
                MyFitPick creates complete outfits from your wardrobe for the occasion, weather and way you want to feel.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link href={primaryHref} className="focus-ring inline-flex min-h-14 items-center justify-center rounded-2xl bg-cocoa px-8 text-base font-bold text-white shadow-card transition hover:-translate-y-0.5 hover:bg-espresso">
                  {primaryLabel}
                </Link>
                <Link href="#how-it-works" className="focus-ring inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-line bg-white px-8 text-base font-bold text-ink transition hover:-translate-y-0.5 hover:border-cocoa/35">
                  See how it works <ArrowRight size={17} aria-hidden="true" />
                </Link>
              </div>
            </div>
            <HeroDemo />
          </div>
        </section>

        <section className="border-y border-line bg-white/65 px-4 py-7 sm:px-6" aria-label="What MyFitPick considers">
          <div className="mx-auto grid max-w-7xl gap-5 sm:grid-cols-3 sm:divide-x sm:divide-line">
            {[
              [Shirt, "Your wardrobe", "Styles the pieces you own"],
              [CloudSun, "Your context", "Considers occasion and weather"],
              [Footprints, "The whole look", "Includes shoes and accessories"]
            ].map(([Icon, title, copy], index) => {
              const ProofIcon = Icon as typeof Shirt;
              return (
                <div key={title as string} className={`flex items-center gap-4 ${index ? "sm:pl-7" : ""}`}>
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-cocoa/10 text-cocoa"><ProofIcon size={19} aria-hidden="true" /></span>
                  <div><p className="text-sm font-bold text-ink">{title as string}</p><p className="mt-1 text-xs leading-5 text-muted">{copy as string}</p></div>
                </div>
              );
            })}
          </div>
        </section>

        <section id="ways-to-start" className="scroll-mt-24 px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl">
              <Eyebrow>Two ways to begin</Eyebrow>
              <h2 className="mt-5 font-editorial text-4xl font-semibold leading-[1.02] tracking-editorial sm:text-5xl lg:text-6xl">Start with a moment—or a piece you love.</h2>
            </div>
            <div className="mt-12 grid gap-5 lg:grid-cols-2">
              <article className="relative min-h-[420px] overflow-hidden rounded-[32px] bg-espresso p-7 text-white shadow-card sm:p-10">
                <Image src="/fashion/editorial-male-teal-canonical-v1.png" alt="A smart outfit for an occasion" fill sizes="(max-width: 1023px) 92vw, 610px" className="object-cover opacity-48" />
                <div className="absolute inset-0 bg-gradient-to-t from-espresso via-espresso/55 to-transparent" />
                <div className="relative flex h-full min-h-[350px] flex-col justify-between">
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-white/14 backdrop-blur"><CalendarDays size={23} aria-hidden="true" /></span>
                  <div><p className="text-[11px] font-bold uppercase tracking-[0.24em] text-olive">Create a Look</p><h3 className="mt-4 max-w-md font-editorial text-4xl font-semibold tracking-editorial">Tell us where you&apos;re going.</h3><p className="mt-4 max-w-md text-sm leading-6 text-white/78 sm:text-base">Describe the occasion, mood or dress code.</p></div>
                </div>
              </article>
              <article className="relative min-h-[420px] overflow-hidden rounded-[32px] border border-line bg-white p-7 shadow-card sm:p-10">
                <Image src="/fashion/product-male-overshirt.webp" alt="An inspiration piece for Match an Outfit" fill sizes="(max-width: 1023px) 92vw, 610px" className="object-cover opacity-38" />
                <div className="absolute inset-0 bg-gradient-to-t from-white via-white/72 to-white/10" />
                <div className="relative flex h-full min-h-[350px] flex-col justify-between">
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-cocoa text-white shadow-soft"><Camera size={23} aria-hidden="true" /></span>
                  <div><p className="text-[11px] font-bold uppercase tracking-[0.24em] text-cocoa">Match an Outfit</p><h3 className="mt-4 max-w-md font-editorial text-4xl font-semibold tracking-editorial">Show us what inspired you.</h3><p className="mt-4 max-w-md text-sm leading-6 text-muted sm:text-base">Upload any item or inspiration photo; it does not need to be in your closet.</p></div>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section id="complete-look" className="scroll-mt-24 border-y border-line bg-white/60 px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20">
            <CompleteLookProof />
            <div>
              <Eyebrow>One coordinated answer</Eyebrow>
              <h2 className="mt-5 font-editorial text-4xl font-semibold leading-[1.02] tracking-editorial sm:text-5xl lg:text-6xl">A complete look, down to the details.</h2>
              <p className="mt-6 max-w-xl text-base leading-7 text-muted sm:text-lg sm:leading-8">The recommendation brings the main garments, footwear and finishing pieces together—then explains why the combination works.</p>
              <ul className="mt-7 space-y-3 text-sm font-semibold text-ink sm:text-base">
                {["Outfit structure is checked", "Shoes are part of the recommendation", "Available bags and accessories complete the look"].map((item) => <li key={item} className="flex items-center gap-3"><span className="flex size-6 items-center justify-center rounded-full bg-cocoa/10 text-cocoa"><Check size={14} strokeWidth={2.6} aria-hidden="true" /></span>{item}</li>)}
              </ul>
              <div className="mt-9 flex items-start gap-4 border-t border-line pt-7">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-espresso text-olive"><Sparkles size={20} aria-hidden="true" /></span>
                <div><p className="font-bold text-ink">Want a visual check?</p><p className="mt-1 text-sm leading-6 text-muted">Virtual Try-On is an optional AI styling preview, not a guarantee of physical fit or tailoring.</p></div>
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-24 px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-7xl">
            <div className="text-center"><Eyebrow>How it works</Eyebrow><h2 className="mx-auto mt-5 max-w-3xl font-editorial text-4xl font-semibold tracking-editorial sm:text-5xl">Three steps from closet to outfit.</h2></div>
            <ol className="mt-12 grid gap-px overflow-hidden rounded-[30px] border border-line bg-line md:grid-cols-3">
              {[
                ["01", "Add your wardrobe", "Photograph the pieces you want MyFitPick to understand."],
                ["02", "Share what you need", "Describe the moment or upload an inspiration image."],
                ["03", "Receive your look", "Review the complete recommendation and its styling reasoning."]
              ].map(([number, title, copy]) => <li key={number} className="min-h-64 bg-white p-7 sm:p-9"><span className="font-editorial text-3xl italic text-cocoa">{number}</span><h3 className="mt-16 text-lg font-bold text-ink">{title}</h3><p className="mt-3 text-sm leading-6 text-muted">{copy}</p></li>)}
            </ol>
          </div>
        </section>

        <section id="faq" className="scroll-mt-24 border-y border-line bg-white/65 px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:gap-16">
            <div><Eyebrow>Before you begin</Eyebrow><h2 className="mt-5 font-editorial text-4xl font-semibold tracking-editorial sm:text-5xl">The useful details.</h2></div>
            <div className="divide-y divide-line border-y border-line">
              {[
                ["Does Match require the photographed item to be in my closet?", "No. MyFitPick can use an outside item as inspiration and build the rest of the outfit from your saved wardrobe."],
                ["When are Credits used?", "Selected premium AI actions may require Credits. MyFitPick identifies a Credit-using action before you choose it."],
                ["How is wardrobe data handled?", "Wardrobe photos and account information are handled according to MyFitPick's published privacy controls."]
              ].map(([question, answer]) => <details key={question} className="group"><summary className="focus-ring flex min-h-16 cursor-pointer list-none items-center justify-between gap-5 rounded-xl py-5 text-left text-base font-bold text-ink sm:text-lg">{question}<span className="text-2xl font-normal text-cocoa transition group-open:rotate-45" aria-hidden="true">+</span></summary><p className="max-w-2xl pb-6 pr-10 text-sm leading-7 text-muted sm:text-base">{answer}</p></details>)}
            </div>
          </div>
        </section>

        <section className="px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-7xl overflow-hidden rounded-[36px] bg-cocoa px-6 py-14 text-center text-white shadow-lift sm:px-10 lg:py-20">
            <Handbag className="mx-auto text-olive" size={29} aria-hidden="true" />
            <h2 className="mx-auto mt-6 max-w-4xl font-editorial text-4xl font-semibold leading-[0.98] tracking-editorial sm:text-5xl lg:text-7xl">Your next outfit is already in your closet.</h2>
            <Link href={primaryHref} className="focus-ring mt-9 inline-flex min-h-14 items-center justify-center rounded-2xl bg-white px-9 font-bold text-cocoa shadow-card transition hover:-translate-y-0.5 hover:text-espresso">{primaryLabel}</Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-line bg-espresso px-4 pb-[calc(2rem+var(--safe-bottom))] pt-12 text-white sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-10 md:flex-row md:items-start">
          <div><p className="font-editorial text-2xl font-semibold italic">MyFitPick</p><p className="mt-3 max-w-sm text-sm leading-6 text-white/58">Personal styling centered on the wardrobe you own.</p></div>
          <nav className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm font-semibold text-white/65 sm:grid-cols-4" aria-label="Footer navigation">
            <Link className="focus-ring rounded-lg py-1 hover:text-white" href={publicLinks.privacy}>Privacy</Link><Link className="focus-ring rounded-lg py-1 hover:text-white" href={publicLinks.terms}>Terms</Link><Link className="focus-ring rounded-lg py-1 hover:text-white" href={publicLinks.ai}>AI disclosure</Link><Link className="focus-ring rounded-lg py-1 hover:text-white" href={publicLinks.credits}>Credits</Link><Link className="focus-ring rounded-lg py-1 hover:text-white" href={publicLinks.deletion}>Delete account</Link><a className="focus-ring rounded-lg py-1 hover:text-white" href={publicLinks.support}>Support</a>
          </nav>
        </div>
        <div className="mx-auto mt-10 max-w-7xl border-t border-white/10 pt-6 text-xs font-semibold text-white/40">© {new Date().getFullYear()} MyFitPick</div>
      </footer>
    </div>
  );
}
