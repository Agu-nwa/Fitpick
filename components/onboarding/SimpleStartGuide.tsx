import { Card } from "@/components/ui/Card";

const steps = [
  { title: "Add a few pieces", body: "Start with the clothes, shoes, and bags you reach for often." },
  { title: "Choose the moment", body: "Tell FitPick where you are going and what the weather is like." },
  { title: "Review the look", body: "See why the pieces work together before you decide." },
  { title: "Save what feels right", body: "Keep the outfits you want to wear again." }
];

export function SimpleStartGuide() {
  return (
    <Card className="space-y-3">
      <div>
        <p className="text-sm font-semibold text-ink">Start small</p>
        <p className="mt-1 text-xs leading-5 text-muted">A few good pieces are enough to begin.</p>
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
