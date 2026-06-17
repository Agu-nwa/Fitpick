import { Button } from "./Button";
import { Card } from "./Card";

export function ErrorState({ title, body, cta }: { title: string; body: string; cta: string }) {
  return (
    <Card className="border-danger/20 bg-danger/5 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-danger/10 text-danger">!</div>
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
      <Button variant="secondary" className="mt-5 w-full">{cta}</Button>
    </Card>
  );
}
