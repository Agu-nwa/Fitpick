import { Button } from "./Button";
import { Card } from "./Card";
import Link from "next/link";

export function EmptyState({ title, body, cta, href }: { title: string; body: string; cta?: string; href?: string }) {
  return (
    <Card className="border-dashed border-cocoa/20 px-5 py-8 text-center sm:px-8">
      <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-cocoa/15 bg-cocoa/10 text-lg font-semibold text-cocoa">+</div>
      <h3 className="font-editorial text-3xl font-semibold leading-none text-ink">{title}</h3>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted">{body}</p>
      {cta && href ? (
        <Link href={href}>
          <Button className="mt-5 w-full">{cta}</Button>
        </Link>
      ) : null}
    </Card>
  );
}
