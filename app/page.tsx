import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";
import { AuthEntryForm } from "@/components/auth/AuthEntryForm";
import { getSessionUser } from "@/lib/auth";

export default async function Page() {
  const session = await getSessionUser();
  if (session) redirect("/home");

  return (
    <main id="main-content" className="relative min-h-[100svh] overflow-hidden bg-canvas px-5 py-[calc(1.5rem+var(--safe-top))] text-ink">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(166,124,82,0.14),transparent_30%),radial-gradient(circle_at_85%_20%,rgba(68,74,58,0.12),transparent_26%)]" />
      <section className="relative mx-auto grid min-h-[calc(100svh-3rem-var(--safe-top))] w-full max-w-6xl gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(340px,430px)] lg:items-center">
        <div className="pt-4">
          <p className="text-lg font-semibold tracking-tight text-ink">FitPick</p>
          <div className="mt-16 max-w-2xl">
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-cocoa">
              <Sparkles size={14} aria-hidden="true" />
              My FitPick
            </p>
            <h1 className="mt-4 font-editorial text-6xl font-semibold leading-[0.9] tracking-editorial text-ink sm:text-7xl lg:text-8xl">Know what to wear.</h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-muted sm:text-lg">
              Outfit ideas shaped around your clothes, your plans, and the weather.
            </p>
          </div>
        </div>

        <div className="mt-8 pb-[calc(1rem+var(--safe-bottom))]">
          <AuthEntryForm />
        </div>
      </section>
    </main>
  );
}
