"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

type ProviderAction = {
  provider: string;
  action: string;
  status: string;
  evidenceReference: string;
  error: string;
};

type DeletionRequest = {
  id: string;
  deletionReference: string;
  status: string;
  requestedAt: string | null;
  localDeletionCompletedAt: string | null;
  completedAt: string | null;
  deletedObjectCount: number;
  retainedRecordClasses: string[];
  lastError: string;
  providerActions: ProviderAction[];
};

type ListResponse = {
  ok: boolean;
  data?: { requests: DeletionRequest[]; summary: Array<{ status: string; count: number }> };
  error?: { message?: string };
};

function formatDate(value: string | null) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function tone(status: string): Parameters<typeof Badge>[0]["tone"] {
  if (["completed", "completed_with_retained_records", "not_applicable"].includes(status)) return "success";
  if (status === "failed") return "danger";
  if (["manual_pending", "provider_cleanup_pending"].includes(status)) return "warning";
  return "info";
}

export function AccountDeletionAdmin() {
  const [requests, setRequests] = useState<DeletionRequest[]>([]);
  const [summary, setSummary] = useState<Array<{ status: string; count: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [busyKey, setBusyKey] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/account-deletions?limit=100", { credentials: "include", cache: "no-store" });
      const payload = await response.json() as ListResponse;
      if (!response.ok || !payload.ok || !payload.data) throw new Error();
      setRequests(payload.data.requests);
      setSummary(payload.data.summary);
    } catch {
      setMessage("Unable to load deletion requests right now.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const pendingCount = useMemo(
    () => requests.filter((request) => request.providerActions.some((action) => ["manual_pending", "failed"].includes(action.status))).length,
    [requests]
  );

  const updateAction = useCallback(async (requestId: string, provider: string, status: "completed" | "failed" | "not_applicable") => {
    const key = `${requestId}:${provider}`;
    const evidenceReference = status !== "failed"
      ? window.prompt("Enter the provider ticket, confirmation, or policy reference used as evidence:", "")
      : "";
    if (status !== "failed" && !evidenceReference?.trim()) return;
    const error = status === "failed" ? window.prompt("Briefly record why provider cleanup failed:", "") : "";
    if (status === "failed" && !error?.trim()) return;

    setBusyKey(key);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/account-deletions/${requestId}/provider-actions`, {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ provider, status, evidenceReference: evidenceReference?.trim() || undefined, error: error?.trim() || undefined })
      });
      const payload = await response.json() as { ok: boolean };
      if (!response.ok || !payload.ok) throw new Error();
      await load();
      setMessage("Provider cleanup record updated.");
    } catch {
      setMessage("Unable to update provider cleanup right now.");
    } finally {
      setBusyKey("");
    }
  }, [load]);

  return (
    <main id="main-content" className="min-h-[100svh] bg-canvas px-5 py-6 text-ink sm:px-8 lg:px-12">
      <div className="mx-auto max-w-[1380px]">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <Link href="/admin" className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-muted hover:bg-surface hover:text-ink">
            <ArrowLeft size={18} aria-hidden="true" /> Admin console
          </Link>
          <Button variant="secondary" onClick={load} disabled={loading}>
            <RefreshCw size={16} aria-hidden="true" /> {loading ? "Refreshing" : "Refresh"}
          </Button>
        </div>

        <header className="rounded-xl4 border border-line bg-surface p-6 shadow-card sm:p-8">
          <p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-cocoa">
            <ShieldCheck size={14} aria-hidden="true" /> Privacy operations
          </p>
          <h1 className="mt-4 font-editorial text-4xl font-semibold leading-none tracking-editorial sm:text-5xl">Account deletion register.</h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-muted">
            Local deletion is automated. A request remains open until every external-provider action has evidence and is marked complete or not applicable.
          </p>
        </header>

        <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card><p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Loaded requests</p><p className="mt-3 text-3xl font-semibold">{requests.length}</p></Card>
          <Card><p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Provider follow-up</p><p className="mt-3 text-3xl font-semibold text-warning">{pendingCount}</p></Card>
          {summary.slice(0, 2).map((entry) => (
            <Card key={entry.status}><p className="truncate text-xs font-semibold uppercase tracking-[0.12em] text-muted">{entry.status.replaceAll("_", " ")}</p><p className="mt-3 text-3xl font-semibold">{entry.count}</p></Card>
          ))}
        </section>

        {message ? <p role="status" className="mt-5 rounded-2xl border border-line bg-surface px-4 py-3 text-sm font-semibold text-ink">{message}</p> : null}

        <section className="mt-5 space-y-4" aria-busy={loading}>
          {!loading && !requests.length ? <Card><p className="font-semibold">No deletion requests found.</p><p className="mt-2 text-sm text-muted">Requests will appear here after a user starts account deletion.</p></Card> : null}
          {requests.map((request) => (
            <Card key={request.id} className="overflow-hidden p-0">
              <div className="flex flex-col gap-3 border-b border-line p-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={tone(request.status)} wrap>{request.status.replaceAll("_", " ")}</Badge>
                    <code className="break-all text-xs text-muted">{request.deletionReference}</code>
                  </div>
                  <p className="mt-3 text-sm text-muted">Requested {formatDate(request.requestedAt)} · {request.deletedObjectCount} stored objects deleted</p>
                </div>
                <div className="text-xs leading-5 text-muted sm:text-right"><p>Local deletion: {formatDate(request.localDeletionCompletedAt)}</p><p>Completed: {formatDate(request.completedAt)}</p></div>
              </div>
              {request.lastError ? <p className="border-b border-danger/20 bg-danger/5 px-5 py-3 text-sm text-danger">{request.lastError}</p> : null}
              <div className="divide-y divide-line">
                {request.providerActions.map((action) => {
                  const key = `${request.id}:${action.provider}`;
                  const actionable = ["manual_pending", "failed"].includes(action.status);
                  return (
                    <div key={action.provider} className="grid gap-4 p-5 lg:grid-cols-[12rem_minmax(0,1fr)_auto] lg:items-center">
                      <div><p className="font-semibold text-ink">{action.provider}</p><Badge tone={tone(action.status)} className="mt-2" wrap>{action.status.replaceAll("_", " ")}</Badge></div>
                      <div className="text-sm leading-6 text-muted"><p>{action.action}</p>{action.evidenceReference ? <p className="mt-1 text-xs text-success">Evidence: {action.evidenceReference}</p> : null}{action.error ? <p className="mt-1 text-xs text-danger">Failure: {action.error}</p> : null}</div>
                      {actionable ? (
                        <div className="flex flex-wrap gap-2 lg:justify-end">
                          <Button variant="secondary" disabled={busyKey === key} onClick={() => updateAction(request.id, action.provider, "completed")}>Complete</Button>
                          <Button variant="ghost" disabled={busyKey === key} onClick={() => updateAction(request.id, action.provider, "not_applicable")}>Not applicable</Button>
                          <Button variant="danger" disabled={busyKey === key} onClick={() => updateAction(request.id, action.provider, "failed")}>Record failure</Button>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
              {request.retainedRecordClasses.length ? <p className="border-t border-line bg-canvas/60 px-5 py-3 text-xs leading-5 text-muted">Legally retained record classes: {request.retainedRecordClasses.join(", ")}</p> : null}
            </Card>
          ))}
        </section>
      </div>
    </main>
  );
}
