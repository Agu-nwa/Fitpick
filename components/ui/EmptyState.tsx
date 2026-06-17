import { Button } from "./Button";
import { Card } from "./Card";

export function EmptyState({ title, body, cta }: { title: string; body: string; cta: string }) {
  return (
    <Card className="text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-cocoa/10 text-cocoa">○</div>
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
      <Button className="mt-5 w-full">{cta}</Button>
    </Card>
  );
}
