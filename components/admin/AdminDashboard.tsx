"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiErrorState } from "@/components/integration/ApiErrorState";
import { ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";
import {
  getAdminAudit,
  getAdminContent,
  getBackendHealth,
  runAdminSeed,
  type AdminAuditData,
  type AdminContentData,
  type BackendHealth,
  type CurrentUserSummary
} from "@/lib/api-client";
import type { ApiFailure } from "@/types/api";

type TabId = "overview" | "audit" | "content";
type LoadState = "idle" | "loading" | "ready" | "error";

type AdminDashboardProps = {
  user: NonNullable<CurrentUserSummary["user"]>;
};

const tabs: Array<{ id: TabId; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "audit", label: "Audit" },
  { id: "content", label: "Content" }
];

function statusTone(status?: string) {
  if (status === "ok" || status === "ready") return "success";
  if (status === "degraded" || status === "skipped" || status === "not_checked") return "warning";
  return "neutral";
}

function formatDate(value?: string | null) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function StatCard({ label, value, detail, tone = "neutral" }: { label: string; value: string | number; detail: string; tone?: Parameters<typeof Badge>[0]["tone"] }) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">{label}</p>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-ink">{value}</p>
          <p className="mt-1 text-xs leading-5 text-muted">{detail}</p>
        </div>
        <Badge tone={tone}>{String(value)}</Badge>
      </div>
    </Card>
  );
}

function EmptyPanel({ title, detail }: { title: string; detail: string }) {
  return (
    <Card className="p-4">
      <p className="text-sm font-semibold text-ink">{title}</p>
      <p className="mt-2 text-xs leading-5 text-muted">{detail}</p>
    </Card>
  );
}

function FailurePanel({ failure, onRetry }: { failure?: ApiFailure; onRetry: () => Promise<void> }) {
  return (
    <ApiErrorState
      title="Admin data unavailable"
      message={failure?.error.message || "Unable to load the admin console right now."}
      onRetry={onRetry}
    />
  );
}

