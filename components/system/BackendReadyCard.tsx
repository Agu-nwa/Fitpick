import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { ApiContract } from "@/lib/api-contract";

export function BackendReadyCard({ contract }: { contract: ApiContract }) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ink">{contract.name}</p>
          <p className="mt-1 text-xs leading-5 text-muted">{contract.description}</p>
        </div>
        <StatusBadge tone={contract.status === "ready" ? "success" : "warning"}>{contract.status}</StatusBadge>
      </div>
      <p className="mt-3 rounded-2xl bg-canvas px-3 py-2 font-mono text-[11px] text-muted">{contract.method} {contract.path}</p>
    </Card>
  );
}
