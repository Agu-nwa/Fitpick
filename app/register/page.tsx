import Link from "next/link";
import { Sparkles } from "lucide-react";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { FashionBackdrop } from "@/components/ui/FashionBackdrop";

export default function RegisterPage() {
  return (
    <main id="main-content" className="relative isolate min-h-[100svh] overflow-hidden bg-canvas px-5 py-[calc(1.5rem+var(--safe-top))] text-ink">
      <FashionBackdrop density="soft" />
      <section className="relative mx-auto grid min-h-[calc(100svh-3rem-var(--safe-top))] w-full max-w-6xl gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(340px,430px)] lg:items-center">
        <div className="max-w-xl pt-4">
          <Link href="/" className="text-lg font-semibold tracking-tight text-ink">MyFitPick</Link>
          <p className="mt-12 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-cocoa sm:mt-16 sm:text-xs">
            <Sparkles size={14} aria-hidden="true" />
            MyFitPick
          </p>
          <h1 className="mt-4 font-editorial text-5xl font-semibold leading-[0.94] tracking-editorial text-ink sm:text-6xl lg:text-7xl">
            Your wardrobe, made easier.
          </h1>
          <p className="mt-4 text-base leading-7 text-muted">
            Add the pieces you wear most. MyFitPick helps you see what works and choose outfits for the day ahead.
          </p>
          <p className="mt-5 text-sm leading-6 text-muted">Only you can see the wardrobe you add.</p>
        </div>

        <div className="pb-[calc(1rem+var(--safe-bottom))]">
          <RegisterForm />
        </div>
      </section>
    </main>
  );
}
