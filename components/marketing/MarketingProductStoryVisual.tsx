import Image from "next/image";
import { Check, CircleCheck, Sparkles, WandSparkles } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

export type MarketingStoryVariant = "closet" | "stylist" | "assembly" | "studio";

const storyItems = [
  { name: "Blue satin blouse", role: "Top", color: "Blue", src: "/fashion/product-blue-satin-blouse-v1.png" },
  { name: "Ivory midi skirt", role: "Bottom", color: "Ivory", src: "/fashion/product-ivory-midi-skirt-v1.png" },
  { name: "White strap sandals", role: "Shoes", color: "White", src: "/fashion/product-white-strap-sandals-v1.png" },
  { name: "Gold cuff", role: "Accessory", color: "Gold", src: "/fashion/product-gold-cuff-v1.png" }
];

function ProductTile({ index, compact = false, selected = false }: { index: number; compact?: boolean; selected?: boolean }) {
  const item = storyItems[index];

  return (
    <article className={cn("relative overflow-hidden rounded-2xl border bg-white shadow-card", selected ? "border-sage ring-2 ring-sage/15" : "border-line")}>
      <div className={cn("relative bg-canvasSubtle", compact ? "aspect-square" : "aspect-[5/4]")}>
        <Image src={item.src} alt={item.name} fill sizes={compact ? "120px" : "240px"} className="object-contain p-2" />
        {selected ? <span className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-sage text-white"><Check size={13} aria-hidden="true" /></span> : null}
      </div>
      <div className={cn(compact ? "p-2" : "p-2.5")}>
        <p className="truncate text-[9px] font-bold uppercase tracking-[0.13em] text-cocoa">{item.color} · {item.role}</p>
        <p className={cn("mt-1 truncate font-semibold text-ink", compact ? "text-[10px]" : "text-xs")}>{item.name}</p>
      </div>
    </article>
  );
}

function ClosetStory() {
  return (
    <div className="h-full bg-canvas p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-sage">Closet</p><h3 className="mt-1 font-editorial text-2xl font-semibold text-ink sm:text-3xl">Your confirmed items</h3></div>
        <Badge tone="success"><CircleCheck size={12} className="mr-1" aria-hidden="true" />4 ready</Badge>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:mt-5">
        {storyItems.map((item, index) => <ProductTile key={item.name} index={index} />)}
      </div>
    </div>
  );
}

function StylistStory() {
  return (
    <div className="flex h-full flex-col bg-surfaceWarm p-4 sm:p-6">
      <div className="flex items-center gap-2 text-sage"><Sparkles size={18} aria-hidden="true" /><p className="text-[10px] font-bold uppercase tracking-[0.18em]">AI Stylist</p></div>
      <Card className="mt-3 border border-line bg-white/90 p-4">
        <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted">Your request</p>
        <p className="mt-2 text-sm font-semibold leading-5 text-ink sm:text-base">Dinner on a warm evening. Polished, light and comfortable.</p>
      </Card>
      <div className="mt-3 flex items-center justify-between gap-3"><p className="text-xs font-bold text-ink">Selected from your closet</p><Badge tone="success">4 matched</Badge></div>
      <div className="mt-2 grid grid-cols-4 gap-2">
        {storyItems.map((item, index) => <ProductTile key={item.name} index={index} compact selected />)}
      </div>
      <div className="mt-auto flex flex-wrap gap-2 pt-3">
        {["Warm weather", "Polished", "Complete look"].map((label) => <span key={label} className="rounded-full border border-line bg-white px-2.5 py-1 text-[10px] font-semibold text-muted">{label}</span>)}
      </div>
    </div>
  );
}

function AssemblyStory() {
  return (
    <div className="flex h-full flex-col bg-canvas p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-sage">Recommendation</p><h3 className="mt-1 font-editorial text-2xl font-semibold text-ink sm:text-3xl">Your complete look</h3></div>
        <WandSparkles className="text-sage" size={21} aria-hidden="true" />
      </div>
      <Card className="mt-4 border border-line bg-white p-3 sm:p-4">
        <div className="flex items-center justify-between gap-3"><p className="text-xs font-bold text-ink">Closet pieces</p><Badge tone="success">Ready</Badge></div>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {storyItems.map((item, index) => <ProductTile key={item.name} index={index} compact />)}
        </div>
      </Card>
      <Card className="mt-3 border border-line bg-surface p-3 sm:p-4">
        <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-cocoa">Styling notes</p>
        <p className="mt-1.5 text-xs leading-5 text-muted sm:text-sm">The satin blouse and flowing skirt stay light for the weather. White sandals finish the look; the gold cuff adds one restrained accent.</p>
      </Card>
      <div className="mt-auto grid grid-cols-2 gap-2 pt-3"><span className="flex min-h-10 items-center justify-center rounded-xl bg-sage px-3 text-xs font-bold text-white">Save this look</span><span className="flex min-h-10 items-center justify-center rounded-xl border border-line bg-white px-3 text-xs font-bold text-ink">Virtual Try-On</span></div>
    </div>
  );
}

function StudioStory() {
  return (
    <div className="bg-canvasSubtle lg:grid lg:h-full lg:grid-cols-[minmax(0,1fr)_minmax(180px,0.55fr)]">
      <div className="relative aspect-[2/3] min-h-0 bg-surfaceWarm lg:aspect-auto lg:h-full">
        <Image src="/fashion/editorial-blue-blouse-canonical-v1.png" alt="MyFitPick brand model wearing the recommended blue blouse, ivory skirt, white sandals and gold cuff, including the full outfit and shoes" fill sizes="(max-width: 1023px) 92vw, 31vw" className="object-contain" />
        <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-black/35 to-transparent p-4 sm:p-5"><Badge className="border-white/35 bg-black/30 text-white backdrop-blur" tone="neutral">Virtual Try-On preview</Badge></div>
      </div>
      <div className="border-t border-line bg-white p-4 lg:flex lg:flex-col lg:justify-center lg:border-l lg:border-t-0 lg:p-5">
        <div className="flex items-center justify-between gap-3"><div><p className="text-[9px] font-bold uppercase tracking-[0.15em] text-sage">Same closet pieces</p><p className="mt-1 text-xs font-semibold text-ink sm:text-sm">The recommendation, shown on your Studio Model.</p></div><CircleCheck className="shrink-0 text-sage" size={20} aria-hidden="true" /></div>
        <div className="mt-3 grid grid-cols-4 gap-2 lg:grid-cols-2">
          {storyItems.map((item) => <div key={item.name} className="relative aspect-square overflow-hidden rounded-xl border border-line bg-canvasSubtle"><Image src={item.src} alt="" fill sizes="72px" className="object-contain p-1" /></div>)}
        </div>
      </div>
    </div>
  );
}

export function MarketingProductStoryVisual({ variant }: { variant: MarketingStoryVariant }) {
  const labels: Record<MarketingStoryVariant, string> = {
    closet: "MyFitPick Closet showing four confirmed wardrobe items",
    stylist: "MyFitPick AI Stylist selecting the same four closet items",
    assembly: "MyFitPick outfit recommendation assembled from those closet items",
    studio: "MyFitPick brand model wearing the recommended closet items"
  };

  return (
    <div role="img" aria-label={labels[variant]} className="w-full lg:h-full">
      {variant === "closet" ? <ClosetStory /> : null}
      {variant === "stylist" ? <StylistStory /> : null}
      {variant === "assembly" ? <AssemblyStory /> : null}
      {variant === "studio" ? <StudioStory /> : null}
    </div>
  );
}
