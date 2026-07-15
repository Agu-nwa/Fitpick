import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";

export function PremiumLockedState({ title, body }: { title: string; body: string }) {
  return (
    <Card className="border-cocoa/20 bg-cocoa/5">
      <StatusBadge tone="premium">MyFitPick Plus</StatusBadge>
      <h3 className="mt-3 text-base font-semibold text-ink">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
      <Link href="/plus" className="mt-5 block">
        <Button className="w-full">See Plus</Button>
      </Link>
    </Card>
  );
}
