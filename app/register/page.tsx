import Link from "next/link";
import { RegisterForm } from "@/components/auth/RegisterForm";

export default function RegisterPage() {
  return (
    <main id="main-content" className="min-h-[100svh] bg-canvas px-5 py-[calc(1.5rem+var(--safe-top))] text-ink">
      <section className="mx-auto grid min-h-[calc(100svh-3rem-var(--safe-top))] w-full max-w-5xl gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(340px,420px)] lg:items-center">
        <div className="max-w-xl pt-4">
          <Link href="/" className="text-lg font-semibold tracking-tight text-ink">FitPick</Link>
          <p className="mt-14 text-xs font-semibold uppercase tracking-[0.24em] text-terracotta">My FitPicK</p>
          <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-tight text-ink sm:text-5xl">
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
