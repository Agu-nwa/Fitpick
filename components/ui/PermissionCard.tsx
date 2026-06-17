import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";

export function PermissionCard({ title, body, status = "Optional" }: { title: string; body: string; status?: string }) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div>
          <StatusBadge tone="premium">{status}</StatusBadge>
          <h3 className="mt-3 text-base font-semibold text-ink">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2">
        <Button variant="secondary">Not now</Button>
        <Button>Allow</Button>
      </div>
    </Card>
  );
}
