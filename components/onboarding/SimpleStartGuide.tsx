import { Card } from "@/components/ui/Card";

const steps = [
  { title: "Add your clothes", body: "Save the clothes, shoes, bags, and native wear you use most." },
  { title: "Ask FitPick what to wear", body: "Tell FitPick the occasion and it will choose from your wardrobe." },
  { title: "See the outfit on your avatar", body: "Preview how the look may come together before you dress." },
  { title: "Save the looks you like", body: "FitPick learns from the outfits you keep and wear." }
];

export function SimpleStartGuide() {
  return (
    <Card className="space-y-3">
      <div>
        <p className="text-sm font-semibold text-ink">Start simple</p>
        <p className="mt-1 text-xs leading-5 text-muted">Four easy steps to get better outfit help.</p>
      </div>
      <div className="space-y-3">
        {steps.map((step, index) => (
          <div key={step.title} className="flex gap-3 rounded-2xl border border-line bg-white px-3 py-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cocoa text-xs font-bold text-white">
              {index + 1}
            </span>
            <div>
              <p className="text-sm font-semibold text-ink">{step.title}</p>
              <p className="mt-1 text-xs leading-5 text-muted">{step.body}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
