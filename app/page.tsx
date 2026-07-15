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
      <section className="relative mx-auto grid min-h-[calc(100svh-3rem-var(--safe-top))] w-full max-w-7xl gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(340px,430px)] lg:items-center">
        <div className="pt-4">
          <p className="text-lg font-semibold tracking-tight text-ink">MyFitPick</p>
          <div className="mt-12 max-w-2xl sm:mt-16">
            <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-cocoa sm:text-xs">
              <Sparkles size={14} aria-hidden="true" />
              MyFitPick
            </p>
            <h1 className="mt-4 max-w-3xl font-editorial text-5xl font-semibold leading-[0.94] tracking-editorial text-ink sm:text-6xl lg:text-7xl xl:text-8xl">Your closet, styled by AI.</h1>
            <p className="mt-5 max-w-xl text-[15px] leading-7 text-muted sm:text-lg">
              MyFitPick turns your wardrobe into personalized looks, virtual try-ons, and daily styling inspiration.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href="/register"><Button className="w-full sm:w-auto">Start styling</Button></Link>
              <Link href="/avatar"><Button variant="secondary" className="w-full sm:w-auto">Explore virtual try-on</Button></Link>
            </div>
          </div>
        </div>

        <div className="mt-4 pb-[calc(1rem+var(--safe-bottom))] lg:mt-8">
          <AuthEntryForm />
        </div>
      </section>
    </main>
  );
}
