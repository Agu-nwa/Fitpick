import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  CloudSun,
  ImagePlus,
  Layers3,
  LockKeyhole,
  Sparkles,
  WandSparkles
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

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-bold uppercase tracking-[0.26em] text-cocoa">{children}</p>;
}

function FeatureCheck({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-3 text-sm leading-6 text-muted sm:text-base">
      <span className="mt-1 flex size-5 shrink-0 items-center justify-center rounded-full bg-cocoa/12 text-cocoa">
        <Check size={13} strokeWidth={2.5} aria-hidden="true" />
      </span>
      <span>{children}</span>
    </li>
  );
}

function WardrobePipeline() {
  return (
    <div className="relative mx-auto grid w-full max-w-6xl gap-4 md:grid-cols-[minmax(0,0.85fr)_56px_minmax(0,1fr)_56px_minmax(0,0.85fr)] md:items-center">
      <article className="overflow-hidden rounded-[28px] border border-line bg-white p-3 shadow-card">
        <div className="relative aspect-[4/5] overflow-hidden rounded-[20px] bg-canvasSubtle">
          <Image src="/fashion/product-blush-bag.webp" alt="A light blue blouse from a digital wardrobe" fill priority sizes="(max-width: 767px) 90vw, 250px" className="object-cover" />
          <div className="absolute bottom-3 left-3 rounded-full bg-white/94 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-ink shadow-soft">Your wardrobe</div>
        </div>
        <div className="mt-3 flex items-center justify-between px-1">
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-muted">Input</span>
          <span className="text-xs font-semibold text-ink">Pieces you own</span>
        </div>
      </article>

      <ArrowRight className="mx-auto hidden text-line md:block" size={28} aria-hidden="true" />
      <article className="flex min-h-64 flex-col items-center justify-center rounded-[32px] border border-cocoa/20 bg-cocoa/[0.07] p-8 text-center shadow-inner md:aspect-square">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-cocoa text-white shadow-glow">
          <Sparkles size={26} aria-hidden="true" />
        </span>
        <p className="mt-6 font-editorial text-2xl font-semibold tracking-editorial text-ink">Styling intelligence</p>
        <p className="mt-3 max-w-xs text-sm leading-6 text-muted">Coordinates color, silhouette, occasion, weather, footwear, and finishing pieces.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2" aria-label="Styling considerations">
          {['Occasion', 'Weather', 'Preference'].map((label) => <span key={label} className="rounded-full border border-cocoa/20 bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-cocoa">{label}</span>)}
        </div>
      </article>

      <ArrowRight className="mx-auto hidden text-line md:block" size={28} aria-hidden="true" />
      <article className="overflow-hidden rounded-[28px] border-2 border-cocoa/45 bg-white p-3 shadow-lift">
        <div className="relative aspect-[4/5] overflow-hidden rounded-[20px] bg-canvasSubtle">
          <Image src="/fashion/editorial-blue-blouse.webp" alt="A complete styled outfit shown as a Virtual Try-On preview" fill priority sizes="(max-width: 767px) 90vw, 250px" className="object-cover" />
          <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-cocoa px-3 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-white shadow-soft">
            <Sparkles size={13} aria-hidden="true" />
            Preview
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between px-1">
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-muted">Output</span>
          <span className="text-xs font-semibold text-ink">Complete look</span>
        </div>
      </article>
    </div>
  );
}

