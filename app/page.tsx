import { redirect } from "next/navigation";
import { AuthEntryForm } from "@/components/auth/AuthEntryForm";
import { getSessionUser } from "@/lib/auth";

export default async function Page() {
  const session = await getSessionUser();
  if (session) redirect("/home");

  return (
    <main id="main-content" className="min-h-[100svh] bg-canvas px-5 py-[calc(1.5rem+var(--safe-top))] text-ink">
      <section className="mx-auto flex min-h-[calc(100svh-3rem-var(--safe-top))] w-full max-w-[430px] flex-col justify-between">
        <div className="pt-4">
          <p className="text-lg font-semibold tracking-tight text-ink">FitPick</p>
          <div className="mt-14">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-terracotta">Private beta</p>
            <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-tight text-ink">Know what to wear.</h1>
            <p className="mt-4 text-base leading-7 text-muted">
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
