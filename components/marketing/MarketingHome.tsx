import Image from "next/image";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUpRight,
  CalendarDays,
  Camera,
  Check,
  CloudSun,
  Footprints,
  Handbag,
  LockKeyhole,
  Shirt,
  Sparkles
} from "lucide-react";
import { PublicNavigation } from "@/components/marketing/PublicNavigation";

const publicLinks = {
  privacy: "/legal/privacy",
  terms: "/legal/terms",
  ai: "/legal/ai-virtual-try-on-disclosure",
  credits: "/legal/subscription-and-credits-policy",
  support: "mailto:support@myfitpick.com"
};

function Eyebrow({ children, tone = "cocoa" }: { children: React.ReactNode; tone?: "cocoa" | "light" }) {
  return (
    <p className={`text-[11px] font-bold uppercase tracking-[0.28em] ${tone === "light" ? "text-olive" : "text-cocoa"}`}>
      {children}
    </p>
  );
}

function ProductDemo() {
  return (
    <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20">
      <div className="relative mx-auto w-full max-w-[590px]">
        <div className="relative aspect-[4/5] overflow-hidden rounded-[32px] border border-line bg-white p-3 shadow-lift sm:rounded-[40px] sm:p-4">
          <div className="relative h-full overflow-hidden rounded-[24px] bg-canvasSubtle sm:rounded-[30px]">
            <Image
              src="/fashion/editorial-blue-blouse-canonical-v1.png"
              alt="A coordinated outfit recommended by MyFitPick"
              fill
              sizes="(max-width: 1023px) 92vw, 560px"
              className="object-cover"
            />
            <div className="absolute inset-x-4 bottom-4 rounded-2xl border border-white/25 bg-espresso/92 p-4 text-white shadow-card backdrop-blur sm:inset-x-6 sm:bottom-6 sm:p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-olive">MyFitPick recommendation</p>
              <p className="mt-2 text-base font-semibold">Dinner by the coast</p>
              <p className="mt-1 text-sm leading-6 text-white/70">A complete look built from saved wardrobe pieces.</p>
            </div>
          </div>
        </div>
      </div>

      <div>
        <Eyebrow>The solution</Eyebrow>
        <h2 className="mt-5 font-editorial text-4xl font-semibold leading-[1.02] tracking-editorial sm:text-5xl lg:text-6xl">
          One coordinated answer.
        </h2>
        <p className="mt-6 max-w-xl text-base leading-7 text-muted sm:text-lg sm:leading-8">
          MyFitPick considers your request, wardrobe details and available context, then recommends the pieces that work together.
        </p>
        <div className="mt-9 space-y-7">
          {[
            [CloudSun, "Context considered", "Occasion, preferences and available weather context guide the recommendation."],
            [Footprints, "The complete look", "Main garments, footwear and suitable finishing pieces are coordinated together."],
            [Sparkles, "Virtual Try-On is optional", "Choose a visual AI preview only after the outfit recommendation is ready."]
          ].map(([Icon, title, copy], index) => {
            const DemoIcon = Icon as typeof CloudSun;
            return (
              <div key={title as string} className="flex gap-4">
                <span className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${index === 2 ? "bg-espresso text-olive" : "bg-cocoa/10 text-cocoa"}`}>
                  <DemoIcon size={20} aria-hidden="true" />
                </span>
                <div>
                  <h3 className="font-bold text-ink">{title as string}</h3>
                  <p className="mt-1 max-w-lg text-sm leading-6 text-muted">{copy as string}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function MarketingHome({ signedIn }: { signedIn: boolean }) {
  const primaryHref = signedIn ? "/home" : "/register";
  const primaryLabel = signedIn ? "Open MyFitPick" : "Style my closet";
  const createHref = signedIn ? "/stylist/create-look" : "/register";
  const matchHref = signedIn ? "/stylist/match" : "/register";

  return (
    <div className="min-h-screen overflow-x-clip bg-canvas text-ink">
      <PublicNavigation signedIn={signedIn} />

      <main id="main-content">
        <section className="px-4 pb-24 pt-20 text-center sm:px-6 sm:pt-24 lg:px-8 lg:pb-36 lg:pt-32">
          <div className="mx-auto max-w-5xl">
            <Eyebrow>Your personal stylist</Eyebrow>
            <h1 className="mx-auto mt-7 max-w-5xl font-editorial text-5xl font-semibold leading-[0.98] tracking-editorial sm:text-7xl lg:text-[88px]">
              Know what to wear, <span className="italic text-cocoa">using what you already own.</span>
            </h1>
            <p className="mx-auto mt-8 max-w-2xl text-base leading-7 text-muted sm:text-xl sm:leading-8">
              MyFitPick builds complete outfits from your saved wardrobe for the occasion, weather and way you want to feel.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href={primaryHref} className="focus-ring inline-flex min-h-14 items-center justify-center rounded-xl bg-cocoa px-9 text-base font-bold text-white shadow-card transition hover:-translate-y-0.5 hover:bg-espresso">
                {primaryLabel}
              </Link>
              <Link href="#problem" className="focus-ring inline-flex min-h-14 items-center justify-center gap-2 rounded-xl border border-line bg-white px-8 text-base font-bold text-ink transition hover:border-cocoa/35">
                Why MyFitPick <ArrowDown size={17} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>

        <section id="problem" className="scroll-mt-24 border-y border-line bg-white px-4 py-20 text-center sm:px-6 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-4xl">
            <Eyebrow>The daily problem</Eyebrow>
            <h2 className="mt-6 font-editorial text-3xl font-semibold leading-[1.12] tracking-editorial sm:text-5xl">
              A full wardrobe can still leave you wondering what to wear.
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-muted sm:text-lg">
              MyFitPick helps you use the pieces you already own, without rebuilding the same outfit or shopping for an answer every time.
            </p>
          </div>
        </section>

        <section id="the-demo" className="scroll-mt-24 px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-7xl">
            <ProductDemo />
          </div>
        </section>

        <section id="ways-to-start" className="scroll-mt-24 border-y border-line bg-white px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl">
              <Eyebrow>Two ways to begin</Eyebrow>
              <h2 className="mt-5 font-editorial text-4xl font-semibold tracking-editorial sm:text-5xl">Start with a moment—or an inspiration.</h2>
            </div>
            <div className="mt-10 grid gap-5 md:grid-cols-2">
              {[
                [CalendarDays, "Create a Look", "Describe where you are going and how you want to feel.", createHref],
                [Camera, "Match an Outfit", "Upload an item or inspiration image and style around it.", matchHref]
              ].map(([Icon, title, copy, href]) => {
                const StartIcon = Icon as typeof CalendarDays;
                return (
                  <Link key={title as string} href={href as string} className="focus-ring group rounded-[28px] border border-line bg-canvas p-7 transition hover:-translate-y-0.5 hover:border-cocoa/45 hover:shadow-card sm:p-8">
                    <div className="flex items-start justify-between gap-6">
                      <span className="flex size-11 items-center justify-center rounded-xl bg-cocoa/10 text-cocoa"><StartIcon size={21} aria-hidden="true" /></span>
                      <ArrowUpRight className="text-muted transition group-hover:text-cocoa" size={20} aria-hidden="true" />
                    </div>
                    <h3 className="mt-10 font-editorial text-2xl font-semibold">{title as string}</h3>
                    <p className="mt-2 max-w-lg text-sm leading-6 text-muted">{copy as string}</p>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-24 px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-7xl text-center">
            <Eyebrow>How it works</Eyebrow>
            <h2 className="mt-5 font-editorial text-4xl font-semibold tracking-editorial sm:text-5xl">From closet to outfit in three steps.</h2>
            <ol className="mt-12 grid gap-10 sm:grid-cols-3 lg:gap-16">
              {[
                ["01", "Add your wardrobe", "Photograph the pieces you want MyFitPick to understand."],
                ["02", "Share what you need", "Describe the moment or upload an inspiration image."],
                ["03", "Review your look", "See the coordinated recommendation and why it works."]
              ].map(([number, title, copy]) => (
                <li key={number}>
                  <span className="font-editorial text-4xl italic text-cocoa">{number}</span>
                  <h3 className="mt-5 font-bold text-ink">{title}</h3>
                  <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-muted">{copy}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="border-y border-line bg-white/70 px-4 py-9 sm:px-6" aria-label="MyFitPick trust information">
          <div className="mx-auto grid max-w-6xl gap-5 sm:grid-cols-3">
            {[
              [LockKeyhole, "Private wardrobe", "Your wardrobe remains tied to your account."],
              [Handbag, "Your pieces first", "Recommendations begin with the items you saved."],
              [Check, "Clear AI choices", "Credit-using and AI-preview actions are identified before use."]
            ].map(([Icon, title, copy]) => {
              const TrustIcon = Icon as typeof LockKeyhole;
              return (
                <div key={title as string} className="flex items-start gap-3 sm:px-3">
                  <TrustIcon className="mt-0.5 shrink-0 text-cocoa" size={18} aria-hidden="true" />
                  <div><p className="text-sm font-bold text-ink">{title as string}</p><p className="mt-1 text-xs leading-5 text-muted">{copy as string}</p></div>
                </div>
              );
            })}
          </div>
        </section>

        <section id="faq" className="scroll-mt-24 bg-white px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-3xl">
            <div className="text-center"><Eyebrow>FAQ</Eyebrow><h2 className="mt-5 font-editorial text-4xl font-semibold tracking-editorial sm:text-5xl">Useful details.</h2></div>
            <div className="mt-12 divide-y divide-line border-y border-line">
              {[
                ["Do I need to upload my whole wardrobe?", "No. Start with the pieces you want MyFitPick to understand and add more over time."],
                ["Does Match require the inspiration item to be in my closet?", "No. An outside item can guide the look while the remaining pieces come from your saved wardrobe."],
                ["Are shoes and accessories included?", "MyFitPick considers available footwear and suitable finishing pieces when assembling a complete recommendation."],
                ["Does Virtual Try-On start automatically?", "No. It is an optional AI preview you choose after a recommendation is ready. Any Credit cost is shown before you start."],
                ["How is my wardrobe information handled?", "Wardrobe photos and account information are handled according to MyFitPick's published privacy controls."]
              ].map(([question, answer]) => (
                <details key={question} className="group">
                  <summary className="focus-ring flex min-h-16 cursor-pointer list-none items-center justify-between gap-5 rounded-xl py-5 text-left text-base font-bold text-ink sm:text-lg">
                    {question}<span className="text-2xl font-normal text-cocoa transition group-open:rotate-45" aria-hidden="true">+</span>
                  </summary>
                  <p className="max-w-2xl pb-6 pr-10 text-sm leading-7 text-muted sm:text-base">{answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-5xl rounded-[32px] bg-cocoa px-6 py-14 text-center text-white shadow-lift sm:px-10 lg:py-16">
            <Shirt className="mx-auto text-olive" size={27} aria-hidden="true" />
            <h2 className="mx-auto mt-6 max-w-3xl font-editorial text-4xl font-semibold leading-[1.02] tracking-editorial sm:text-5xl">Your next outfit may already be in your closet.</h2>
            <Link href={primaryHref} className="focus-ring mt-8 inline-flex min-h-14 items-center justify-center rounded-xl bg-white px-9 font-bold text-cocoa shadow-card transition hover:-translate-y-0.5 hover:text-espresso">{primaryLabel}</Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-line bg-espresso px-4 pb-[calc(2rem+var(--safe-bottom))] pt-12 text-white sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-10 md:flex-row md:items-start">
          <div><p className="font-editorial text-2xl font-semibold italic">MyFitPick</p><p className="mt-3 max-w-sm text-sm leading-6 text-white/58">Personal styling centered on the wardrobe you own.</p></div>
          <nav className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm font-semibold text-white/65 sm:grid-cols-3" aria-label="Footer navigation">
            <Link className="focus-ring rounded-lg py-1 hover:text-white" href={publicLinks.privacy}>Privacy</Link>
            <Link className="focus-ring rounded-lg py-1 hover:text-white" href={publicLinks.terms}>Terms</Link>
            <Link className="focus-ring rounded-lg py-1 hover:text-white" href={publicLinks.ai}>AI disclosure</Link>
            <Link className="focus-ring rounded-lg py-1 hover:text-white" href={publicLinks.credits}>Credits</Link>
            <a className="focus-ring rounded-lg py-1 hover:text-white" href={publicLinks.support}>Support</a>
          </nav>
        </div>
        <div className="mx-auto mt-10 max-w-7xl border-t border-white/10 pt-6 text-xs font-semibold text-white/40">© {new Date().getFullYear()} MyFitPick</div>
      </footer>
    </div>
  );
}
