import { RegisterForm } from "@/components/auth/RegisterForm";

const benefits = [
  {
    title: "Weather-aware outfit ideas",
    copy: "Dress better for changing seasons, layering, rain, snow, and warm days."
  },
  {
    title: "Smarter wardrobe use",
    copy: "Rediscover what you already own and reduce random shopping."
  },
  {
    title: "Occasion-ready styling",
    copy: "Get outfit ideas for work, brunch, dates, events, travel, and everyday life."
  },
  {
    title: "Personal style memory",
    copy: "FitPick learns your preferences so recommendations get better over time."
  }
];

export default function RegisterPage() {
  return (
    <main id="main-content" className="min-h-[100svh] bg-canvas">
      <section className="mx-auto grid min-h-[100svh] w-full max-w-6xl gap-8 px-5 py-8 sm:px-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.7fr)] lg:items-center lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-terracotta">FitPick Canada beta</p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight text-ink sm:text-5xl">
            Build a wardrobe that works for real life.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-muted">
            FitPick helps you turn the clothes you already own into confident outfits for work, weekends, weather, and everything in between.
          </p>

          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            {benefits.map((benefit) => (
              <article key={benefit.title} className="rounded-xl3 border border-line bg-surface p-4 shadow-card">
                <h2 className="text-sm font-semibold text-ink">{benefit.title}</h2>
                <p className="mt-2 text-xs leading-5 text-muted">{benefit.copy}</p>
              </article>
            ))}
          </div>

          <div className="mt-6 rounded-xl3 border border-cocoa/15 bg-cocoa/5 p-4">
            <p className="text-sm font-semibold text-ink">Made for wardrobes that adapt.</p>
            <p className="mt-2 text-sm leading-6 text-muted">
              From cold mornings to warmer afternoons, hybrid workdays to city weekends, FitPick helps make your closet easier to use.
            </p>
          </div>
        </div>

        <div className="w-full">
          <RegisterForm />
        </div>
      </section>
    </main>
  );
}