export function AdminDashboard({ user }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [status, setStatus] = useState<LoadState>("idle");
  const [health, setHealth] = useState<BackendHealth | null>(null);
  const [audit, setAudit] = useState<AdminAuditData | null>(null);
  const [content, setContent] = useState<AdminContentData | null>(null);
  const [failure, setFailure] = useState<ApiFailure>();
  const [lastRefreshed, setLastRefreshed] = useState<string>("");
  const [seedStatus, setSeedStatus] = useState<"idle" | "running" | "done" | "failed">("idle");
  const [seedMessage, setSeedMessage] = useState("");

  const load = useCallback(async () => {
    setStatus("loading");
    setFailure(undefined);
    const [healthResult, auditResult, contentResult] = await Promise.all([
      getBackendHealth(),
      getAdminAudit(),
      getAdminContent()
    ]);

    if (!healthResult.ok) {
      setFailure(healthResult);
      setStatus("error");
      return;
    }
    if (!auditResult.ok) {
      setFailure(auditResult);
      setStatus("error");
      return;
    }
    if (!contentResult.ok) {
      setFailure(contentResult);
      setStatus("error");
      return;
    }

    setHealth(healthResult.data);
    setAudit(auditResult.data);
    setContent(contentResult.data);
    setLastRefreshed(new Date().toISOString());
    setStatus("ready");
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const runSeed = useCallback(async () => {
    setSeedStatus("running");
    setSeedMessage("");
    const result = await runAdminSeed();
    if (!result.ok) {
      setSeedStatus("failed");
      setSeedMessage(result.error.message);
      return;
    }

    setSeedStatus("done");
    setSeedMessage(`Seeded ${result.data.occasions} occasions and ${result.data.contentRules} content rules.`);
    await load();
  }, [load]);

  const auditCount = useMemo(() => audit?.summary.reduce((sum, row) => sum + row.count, 0) || 0, [audit]);
  const ruleCount = useMemo(() => content?.contentRuleSummary.reduce((sum, row) => sum + row.count, 0) || 0, [content]);

  return (
    <main id="main-content" className="relative min-h-[100svh] overflow-hidden bg-canvas text-ink">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_20%_10%,rgba(166,124,82,0.12),transparent_30%),radial-gradient(circle_at_85%_20%,rgba(68,74,58,0.12),transparent_26%)]" />
      <div className="mx-auto w-full max-w-[1480px] px-5 py-6 sm:px-8 lg:px-12 xl:px-16">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <header className="relative flex-1 overflow-hidden rounded-xl4 border border-line bg-surface/80 p-5 shadow-card sm:p-8">
            <div className="absolute right-[-5rem] top-[-6rem] size-60 rounded-full bg-cocoa/10 blur-3xl" />
            <div className="relative max-w-4xl">
              <p className="mb-4 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-cocoa">
                <ShieldCheck size={14} aria-hidden="true" />
                Admin
              </p>
              <h1 className="font-editorial text-balance text-5xl font-semibold leading-[0.9] tracking-editorial text-ink sm:text-6xl lg:text-7xl">
                Operations console.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-muted sm:text-base">
                Monitor health, audit activity, content readiness, and controlled production support actions.
              </p>
            </div>
          </header>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="premium">{user.role}</Badge>
            <Badge tone={user.plan === "plus" ? "success" : "neutral"}>{user.plan}</Badge>
            <Button variant="secondary" onClick={load} disabled={status === "loading"} className="px-4">
              {status === "loading" ? "Refreshing" : "Refresh"}
            </Button>
          </div>
        </div>

        <Card className="mb-5 mt-5 p-2">
          <div className="grid grid-cols-3 gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`min-h-11 rounded-2xl px-3 text-sm font-semibold transition ${
                  activeTab === tab.id ? "bg-cocoa text-canvas shadow-card" : "text-muted hover:bg-cocoa/10 hover:text-cocoa"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </Card>

        {status === "error" ? <FailurePanel failure={failure} onRetry={load} /> : null}

        {activeTab === "overview" && status !== "error" ? (
          <div className="space-y-6">
            <section>
              <SectionHeader
                title="System Health"
                eyebrow={lastRefreshed ? `Last refreshed ${formatDate(lastRefreshed)}` : "Loading"}
              />
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <StatCard label="App" value={health?.checks?.app || "loading"} detail={health?.service || "FitPick"} tone={statusTone(health?.checks?.app)} />
                <StatCard label="Database" value={health?.checks?.database || "loading"} detail={health?.databaseConfigured ? "MongoDB configured" : "MongoDB not configured"} tone={statusTone(health?.checks?.database)} />
                <StatCard label="Storage" value={health?.checks?.storage || "loading"} detail="S3/CloudFront readiness" tone={statusTone(health?.checks?.storage)} />
                <StatCard label="Worker" value={health?.checks?.worker || "loading"} detail="Background worker health signal" tone={statusTone(health?.checks?.worker)} />
              </div>
            </section>

            <section>
              <SectionHeader title="Operational Summary" />
              <div className="grid gap-3 md:grid-cols-3">
                <StatCard label="Audit events" value={auditCount} detail="Grouped admin-visible activity" tone="info" />
                <StatCard label="Content rules" value={ruleCount} detail="Active rule groups available" tone="premium" />
                <StatCard label="Global occasions" value={content?.occasions.length || 0} detail="Production occasion catalog" tone="success" />
              </div>
            </section>

            <section>
              <SectionHeader title="Production Actions" />
              <Card className="p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-ink">Seed global content</p>
                    <p className="mt-1 max-w-2xl text-xs leading-5 text-muted">
                      Runs the audited admin seed endpoint for global occasions, content rules, reason chips, notification copy, and state templates.
                    </p>
                    {seedMessage ? (
                      <p className={`mt-2 text-xs font-semibold ${seedStatus === "failed" ? "text-danger" : "text-success"}`}>{seedMessage}</p>
                    ) : null}
                  </div>
                  <Button variant="secondary" onClick={runSeed} disabled={seedStatus === "running"}>
                    {seedStatus === "running" ? "Running seed" : "Run seed"}
                  </Button>
                </div>
              </Card>
            </section>
          </div>
        ) : null}

        {activeTab === "audit" && status !== "error" ? (
          <section>
            <SectionHeader title="Audit Activity" eyebrow="Recent 50 events" />
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
              <Card className="overflow-hidden p-0">
                {audit?.recent.length ? (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[680px] text-left text-sm">
                      <thead className="border-b border-line bg-canvas/70 text-xs uppercase tracking-[0.16em] text-muted">
                        <tr>
                          <th className="px-4 py-3 font-semibold">Action</th>
                          <th className="px-4 py-3 font-semibold">Entity</th>
                          <th className="px-4 py-3 font-semibold">Entity ID</th>
                          <th className="px-4 py-3 font-semibold">Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {audit.recent.map((event) => (
                          <tr key={event.id} className="bg-surface/70">
                            <td className="px-4 py-3 font-semibold text-ink">{event.action}</td>
                            <td className="px-4 py-3 text-muted">{event.entityType}</td>
                            <td className="px-4 py-3 font-mono text-xs text-muted">{event.entityId || "n/a"}</td>
                            <td className="px-4 py-3 text-muted">{formatDate(event.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <EmptyPanel title="No audit events" detail="Admin-visible activity will appear here once users and jobs interact with the system." />
                )}
              </Card>

              <Card className="p-4">
                <p className="text-sm font-semibold text-ink">Action summary</p>
                <div className="mt-4 space-y-2">
                  {audit?.summary.length ? audit.summary.map((row) => (
                    <div key={row.action} className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-canvas/60 px-3 py-2">
                      <span className="truncate text-xs font-semibold text-ink">{row.action}</span>
                      <Badge tone="info">{row.count}</Badge>
                    </div>
                  )) : <p className="text-xs leading-5 text-muted">No actions have been recorded yet.</p>}
                </div>
              </Card>
            </div>
          </section>
        ) : null}

        {activeTab === "content" && status !== "error" ? (
          <section>
            <SectionHeader title="Content Readiness" />
            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="p-4">
                <p className="text-sm font-semibold text-ink">Active content rules</p>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {content?.contentRuleSummary.length ? content.contentRuleSummary.map((rule) => (
                    <div key={rule.type} className="rounded-2xl border border-line bg-canvas/60 px-3 py-3">
                      <p className="truncate text-xs font-semibold text-ink">{rule.type}</p>
                      <p className="mt-2 text-lg font-semibold text-cocoa">{rule.count}</p>
                    </div>
                  )) : <p className="text-xs leading-5 text-muted">No active content rules found.</p>}
                </div>
              </Card>

              <Card className="overflow-hidden p-0">
                <div className="border-b border-line px-4 py-3">
                  <p className="text-sm font-semibold text-ink">Global occasions</p>
                </div>
                {content?.occasions.length ? (
                  <div className="max-h-[32rem] overflow-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="sticky top-0 border-b border-line bg-canvas/70 text-xs uppercase tracking-[0.16em] text-muted">
                        <tr>
                          <th className="px-4 py-3 font-semibold">Name</th>
                          <th className="px-4 py-3 font-semibold">Group</th>
                          <th className="px-4 py-3 font-semibold">Formality</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {content.occasions.map((occasion) => (
                          <tr key={occasion.id}>
                            <td className="px-4 py-3 font-semibold text-ink">{occasion.name}</td>
                            <td className="px-4 py-3 text-muted">{occasion.group}</td>
                            <td className="px-4 py-3 text-muted">{occasion.formality}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <EmptyPanel title="No global occasions" detail="Run the seed action to create the default occasion catalog." />
                )}
              </Card>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
