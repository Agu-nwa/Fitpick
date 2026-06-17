import { Chip } from "@/components/ui/Chip";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const fields = [
  { label: "Category", value: "Shirt", active: true },
  { label: "Color", value: "White", active: true },
  { label: "Occasion", value: "Work", active: true },
  { label: "Weather", value: "Hot", active: false },
  { label: "Condition", value: "Ready", active: true }
];

export function TagReviewCard() {
  return (
    <Card>
      <div className="flex gap-4">
        <div className={cn("h-28 w-24 shrink-0 rounded-2xl bg-gradient-to-br from-stone-50 to-stone-200")} role="img" aria-label="white shirt preview" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-terracotta">AI tag review</p>
          <h3 className="mt-2 text-base font-semibold text-ink">White cotton shirt</h3>
          <p className="mt-1 text-sm leading-5 text-muted">Review the suggested tags before saving.</p>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        {fields.map((field) => (
          <Chip key={field.label} active={field.active}>{field.label}: {field.value}</Chip>
        ))}
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <Button variant="secondary">Edit tags</Button>
        <Button>Save item</Button>
      </div>
    </Card>
  );
}
