import Image from "next/image";
import Link from "next/link";
import {
  ArrowDown,
  Check,
  Handbag,
  ImagePlus,
  LockKeyhole,
  Mic,
  MessageSquareText,
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

function StoryNumber({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex size-11 items-center justify-center rounded-full border border-cocoa/25 bg-white font-editorial text-lg font-semibold italic text-cocoa shadow-soft">
      {children}
    </span>
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

        <section id="how-it-works" className="scroll-mt-24 px-4 py-20 sm:px-6 lg:px-8 lg:py-32">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-4xl text-center">
              <Eyebrow>How it works</Eyebrow>
              <h2 className="mt-6 font-editorial text-4xl font-semibold leading-[1.02] tracking-editorial sm:text-6xl lg:text-7xl">
                From your closet to seeing the whole look.
              </h2>
              <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-muted sm:text-lg sm:leading-8">
                One connected styling journey, built around what you own and where you are going.
              </p>
            </div>

            <ol className="mt-20 space-y-24 sm:mt-28 lg:space-y-36">
              <li className="grid items-center gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:gap-20">
                <div className="max-w-xl">
                  <StoryNumber>01</StoryNumber>
                  <h3 className="mt-6 font-editorial text-4xl font-semibold leading-[1.04] tracking-editorial sm:text-5xl">Begin with your wardrobe.</h3>
                  <p className="mt-5 text-base leading-7 text-muted sm:text-lg sm:leading-8">
                    Save the garments, shoes, bags and accessories you want MyFitPick to style. Start small and add more over time.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 rounded-[32px] border border-line bg-white p-3 shadow-lift sm:gap-4 sm:p-4">
                  {[
                    ["/fashion/product-blush-bag.png", "Blue blouse in a saved wardrobe", "Blue blouse"],
                    ["/fashion/product-espresso-boots.png", "Blush handbag in a saved wardrobe", "Blush bag"],
                    ["/fashion/product-male-overshirt.png", "Teal overshirt in a saved wardrobe", "Teal overshirt"]
                  ].map(([src, alt, label], index) => (
                    <figure key={src} className={`overflow-hidden rounded-[24px] bg-canvasSubtle ${index === 0 ? "row-span-2" : ""}`}>
                      <div className={`relative ${index === 0 ? "h-full min-h-[420px]" : "aspect-[4/3]"}`}>
                        <Image src={src} alt={alt} fill sizes="(max-width: 1023px) 46vw, 360px" className="object-cover" />
                        <figcaption className="absolute inset-x-3 bottom-3 rounded-xl bg-espresso/90 px-3 py-2 text-xs font-bold text-white backdrop-blur">{label}</figcaption>
                      </div>
                    </figure>
                  ))}
                </div>
              </li>

              <li className="grid items-center gap-10 lg:grid-cols-[1.12fr_0.88fr] lg:gap-20">
                <div className="order-2 rounded-[32px] border border-line bg-white p-5 shadow-lift sm:p-8 lg:order-1">
                  <div className="flex items-center gap-3 border-b border-line pb-5">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-cocoa text-white"><Sparkles size={19} aria-hidden="true" /></span>
                    <div><p className="font-bold">Ask MyFitPick</p><p className="text-xs text-muted">Create a Look</p></div>
                  </div>
                  <blockquote className="mt-7 font-editorial text-2xl font-semibold leading-snug sm:text-3xl">
                    “I’m going to dinner after work on a warm evening. Style me in something polished, relaxed and comfortable.”
                  </blockquote>
                  <div className="mt-8 flex flex-wrap gap-2">
                    {["Dinner", "Warm evening", "Polished"].map((item) => <span key={item} className="rounded-full border border-line bg-canvas px-3 py-2 text-xs font-bold text-muted">{item}</span>)}
                  </div>
                  <div className="mt-8 grid gap-3 sm:grid-cols-3">
                    <Link href={createHref} className="focus-ring flex min-h-12 items-center justify-center gap-2 rounded-xl bg-cocoa px-4 text-sm font-bold text-white hover:bg-espresso"><MessageSquareText size={17} aria-hidden="true" /> Type</Link>
                    <Link href={createHref} className="focus-ring flex min-h-12 items-center justify-center gap-2 rounded-xl border border-line bg-canvas px-4 text-sm font-bold text-ink hover:border-cocoa/40"><Mic size={17} aria-hidden="true" /> Speak</Link>
                    <Link href={matchHref} className="focus-ring flex min-h-12 items-center justify-center gap-2 rounded-xl border border-line bg-canvas px-4 text-sm font-bold text-ink hover:border-cocoa/40"><ImagePlus size={17} aria-hidden="true" /> Add image</Link>
                  </div>
                </div>
                <div className="order-1 max-w-xl lg:order-2">
                  <StoryNumber>02</StoryNumber>
                  <h3 className="mt-6 font-editorial text-4xl font-semibold leading-[1.04] tracking-editorial sm:text-5xl">Tell your stylist what the moment needs.</h3>
                  <p className="mt-5 text-base leading-7 text-muted sm:text-lg sm:leading-8">
                    Type it, say it, or add an inspiration image. MyFitPick uses your request, preferences and available context to understand the assignment.
                  </p>
                </div>
              </li>

              <li className="grid items-center gap-10 lg:grid-cols-[0.78fr_1.22fr] lg:gap-20">
                <div className="max-w-xl">
                  <StoryNumber>03</StoryNumber>
                  <h3 className="mt-6 font-editorial text-4xl font-semibold leading-[1.04] tracking-editorial sm:text-5xl">A complete outfit comes together.</h3>
                  <p className="mt-5 text-base leading-7 text-muted sm:text-lg sm:leading-8">
                    MyFitPick coordinates the main garments, footwear, handbag and suitable finishing pieces available in your wardrobe.
                  </p>
                </div>
                <div className="overflow-hidden rounded-[32px] border border-line bg-white p-3 shadow-lift sm:p-4">
                  <div className="relative aspect-[4/5] overflow-hidden rounded-[24px] bg-canvasSubtle sm:aspect-[16/11]">
                    <Image src="/fashion/editorial-blue-blouse.png" alt="A complete outfit assembled by MyFitPick" fill sizes="(max-width: 1023px) 92vw, 760px" className="object-cover" />
                  </div>
                  <div className="grid grid-cols-2 gap-2 px-2 pb-2 pt-4 text-xs font-bold text-muted sm:grid-cols-5">
                    {["Blue blouse", "Ivory skirt", "White sandals", "Blush bag", "Gold cuff"].map((item) => <span key={item} className="rounded-xl bg-canvas px-3 py-2 text-center">{item}</span>)}
                  </div>
                </div>
              </li>

              <li className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20">
                <div className="order-2 rounded-[32px] bg-espresso p-7 text-white shadow-lift sm:p-10 lg:order-1">
                  <Eyebrow tone="light">Your stylist explains</Eyebrow>
                  <p className="mt-6 font-editorial text-2xl font-semibold leading-snug sm:text-3xl">
                    “The cool blue blouse keeps the look polished, while the fluid ivory skirt softens it for evening. Light footwear and restrained finishing pieces complete the outfit without competing for attention.”
                  </p>
                  <div className="mt-8 flex flex-wrap gap-2">
                    {["Occasion considered", "Preferences considered", "Weather when available"].map((item) => <span key={item} className="rounded-full border border-white/15 bg-white/10 px-3 py-2 text-xs font-bold text-white/75">{item}</span>)}
                  </div>
                </div>
                <div className="order-1 max-w-xl lg:order-2">
                  <StoryNumber>04</StoryNumber>
                  <h3 className="mt-6 font-editorial text-4xl font-semibold leading-[1.04] tracking-editorial sm:text-5xl">Understand why it works.</h3>
                  <p className="mt-5 text-base leading-7 text-muted sm:text-lg sm:leading-8">
                    The recommendation arrives with a concise styling rationale, so the result feels deliberate rather than random.
                  </p>
                </div>
              </li>

              <li id="virtual-try-on" className="scroll-mt-24 overflow-hidden rounded-[36px] border border-cocoa/20 bg-white shadow-lift">
                <div className="grid lg:grid-cols-[1.15fr_0.85fr]">
                  <div className="relative aspect-[4/5] min-h-[480px] bg-canvasSubtle sm:aspect-[16/12] lg:min-h-[650px]">
                    <Image src="/fashion/editorial-blue-blouse-canonical-v1.png" alt="Virtual Try-On preview of the complete outfit on a Studio Model" fill sizes="(max-width: 1023px) 92vw, 720px" className="object-cover" />
                  </div>
                  <div className="flex flex-col justify-center p-7 sm:p-10 lg:p-14">
                    <StoryNumber>05</StoryNumber>
                    <Eyebrow>Virtual Try-On</Eyebrow>
                    <h3 className="mt-5 font-editorial text-4xl font-semibold leading-[1.02] tracking-editorial sm:text-5xl">See the complete look on your Studio Model.</h3>
                    <p className="mt-5 text-base leading-7 text-muted sm:text-lg sm:leading-8">
                      Once the recommendation is ready, start Virtual Try-On to preview how the coordinated outfit comes together on your selected model.
                    </p>
                    <Link href={createHref} className="focus-ring mt-8 inline-flex min-h-14 w-full items-center justify-center rounded-xl bg-cocoa px-7 text-base font-bold text-white shadow-card transition hover:-translate-y-0.5 hover:bg-espresso sm:w-auto">
                      Try this outfit on
                    </Link>
                  </div>
                </div>
              </li>
            </ol>
          </div>
        </section>

        <section className="border-y border-line bg-white/70 px-4 py-9 sm:px-6" aria-label="MyFitPick trust information">
          <div className="mx-auto grid max-w-6xl gap-5 sm:grid-cols-3">
            {[
              [LockKeyhole, "Private wardrobe", "Your wardrobe remains tied to your account."],
              [Handbag, "Your pieces first", "Recommendations begin with the items you saved."],
              [Check, "You start the preview", "Virtual Try-On begins after you choose to start it."]
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
                ["Does Virtual Try-On start automatically?", "No. Virtual Try-On begins when you select Try this outfit on after receiving a recommendation."],
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
