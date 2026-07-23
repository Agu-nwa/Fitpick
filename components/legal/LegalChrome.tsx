import Link from "next/link";
import { ArrowLeft, ShieldCheck, Sparkles } from "lucide-react";
import { legalContactEmail, legalLastUpdated, legalPolicyList, type LegalPolicy } from "@/lib/legal/policies";

function LegalTopNav() {
  return (
    <nav className="flex flex-wrap items-center justify-between gap-3" aria-label="Legal navigation">
      <Link href="/login" className="focus-ring inline-flex items-center gap-2 rounded-full pr-3 text-sm font-extrabold text-ink">
        <span className="flex size-9 items-center justify-center rounded-full bg-olive text-canvas">
          <Sparkles size={16} aria-hidden="true" />
        </span>
        MyFitPick
      </Link>
      <Link href="/legal" className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-full border border-line bg-white/76 px-4 text-sm font-bold text-muted shadow-soft transition hover:text-ink">
        <ArrowLeft size={15} aria-hidden="true" />
        Policy center
      </Link>
    </nav>
  );
}

export function LegalPage({ policy }: { policy: LegalPolicy }) {
  return (
    <main id="main-content" className="min-h-[100svh] bg-canvas px-5 py-6 text-ink sm:px-8 lg:px-12">
      <div className="mx-auto max-w-6xl">
        <LegalTopNav />

        <header className="mt-8 border-b border-line pb-8">
          <p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.28em] text-cocoa">
            <ShieldCheck size={14} aria-hidden="true" />
            {policy.eyebrow}
          </p>
          <h1 className="mt-3 max-w-4xl font-editorial text-4xl font-semibold leading-[0.98] tracking-editorial text-ink sm:text-5xl lg:text-6xl">
            {policy.title}
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-muted sm:text-base">{policy.summary}</p>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-muted">Last updated {legalLastUpdated}</p>
        </header>

        <div className="grid gap-8 py-8 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
          <article className="space-y-7 rounded-[28px] border border-line bg-white/88 p-5 shadow-card sm:p-8">
            <div className="space-y-4 text-sm leading-7 text-muted sm:text-base">
              {policy.intro.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </div>

            {policy.sections.map((section) => (
              <section key={section.title} className="border-t border-line pt-6">
                <h2 className="font-editorial text-2xl font-semibold tracking-editorial text-ink">{section.title}</h2>
                {section.body?.length ? (
                  <div className="mt-3 space-y-3 text-sm leading-7 text-muted">
                    {section.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                  </div>
                ) : null}
                {section.bullets?.length ? (
                  <ul className="mt-3 space-y-2 text-sm leading-6 text-muted">
                    {section.bullets.map((item) => (
                      <li key={item} className="flex gap-3">
                        <span className="mt-2 size-1.5 shrink-0 rounded-full bg-olive" aria-hidden="true" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}

            <section className="rounded-2xl border border-olive/20 bg-olive/10 p-4">
              <h2 className="text-sm font-bold text-ink">Questions</h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                Contact <a href={`mailto:${legalContactEmail}`} className="font-semibold text-cocoa">{legalContactEmail}</a> for privacy, policy, account, or rights questions.
              </p>
            </section>
          </article>

          <aside className="rounded-[24px] border border-line bg-white/76 p-4 shadow-soft lg:sticky lg:top-6">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-cocoa">Policies</p>
            <div className="mt-3 space-y-1">
              {legalPolicyList.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`focus-ring block rounded-2xl px-3 py-2 text-sm font-semibold transition ${item.id === policy.id ? "bg-cocoa text-canvas" : "text-muted hover:bg-canvas hover:text-ink"}`}
                  aria-current={item.id === policy.id ? "page" : undefined}
                >
                  {item.shortTitle}
                </Link>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

export function LegalCenter() {
  return (
    <main id="main-content" className="min-h-[100svh] bg-canvas px-5 py-6 text-ink sm:px-8 lg:px-12">
      <div className="mx-auto max-w-6xl">
        <LegalTopNav />

        <header className="mt-8 overflow-hidden rounded-[32px] border border-line bg-gradient-to-br from-white via-surface to-olive/10 p-6 shadow-card sm:p-8 lg:p-10">
          <p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.28em] text-cocoa">
            <ShieldCheck size={14} aria-hidden="true" />
            Policy center
          </p>
          <h1 className="mt-3 max-w-4xl font-editorial text-4xl font-semibold leading-[0.98] tracking-editorial text-ink sm:text-5xl lg:text-6xl">
            Clear policies for your wardrobe, Credits, and previews.
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-muted sm:text-base">
            Review how MyFitPick handles privacy, account rules, Credits, AI previews, refunds, cookies, and rights concerns.
          </p>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-muted">Last updated {legalLastUpdated}</p>
        </header>

        <section className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Legal policies">
          {legalPolicyList.map((policy) => (
            <Link key={policy.id} href={policy.href} className="focus-ring group block rounded-[24px]">
              <article className="h-full rounded-[24px] border border-line bg-white/84 p-4 shadow-soft transition group-hover:-translate-y-0.5 group-hover:border-cocoa/35">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-cocoa">{policy.eyebrow}</p>
                <h2 className="mt-3 text-base font-bold text-ink">{policy.title}</h2>
                <p className="mt-2 text-xs leading-5 text-muted">{policy.summary}</p>
              </article>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
