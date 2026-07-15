import Link from "next/link";
import { Sparkles } from "lucide-react";
import { RegisterForm } from "@/components/auth/RegisterForm";

export default function RegisterPage() {
  return (
    <main id="main-content" className="relative min-h-[100svh] overflow-hidden bg-canvas px-5 py-[calc(1.5rem+var(--safe-top))] text-ink">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(166,124,82,0.14),transparent_30%),radial-gradient(circle_at_85%_20%,rgba(68,74,58,0.12),transparent_26%)]" />
      <section className="relative mx-auto grid min-h-[calc(100svh-3rem-var(--safe-top))] w-full max-w-6xl gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(340px,430px)] lg:items-center">
        <div className="max-w-xl pt-4">
          <Link href="/" className="text-lg font-semibold tracking-tight text-ink">FitPick</Link>
          <p className="mt-16 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-cocoa">
            <Sparkles size={14} aria-hidden="true" />
            My FitPick
          </p>
          <h1 className="mt-4 font-editorial text-6xl font-semibold leading-[0.9] tracking-editorial text-ink sm:text-7xl">
            Your wardrobe, made easier.
          </h1>
          <p className="mt-4 text-base leading-7 text-muted">
            Add the pieces you wear most. FitPick helps you see what works and choose outfits for the day ahead.
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
