import { Button } from "./Button";
import { Card } from "./Card";
import Link from "next/link";

export function EmptyState({ title, body, cta, href }: { title: string; body: string; cta?: string; href?: string }) {
  return (
    <Card className="border-dashed text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-cocoa/15 bg-cocoa/10 text-cocoa">+</div>
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
      {cta ? (
        href ? (
          <Link href={href}>
            <Button className="mt-5 w-full">{cta}</Button>
          </Link>
        ) : (
          <Button className="mt-5 w-full">{cta}</Button>
        )
      ) : null}
    </Card>
  );
}
