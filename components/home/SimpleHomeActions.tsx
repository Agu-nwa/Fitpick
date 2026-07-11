import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

const actions = [
  { title: "Choose an outfit", body: "Get a look for today from clothes you own.", href: "/outfit", primary: true },
  { title: "Add pieces", body: "Save clothes, shoes, bags, and native wear.", href: "/wardrobe/add" },
  { title: "Open wardrobe", body: "Review your saved pieces.", href: "/wardrobe" },
  { title: "See it on you", body: "Preview how a look may come together.", href: "/avatar" }
];

export function SimpleHomeActions() {
  return (
    <section className="space-y-3">
      {actions.map((action) => (
        <Card key={action.title} className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold tracking-tight text-ink">{action.title}</h2>
              <p className="mt-1 text-sm leading-5 text-muted">{action.body}</p>
            </div>
            <Link href={action.href} className="shrink-0">
              <Button className="w-full sm:w-auto" variant={action.primary ? "primary" : "secondary"}>
                Open
              </Button>
            </Link>
          </div>
        </Card>
      ))}
    </section>
  );
}
