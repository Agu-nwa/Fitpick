import Link from "next/link";
import { ArrowLeft, Sparkles, WandSparkles } from "lucide-react";
import { LoginForm } from "@/components/auth/LoginForm";
import { Button } from "@/components/ui/Button";
import { FashionBackdrop } from "@/components/ui/FashionBackdrop";

export default function LoginPage() {
  return (
    <main id="main-content" className="relative isolate min-h-[100svh] overflow-hidden bg-canvas px-5 py-[calc(1.5rem+var(--safe-top))] text-ink">
      <FashionBackdrop density="soft" />
      <section className="relative mx-auto grid min-h-[calc(100svh-3rem-var(--safe-top))] w-full max-w-6xl gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(340px,430px)] lg:items-center">
        <div className="max-w-xl pt-4">
          <Link href="/" className="text-lg font-semibold tracking-tight text-ink">MyFitPick</Link>

          <div className="mt-12 sm:mt-16">
            <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-cocoa sm:text-xs">
              <Sparkles size={14} aria-hidden="true" />
              Your private studio
            </p>
            <h1 className="mt-4 font-editorial text-5xl font-semibold leading-[0.94] tracking-editorial text-ink sm:text-6xl lg:text-7xl">
              Step back into your closet.
            </h1>
            <p className="mt-4 max-w-lg text-[15px] leading-7 text-muted sm:text-base">
              Open your wardrobe, revisit saved looks, and let MyFitPick shape the next outfit with a little more ease.
            </p>
          </div>

          <div className="mt-8 grid max-w-md grid-cols-[0.8fr_1fr] gap-3 sm:gap-4">
            <div className="overflow-hidden rounded-xl3 border border-white/80 bg-white shadow-soft">
              <img src="/fashion/product-male-overshirt.png" alt="Muted overshirt product card" className="h-36 w-full object-cover sm:h-44" />
            </div>
            <div className="overflow-hidden rounded-xl3 border border-white/80 bg-white shadow-soft">
              <img src="/fashion/editorial-teal-studio.png" alt="Editorial outfit inspiration card" className="h-36 w-full object-cover sm:h-44" />
            </div>
            <div className="col-span-2 flex items-center gap-3 rounded-xl3 border border-line bg-white/72 p-3 shadow-card backdrop-blur-xl">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-lime/70 text-espresso">
                <WandSparkles size={17} aria-hidden="true" />
              </span>
              <p className="text-sm leading-5 text-muted">
                Outfit ideas, try-on previews, and wardrobe memory are waiting where you left them.
              </p>
            </div>
          </div>
        </div>

        <div className="pb-[calc(1rem+var(--safe-bottom))]">
          <LoginForm />
          <Link href="/">
            <Button variant="secondary" className="mt-4 w-full">
              <ArrowLeft size={16} aria-hidden="true" />
              Back to entry
            </Button>
          </Link>
        </div>
      </section>
    </main>
  );
}
