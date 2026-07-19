import Link from "next/link";
import { ArrowUpRight, Shirt, Sparkles } from "lucide-react";

const actions = [
  { title: "Ask your Stylist", body: "Get a grounded outfit idea from pieces you already own.", href: "/stylist", icon: Sparkles, primary: true, number: "01", cta: "Start chat" },
  { title: "Add wardrobe pieces", body: "Photograph one item and let MyFitPick organize the details.", href: "/wardrobe/add", icon: Shirt, number: "02", cta: "Add a piece" }
];

export function SimpleHomeActions() {
  return (
    <section className="grid gap-3 md:grid-cols-2">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Link
            key={action.title}
            href={action.href}
            className={`focus-ring group flex min-h-64 flex-col rounded-xl3 border p-5 transition duration-500 hover:-translate-y-1 ${
              action.primary ? "border-cocoa bg-cocoa text-canvas shadow-glow" : "border-line bg-surface text-ink hover:border-olive/50"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-bold tracking-[0.22em] ${action.primary ? "text-canvas/60" : "text-muted"}`}>{action.number}</span>
              <Icon size={20} strokeWidth={1.5} aria-hidden="true" />
            </div>
            <div className="mt-auto">
              <h2 className="font-editorial text-3xl font-semibold leading-[0.95] tracking-tight sm:text-4xl">{action.title}</h2>
              <p className={`mt-3 text-sm leading-6 ${action.primary ? "text-canvas/70" : "text-muted"}`}>{action.body}</p>
              <span className="mt-5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em]">
                {action.cta}
                <ArrowUpRight size={15} className="transition group-hover:-translate-y-1 group-hover:translate-x-1" aria-hidden="true" />
              </span>
            </div>
          </Link>
        );
      })}
    </section>
  );
}
