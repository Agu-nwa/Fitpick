import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

const actions = [
  { title: "Pick an outfit for me", body: "FitPick will choose what to wear.", href: "/outfit", primary: true },
  { title: "Add my clothes", body: "Upload shirts, shoes, trousers, dresses, or native wear.", href: "/wardrobe/add" },
  { title: "See my wardrobe", body: "See all your saved clothes.", href: "/wardrobe" },
  { title: "Try clothes on my avatar", body: "See how an outfit may look on you.", href: "/avatar" }
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
