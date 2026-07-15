import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";
import { AuthEntryForm } from "@/components/auth/AuthEntryForm";
import { Button } from "@/components/ui/Button";
import { FashionBackdrop } from "@/components/ui/FashionBackdrop";
import { getSessionUser } from "@/lib/auth";
import Link from "next/link";

export default async function Page() {
  const session = await getSessionUser();
  if (session) redirect("/home");

  return (
    <main id="main-content" className="relative isolate min-h-[100svh] overflow-hidden bg-canvas px-5 py-[calc(1.5rem+var(--safe-top))] text-ink">
      <FashionBackdrop />
      <section className="relative mx-auto grid min-h-[calc(100svh-3rem-var(--safe-top))] w-full max-w-7xl gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(340px,430px)] lg:items-center">
        <div className="pt-4">
          <p className="text-lg font-semibold tracking-tight text-ink">FitPick</p>
          <div className="mt-16 max-w-2xl">
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-cocoa">
              <Sparkles size={14} aria-hidden="true" />
              My FitPick
            </p>
            <h1 className="mt-4 max-w-3xl font-editorial text-6xl font-semibold leading-[0.9] tracking-editorial text-ink sm:text-7xl lg:text-8xl">Your closet, styled by AI.</h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-muted sm:text-lg">
              FitPick turns your wardrobe into personalized looks, virtual try-ons, and daily styling inspiration.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href="/register"><Button className="w-full sm:w-auto">Start styling</Button></Link>
              <Link href="/avatar"><Button variant="secondary" className="w-full sm:w-auto">Explore virtual try-on</Button></Link>
            </div>
          </div>
        </div>

        <div className="mt-8 pb-[calc(1rem+var(--safe-bottom))]">
          <AuthEntryForm />
        </div>
      </section>
    </main>
  );
}