export function MarketingHome({ signedIn }: { signedIn: boolean }) {
  const primaryHref = signedIn ? "/home" : "/register";
  const primaryLabel = signedIn ? "Open MyFitPick" : "Get Started";

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <PublicNavigation signedIn={signedIn} />

      <main id="main-content">
        <section className="overflow-hidden px-4 pb-20 pt-16 sm:px-6 sm:pt-20 lg:px-8 lg:pb-28 lg:pt-24">
          <div className="mx-auto max-w-7xl text-center">
            <Eyebrow>Personal styling</Eyebrow>
            <h1 className="mx-auto mt-6 max-w-5xl font-editorial text-5xl font-semibold leading-[0.94] tracking-editorial text-ink sm:text-6xl lg:text-[88px]">
              Your closet.<br /><span className="italic">Styled intelligently.</span>
            </h1>
            <p className="mx-auto mt-7 max-w-2xl text-base leading-7 text-muted sm:text-xl sm:leading-8">
              An AI-powered personal stylist that turns the clothes you already own into complete outfits.
            </p>
            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href={primaryHref} className="focus-ring inline-flex min-h-14 items-center justify-center rounded-2xl bg-cocoa px-10 text-base font-bold text-white shadow-card transition hover:-translate-y-0.5 hover:bg-espresso">
                {primaryLabel}
              </Link>
              {!signedIn ? (
                <Link href="/login" className="focus-ring inline-flex min-h-14 items-center justify-center rounded-2xl border border-line bg-white px-10 text-base font-bold text-ink transition hover:-translate-y-0.5 hover:border-cocoa/35">
                  Sign In
                </Link>
              ) : null}
            </div>

            <div className="mt-16 lg:mt-24">
              <WardrobePipeline />
            </div>
          </div>
        </section>

        <section className="border-y border-line bg-white/68 px-4 py-6 sm:px-6" aria-label="MyFitPick value equation">
          <p className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-4 gap-y-2 text-center font-editorial text-xl font-semibold tracking-editorial text-ink sm:text-2xl">
            <span>Your wardrobe</span><span className="text-cocoa" aria-hidden="true">+</span><span>Styling intelligence</span><span className="text-cocoa" aria-hidden="true">+</span><span>Visual try-on</span>
          </p>
        </section>

        <section id="features" className="scroll-mt-24 px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-7xl space-y-24 lg:space-y-32">
            <article className="grid gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:gap-16">
              <div className="relative mx-auto w-full max-w-xl">
                <div className="relative aspect-[4/5] overflow-hidden rounded-[36px] border border-line bg-white shadow-lift">
                  <Image src="/fashion/editorial-male-teal.webp" alt="A complete smart-casual outfit styled by MyFitPick" fill sizes="(max-width: 1023px) 90vw, 520px" className="object-cover" />
                </div>
                <div className="absolute -bottom-5 right-3 rounded-[22px] border border-line bg-white/96 p-4 shadow-card sm:right-8">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-cocoa/10 text-cocoa"><CloudSun size={19} aria-hidden="true" /></span>
                    <div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-cocoa">Context</p><p className="mt-1 text-sm font-bold text-ink">Warm-day dinner</p></div>
                  </div>
                </div>
              </div>
              <div>
                <Eyebrow>Create a Look</Eyebrow>
                <h2 className="mt-5 max-w-2xl font-editorial text-4xl font-semibold leading-[1.02] tracking-editorial sm:text-5xl lg:text-6xl">Tell MyFitPick where you&apos;re going.</h2>
                <p className="mt-6 max-w-xl text-base leading-7 text-muted sm:text-lg sm:leading-8">Share an occasion, mood, or weather. MyFitPick searches your saved wardrobe and coordinates a complete look—including the shoes and accessories that finish it.</p>
                <ul className="mt-7 space-y-3">
                  <FeatureCheck>Builds around your wardrobe, preferences, and request.</FeatureCheck>
                  <FeatureCheck>Checks outfit structure, footwear, and finishing pieces.</FeatureCheck>
                </ul>
              </div>
            </article>

            <article className="grid gap-10 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:gap-16">
              <div className="lg:order-2">
                <div className="grid grid-cols-2 gap-3 rounded-[36px] border border-line bg-white p-3 shadow-lift sm:p-4">
                  <div className="relative col-span-2 aspect-[16/9] overflow-hidden rounded-[26px] bg-canvasSubtle sm:col-span-1 sm:aspect-[4/5]">
                    <Image src="/fashion/product-male-overshirt.webp" alt="An inspiration overshirt uploaded to Match an Outfit" fill sizes="(max-width: 1023px) 86vw, 280px" className="object-cover" />
                    <span className="absolute left-3 top-3 rounded-full bg-espresso px-3 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-white">Inspiration</span>
                  </div>
                  <div className="relative col-span-2 aspect-[16/9] overflow-hidden rounded-[26px] bg-canvasSubtle sm:col-span-1 sm:aspect-[4/5]">
                    <Image src="/fashion/editorial-male-teal.webp" alt="A complete outfit built around the inspiration piece" fill sizes="(max-width: 1023px) 86vw, 280px" className="object-cover" />
                    <span className="absolute bottom-3 left-3 rounded-full bg-white/95 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-cocoa">Closet match</span>
                  </div>
                </div>
              </div>
              <div className="lg:order-1">
                <Eyebrow>Match an Outfit</Eyebrow>
                <h2 className="mt-5 max-w-2xl font-editorial text-4xl font-semibold leading-[1.02] tracking-editorial sm:text-5xl lg:text-6xl">Style a piece you admire with what you own.</h2>
                <p className="mt-6 max-w-xl text-base leading-7 text-muted sm:text-lg sm:leading-8">Upload a piece or inspiration photo. It does not need to already be in your closet. MyFitPick treats it as the focal point, then builds the rest of the look from your saved wardrobe.</p>
                <div className="mt-7 rounded-[24px] border border-cocoa/20 bg-cocoa/[0.07] p-5">
                  <p className="flex items-start gap-3 text-sm font-semibold leading-6 text-ink sm:text-base">
                    <ImagePlus className="mt-0.5 shrink-0 text-cocoa" size={21} aria-hidden="true" />
                    Photograph something in a shop, online, or in front of you—then discover how it works with your closet.
                  </p>
                </div>
              </div>
            </article>

            <article id="virtual-try-on" className="scroll-mt-24 overflow-hidden rounded-[40px] border border-line bg-espresso text-white shadow-lift">
              <div className="grid lg:grid-cols-[0.9fr_1.1fr] lg:items-stretch">
                <div className="flex flex-col justify-center p-7 sm:p-10 lg:p-14">
                  <p className="text-[11px] font-bold uppercase tracking-[0.26em] text-olive">Virtual Try-On</p>
                  <h2 className="mt-5 font-editorial text-4xl font-semibold leading-[1.02] tracking-editorial sm:text-5xl">See the composition before you wear it.</h2>
                  <p className="mt-6 max-w-lg text-base leading-7 text-white/75 sm:text-lg">Preview how a complete look comes together on your selected Studio Model when a visual check would help.</p>
                  <p className="mt-6 rounded-2xl border border-white/15 bg-white/[0.07] p-4 text-sm leading-6 text-white/72">Virtual Try-On is an AI-generated styling preview. It is not a guarantee of physical fit, sizing, or tailoring.</p>
                </div>
                <div className="relative min-h-[480px] bg-canvasSubtle sm:min-h-[620px]">
                  <Image src="/fashion/editorial-blue-blouse.webp" alt="Virtual Try-On styling preview of a complete outfit" fill sizes="(max-width: 1023px) 100vw, 620px" className="object-cover" />
                  <div className="absolute bottom-5 left-5 rounded-full bg-white/95 px-4 py-2 text-xs font-bold text-ink shadow-card">Styling preview</div>
                </div>
              </div>
            </article>
          </div>
        </section>

        <section className="border-y border-line bg-white/60 px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
          <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-2">
            <article className="rounded-[32px] border border-line bg-white p-6 shadow-soft sm:p-8 lg:p-10">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-cocoa/10 text-cocoa"><Layers3 size={23} aria-hidden="true" /></span>
              <h2 className="mt-8 font-editorial text-3xl font-semibold tracking-editorial sm:text-4xl">A digital closet that understands the details.</h2>
              <p className="mt-5 text-base leading-7 text-muted">MyFitPick looks beyond a folder of photos. Garment type, color, fabric, silhouette, footwear, and accessories give the stylist useful structure for building complete looks.</p>
              <div className="mt-7 flex flex-wrap gap-2" aria-label="Digital closet attributes">
                {['Garments', 'Colors', 'Fabrics', 'Silhouettes', 'Footwear', 'Accessories'].map((item) => <span key={item} className="rounded-full border border-line bg-canvas px-3 py-2 text-xs font-bold text-muted">{item}</span>)}
              </div>
            </article>
            <article className="rounded-[32px] border border-line bg-canvasSubtle p-6 sm:p-8 lg:p-10">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-olive/25 text-espresso"><WandSparkles size={23} aria-hidden="true" /></span>
              <h2 className="mt-8 font-editorial text-3xl font-semibold tracking-editorial sm:text-4xl">Personalized to the life you actually dress for.</h2>
              <p className="mt-5 text-base leading-7 text-muted">Recommendations can account for the occasion, available weather context, preferences you have stated, and feedback you share—so the reasoning starts with you, not a product catalog.</p>
              <ul className="mt-7 grid gap-3 sm:grid-cols-2">
                <FeatureCheck>Occasion and dress code</FeatureCheck><FeatureCheck>Available weather context</FeatureCheck><FeatureCheck>Style preferences</FeatureCheck><FeatureCheck>Your feedback</FeatureCheck>
              </ul>
            </article>
          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-24 px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-7xl">
            <Eyebrow>How it works</Eyebrow>
            <h2 className="mt-5 max-w-3xl font-editorial text-4xl font-semibold leading-[1.02] tracking-editorial sm:text-5xl lg:text-6xl">From wardrobe photos to a look you can wear.</h2>
            <ol className="mt-12 grid gap-px overflow-hidden rounded-[32px] border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
              {[
                ['01', 'Add your wardrobe', 'Photograph the pieces you want MyFitPick to understand.'],
                ['02', 'Tell MyFitPick what you need', 'Share an occasion, mood, weather, or inspiration piece.'],
                ['03', 'Receive a complete outfit', 'Get a coordinated look using your saved wardrobe.'],
                ['04', 'Preview it when useful', 'Choose Virtual Try-On when a visual preview would help.']
              ].map(([number, title, copy]) => (
                <li key={number} className="min-h-64 bg-white p-6 sm:p-8">
                  <span className="font-editorial text-2xl italic text-cocoa">{number}</span>
                  <h3 className="mt-14 text-lg font-bold text-ink">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted">{copy}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="px-4 pb-20 sm:px-6 lg:px-8 lg:pb-28">
          <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[1.15fr_0.85fr]">
            <article className="rounded-[34px] border border-line bg-white p-6 shadow-soft sm:p-8 lg:p-10">
              <LockKeyhole className="text-cocoa" size={27} aria-hidden="true" />
              <h2 className="mt-8 font-editorial text-3xl font-semibold tracking-editorial sm:text-4xl">Clear controls for wardrobe and account data.</h2>
              <p className="mt-5 max-w-2xl text-base leading-7 text-muted">Wardrobe photos and account information are handled according to MyFitPick&apos;s published privacy controls.</p>
              <Link href={publicLinks.privacy} className="focus-ring mt-7 inline-flex min-h-11 items-center gap-2 rounded-xl font-bold text-cocoa transition hover:text-espresso">
                Read the Privacy Policy <ArrowRight size={17} aria-hidden="true" />
              </Link>
            </article>
            <article className="rounded-[34px] border border-line bg-canvasSubtle p-6 sm:p-8 lg:p-10">
              <Sparkles className="text-espresso" size={27} aria-hidden="true" />
              <h2 className="mt-8 font-editorial text-3xl font-semibold tracking-editorial sm:text-4xl">Credits keep premium AI actions clear.</h2>
              <p className="mt-5 text-base leading-7 text-muted">Selected premium AI operations may use Credits. MyFitPick shows when an action requires Credits before you choose it.</p>
              <Link href={publicLinks.credits} className="focus-ring mt-7 inline-flex min-h-11 items-center gap-2 rounded-xl font-bold text-cocoa transition hover:text-espresso">
                Learn how Credits work <ArrowRight size={17} aria-hidden="true" />
              </Link>
            </article>
          </div>
        </section>

        <section id="faq" className="scroll-mt-24 border-y border-line bg-white/65 px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:gap-16">
            <div><Eyebrow>FAQ</Eyebrow><h2 className="mt-5 font-editorial text-4xl font-semibold tracking-editorial sm:text-5xl">A few useful answers.</h2></div>
            <div className="divide-y divide-line border-y border-line">
              {[
                ['What is MyFitPick?', 'MyFitPick is an AI-powered personal styling system centered on the wardrobe you already own. It is not a marketplace, generic chatbot, closet organizer, or general-purpose image generator.'],
                ['Does Match require the photographed item to be in my closet?', 'No. The uploaded piece or inspiration photo can be outside your closet. MyFitPick uses it as the focal point and builds the rest of the look from your saved wardrobe.'],
                ['What does Virtual Try-On mean?', 'It is an AI-generated styling preview that helps you see a look as a composition. It does not guarantee physical fit, size, or tailoring.'],
                ['How do Credits work?', 'Some premium AI actions may require Credits. The product identifies a Credit-using action before you choose it, and the published Credits policy explains the rules.']
              ].map(([question, answer], index) => (
                <details key={question} className="group" open={index === 0}>
                  <summary className="focus-ring flex min-h-16 cursor-pointer list-none items-center justify-between gap-5 rounded-xl py-5 text-left text-base font-bold text-ink sm:text-lg">
                    {question}<span className="text-2xl font-normal text-cocoa transition group-open:rotate-45" aria-hidden="true">+</span>
                  </summary>
                  <p className="max-w-2xl pb-6 pr-10 text-sm leading-7 text-muted sm:text-base">{answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-7xl overflow-hidden rounded-[40px] bg-cocoa px-6 py-14 text-center text-white shadow-lift sm:px-10 sm:py-18 lg:py-20">
            <Sparkles className="mx-auto text-olive" size={29} aria-hidden="true" />
            <h2 className="mx-auto mt-6 max-w-4xl font-editorial text-4xl font-semibold leading-[0.98] tracking-editorial sm:text-5xl lg:text-7xl">Wear more of what you own.</h2>
            <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-white/78">Turn your wardrobe into complete looks for the moments that matter.</p>
            <Link href={primaryHref} className="focus-ring mt-9 inline-flex min-h-14 items-center justify-center rounded-2xl bg-white px-9 font-bold text-cocoa shadow-card transition hover:-translate-y-0.5 hover:text-espresso">
              {primaryLabel}
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-line bg-white/58 px-4 pb-[calc(2rem+var(--safe-bottom))] pt-12 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[1fr_1.4fr] md:items-start">
          <div>
            <p className="font-editorial text-2xl font-semibold italic text-ink">MyFitPick</p>
            <p className="mt-4 max-w-sm text-sm leading-6 text-muted">An AI-powered personal stylist for the wardrobe you already own.</p>
          </div>
          <nav className="grid grid-cols-2 gap-x-5 gap-y-3 text-sm font-semibold text-muted sm:grid-cols-3" aria-label="Footer navigation">
            <Link className="focus-ring rounded-lg py-1 hover:text-ink" href={publicLinks.privacy}>Privacy</Link>
            <Link className="focus-ring rounded-lg py-1 hover:text-ink" href={publicLinks.terms}>Terms</Link>
            <Link className="focus-ring rounded-lg py-1 hover:text-ink" href={publicLinks.ai}>AI &amp; Virtual Try-On</Link>
            <Link className="focus-ring rounded-lg py-1 hover:text-ink" href={publicLinks.credits}>Credits &amp; Refunds</Link>
            <Link className="focus-ring rounded-lg py-1 hover:text-ink" href={publicLinks.deletion}>Account Deletion</Link>
            <a className="focus-ring rounded-lg py-1 hover:text-ink" href={publicLinks.support}>Support</a>
            <a className="focus-ring rounded-lg py-1 hover:text-ink" href={publicLinks.support}>Contact</a>
          </nav>
        </div>
        <div className="mx-auto mt-10 max-w-7xl border-t border-line pt-6 text-xs font-semibold text-muted">© {new Date().getFullYear()} MyFitPick</div>
      </footer>
    </div>
  );
}
