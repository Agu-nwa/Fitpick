import Link from "next/link";

const footerLinks = [
  ["How It Works", "/how-it-works"],
  ["AI Stylist", "/ai-stylist"],
  ["Digital Closet", "/digital-closet"],
  ["Privacy", "/legal/privacy"],
  ["Terms", "/legal/terms"],
  ["AI Disclosure", "/legal/ai-virtual-try-on-disclosure"]
] as const;

export function MarketingFooter() {
  return (
    <footer className="border-t border-white/10 bg-umber px-5 pb-[calc(2.5rem+var(--safe-bottom))] pt-14 text-white sm:px-8">
      <div className="mx-auto grid max-w-7xl gap-12 md:grid-cols-[1fr_auto] md:items-start">
        <div>
          <Link href="/" className="focus-ring rounded-lg font-editorial text-3xl font-semibold italic">MyFitPick</Link>
          <p className="mt-4 max-w-md text-sm leading-6 text-white/58">Personal styling centered on the wardrobe you already own.</p>
        </div>
        <nav className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm font-semibold text-white/62 sm:grid-cols-3" aria-label="Footer navigation">
          {footerLinks.map(([label, href]) => <Link key={href} href={href} className="focus-ring rounded-lg py-1 transition hover:text-white">{label}</Link>)}
        </nav>
      </div>
      <div className="mx-auto mt-12 max-w-7xl border-t border-white/10 pt-6 text-xs font-semibold text-white/35">© {new Date().getFullYear()} MyFitPick</div>
    </footer>
  );
}
