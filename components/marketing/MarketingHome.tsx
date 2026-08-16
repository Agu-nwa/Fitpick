import Image from "next/image";
import Link from "next/link";
import {
  ArrowDown,
  Check,
  Handbag,
  ImagePlus,
  LockKeyhole,
  Mic,
  Plus,
  SendHorizontal,
  Shirt
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

function ProductScreen({
  title,
  children
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-[30px] border border-cocoa/20 bg-canvas shadow-lift">
      <div className="flex min-h-16 items-center justify-between border-b border-line bg-white/90 px-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-cocoa text-white">
            <Shirt size={17} aria-hidden="true" />
          </span>
          <span className="text-sm font-bold">MyFitPick</span>
        </div>
        <p className="text-sm font-bold text-ink">{title}</p>
        <span className="size-9 rounded-full border border-line bg-canvasSubtle" aria-hidden="true" />
      </div>
      {children}
    </div>
  );
}

export function MarketingHome({ signedIn }: { signedIn: boolean }) {
  const primaryHref = signedIn ? "/home" : "/register";
  const primaryLabel = signedIn ? "Open MyFitPick" : "Style my closet";
  const createHref = signedIn ? "/stylist/create-look" : "/register";

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
                  <h3 className="mt-6 font-editorial text-4xl font-semibold leading-[1.04] tracking-editorial sm:text-5xl">Add the pieces you want styled.</h3>
                  <p className="mt-5 text-base leading-7 text-muted sm:text-lg sm:leading-8">
                    Photograph the garments, shoes, bags and accessories in your closet. MyFitPick keeps them together as a wardrobe it can style.
                  </p>
                </div>
                <ProductScreen title="Closet">
                  <div className="p-4 sm:p-6">
                    <div className="mb-5 flex items-center justify-between gap-3">
                      <div><p className="text-lg font-bold">Your wardrobe</p><p className="mt-1 text-xs text-muted">Pieces ready for styling</p></div>
                      <span className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-cocoa px-4 text-xs font-bold text-white"><Plus size={15} aria-hidden="true" /> Add item</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {[
                        ["/fashion/product-blush-bag.png", "Blue satin blouse saved in the MyFitPick closet", "Blue satin blouse", "TOPS"],
                        ["/fashion/product-espresso-boots.png", "Blush handbag saved in the MyFitPick closet", "Blush handbag", "BAGS"],
                        ["/fashion/product-male-overshirt.png", "Teal overshirt saved in the MyFitPick closet", "Teal overshirt", "OUTERWEAR"]
                      ].map(([src, alt, label, category]) => (
                        <figure key={src} className="overflow-hidden rounded-[20px] border border-line bg-white">
                          <div className="relative aspect-[4/5] bg-canvasSubtle"><Image src={src} alt={alt} fill sizes="(max-width: 639px) 42vw, 220px" className="object-cover" /></div>
                          <figcaption className="p-3"><p className="text-[9px] font-bold tracking-[0.2em] text-cocoa">{category}</p><p className="mt-1 text-xs font-bold text-ink">{label}</p></figcaption>
                        </figure>
                      ))}
                    </div>
                    <div className="mt-4 flex items-center gap-2 rounded-xl bg-cocoa/8 px-3 py-2.5 text-xs font-bold text-cocoa"><Check size={15} aria-hidden="true" /> Upload complete — ready to style</div>
                  </div>
                </ProductScreen>
              </li>

              <li className="grid items-center gap-10 lg:grid-cols-[1.12fr_0.88fr] lg:gap-20">
                <div className="order-2 lg:order-1">
                  <ProductScreen title="Create a Look">
                    <div className="p-4 sm:p-7">
                      <div className="mb-5"><p className="text-[10px] font-bold uppercase tracking-[0.24em] text-cocoa">MyFitPick AI Stylist</p><p className="mt-2 font-editorial text-2xl font-semibold">What are you dressing for?</p></div>
                      <div className="rounded-[22px] border border-cocoa/20 bg-white p-5 shadow-soft">
                        <blockquote className="min-h-28 text-base font-semibold leading-7 text-ink sm:text-lg">
                          “I’m going to dinner after work on a warm evening. Style me in something polished, relaxed and comfortable.”
                        </blockquote>
                        <div className="mt-5 flex items-center justify-between gap-3 border-t border-line pt-4">
                          <div className="flex gap-2">
                            <span className="flex size-10 items-center justify-center rounded-xl border border-line bg-canvas"><Mic size={17} aria-hidden="true" /></span>
                            <span className="flex size-10 items-center justify-center rounded-xl border border-line bg-canvas"><ImagePlus size={17} aria-hidden="true" /></span>
                          </div>
                          <span className="flex size-11 items-center justify-center rounded-xl bg-cocoa text-white"><SendHorizontal size={18} aria-hidden="true" /></span>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {["Occasion · Dinner", "Weather · Warm evening", "Mood · Polished + relaxed"].map((item) => <span key={item} className="rounded-full border border-line bg-white px-3 py-2 text-[11px] font-bold text-muted">{item}</span>)}
                      </div>
                      <p className="mt-4 text-xs leading-5 text-muted">MyFitPick will build this look from your saved wardrobe.</p>
                    </div>
                  </ProductScreen>
                </div>
                <div className="order-1 max-w-xl lg:order-2">
                  <StoryNumber>02</StoryNumber>
                  <h3 className="mt-6 font-editorial text-4xl font-semibold leading-[1.04] tracking-editorial sm:text-5xl">Tell MyFitPick what you need.</h3>
                  <p className="mt-5 text-base leading-7 text-muted sm:text-lg sm:leading-8">
                    Describe the occasion, mood and weather in one natural sentence. Type it, speak it, or add an inspiration image.
                  </p>
                </div>
              </li>

              <li className="grid items-center gap-10 lg:grid-cols-[0.78fr_1.22fr] lg:gap-20">
                <div className="max-w-xl">
                  <StoryNumber>03</StoryNumber>
                  <h3 className="mt-6 font-editorial text-4xl font-semibold leading-[1.04] tracking-editorial sm:text-5xl">Review the complete recommendation.</h3>
                  <p className="mt-5 text-base leading-7 text-muted sm:text-lg sm:leading-8">
                    See the exact wardrobe pieces selected for the moment, including footwear and the finishing details that make the outfit feel complete.
                  </p>
                </div>
                <ProductScreen title="Your Look">
                  <div className="grid gap-4 p-4 sm:grid-cols-[1.15fr_0.85fr] sm:p-6">
                    <div className="relative min-h-[430px] overflow-hidden rounded-[22px] bg-canvasSubtle sm:min-h-[560px]">
                      <Image src="/fashion/editorial-blue-blouse.png" alt="MyFitPick dinner recommendation with a blue blouse, ivory skirt, white sandals and gold cuff" fill sizes="(max-width: 639px) 86vw, 410px" className="object-cover" />
                      <span className="absolute left-3 top-3 rounded-full bg-white/92 px-3 py-2 text-[9px] font-bold uppercase tracking-[0.2em] text-cocoa shadow-soft">Complete look</span>
                    </div>
                    <div className="flex flex-col">
                      <div><p className="text-[10px] font-bold uppercase tracking-[0.22em] text-cocoa">Dinner after work</p><h4 className="mt-2 font-editorial text-2xl font-semibold">Polished evening ease</h4></div>
                      <div className="mt-5 grid grid-cols-2 gap-2">
                        {[
                          ["Blue satin blouse", "TOP"],
                          ["Ivory midi skirt", "BOTTOM"],
                          ["White strap sandals", "SHOES"],
                          ["Gold cuff", "ACCESSORY"]
                        ].map(([name, role], index) => (
                          <div key={name} className="overflow-hidden rounded-xl border border-line bg-white">
                            <div className="relative aspect-square overflow-hidden bg-canvasSubtle">
                              <Image
                                src={index === 0 ? "/fashion/product-blush-bag.png" : "/fashion/editorial-blue-blouse.png"}
                                alt={name}
                                fill
                                sizes="130px"
                                className={`object-cover ${index === 1 ? "scale-[1.8] object-[50%_68%]" : index === 2 ? "scale-[1.9] object-[50%_100%]" : index === 3 ? "scale-[2.7] object-[68%_43%]" : ""}`}
                              />
                            </div>
                            <div className="p-2"><p className="text-[8px] font-bold tracking-[0.16em] text-cocoa">{role}</p><p className="mt-1 text-[10px] font-bold leading-tight">{name}</p></div>
                          </div>
                        ))}
                      </div>
                      <p className="mt-4 text-xs leading-5 text-muted">The blue blouse keeps the look polished; the ivory skirt, white sandals and gold cuff soften it for a warm evening.</p>
                      <Link href={createHref} className="focus-ring mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-cocoa px-4 text-xs font-bold text-white hover:bg-espresso">Try this outfit on</Link>
                    </div>
                  </div>
                </ProductScreen>
              </li>

              <li id="virtual-try-on" className="scroll-mt-24 overflow-hidden rounded-[36px] border border-cocoa/20 bg-white shadow-lift">
                <div className="grid lg:grid-cols-[1.15fr_0.85fr]">
                  <div className="relative aspect-[4/5] min-h-[480px] bg-canvasSubtle sm:aspect-[16/12] lg:min-h-[650px]">
                    <Image src="/fashion/editorial-blue-blouse-canonical-v1.png" alt="Virtual Try-On preview of the complete outfit on a Studio Model" fill sizes="(max-width: 1023px) 92vw, 720px" className="object-cover" />
                  </div>
                  <div className="flex flex-col justify-center p-7 sm:p-10 lg:p-14">
                    <StoryNumber>04</StoryNumber>
                    <Eyebrow>Virtual Try-On</Eyebrow>
                    <h3 className="mt-5 font-editorial text-4xl font-semibold leading-[1.02] tracking-editorial sm:text-5xl">See the same outfit on your Studio Model.</h3>
                    <p className="mt-5 text-base leading-7 text-muted sm:text-lg sm:leading-8">
                      The blue blouse, ivory skirt, white sandals and gold cuff from the recommendation remain the complete Try-On look.
                    </p>
                    <div className="mt-6 grid grid-cols-2 gap-2 text-xs font-bold text-muted">
                      {["Blue satin blouse", "Ivory midi skirt", "White strap sandals", "Gold cuff"].map((item) => <span key={item} className="flex items-center gap-2 rounded-xl bg-canvas px-3 py-2.5"><Check size={14} className="text-cocoa" aria-hidden="true" />{item}</span>)}
                    </div>
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
