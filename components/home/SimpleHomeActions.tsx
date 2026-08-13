import Link from "next/link";
import { ArrowUpRight, ImagePlus, Shirt, Sparkles } from "lucide-react";

const actions = [
  { title: "Create a Look", body: "Tell your stylist the occasion, mood, or weather and get a complete closet-led outfit.", href: "/stylist/create-look", icon: Sparkles, primary: true, cta: "Start styling" },
  { title: "Match an Outfit", body: "Upload a piece or inspiration image and style around it with what you own.", href: "/stylist/match", icon: ImagePlus, cta: "Match inspiration" },
  { title: "Add to Closet", body: "Add another garment, shoe, bag, or accessory to improve future looks.", href: "/wardrobe/add", icon: Shirt, cta: "Add an item" }
];

export function SimpleHomeActions() {
  return (
    <section aria-labelledby="home-actions-title">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-cocoa">Your stylist</p>
          <h2 id="home-actions-title" className="font-editorial mt-2 text-3xl font-semibold text-ink sm:text-4xl">What would you like to do?</h2>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Link
            key={action.title}
            href={action.href}
            className={`focus-ring group flex min-h-52 flex-col rounded-2xl border p-5 transition duration-200 hover:-translate-y-0.5 ${
              action.primary ? "border-cocoa bg-cocoa text-white shadow-soft" : "border-line bg-surfaceWarm text-ink hover:border-cocoa/35"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`grid size-11 place-items-center rounded-xl ${action.primary ? "bg-white/12" : "bg-canvasSubtle text-cocoa"}`}><Icon size={19} strokeWidth={1.7} aria-hidden="true" /></span>
            </div>
            <div className="mt-auto">
              <h3 className="font-editorial text-3xl font-semibold leading-none tracking-tight">{action.title}</h3>
              <p className={`mt-3 text-sm leading-6 ${action.primary ? "text-canvas/70" : "text-muted"}`}>{action.body}</p>
              <span className="mt-5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em]">
                {action.cta}
                <ArrowUpRight size={15} className="transition group-hover:-translate-y-1 group-hover:translate-x-1" aria-hidden="true" />
              </span>
            </div>
          </Link>
        );
      })}
      </div>
    </section>
  );
}
