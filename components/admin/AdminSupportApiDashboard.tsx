"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, CheckCircle2, Inbox, KeyRound, RefreshCw, Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { ApiResponse } from "@/types/api";

type Tenant = {
  id: string;
  name: string;
  slug: string;
  status: "active" | "paused";
  monthlyUsageLimit: number;
};

type ExternalCustomer = {
  id: string;
  externalId: string;
  name: string;
  email: string;
  metadata: Record<string, unknown>;
} | null;

type ExternalConversation = {
  id: string;
  tenantId: string;
  customer: ExternalCustomer;
  customerId: string;
  externalConversationId: string;
  status: "open" | "pending" | "resolved";
  subject: string;
  latestMessagePreview: string;
  lastMessageAt: string | null;
  customerUnreadCount: number;
  agentUnreadCount: number;
  createdAt: string;
  updatedAt: string;
};

type ExternalMessage = {
  id: string;
  conversationId: string;
  senderType: "customer" | "agent" | "system";
  senderName: string;
  body: string;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type StatusFilter = "all" | "open" | "pending" | "resolved";

type UsageEvent = {
  id: string;
  tenantId: string;
  apiKeyId: string;
  operation: string;
  method: string;
  path: string;
  statusCode: number;
  billableUnits: number;
  createdAt: string;
};

type UsageSummary = {
  periodStart: string;
  periodEnd: string;
  totalUnits: number;
  totalCalls: number;
};

async function jsonApi<T>(path: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(path, { ...options, credentials: "include" });
    return (await response.json()) as ApiResponse<T>;
  } catch {
    return { ok: false, error: { code: "INTERNAL_ERROR", message: "Unable to reach the support API console right now." } };
  }
}

function formatDate(value?: string | null) {
  if (!value) return "No activity";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function customerName(conversation: ExternalConversation) {
  return conversation.customer?.name || conversation.customer?.externalId || "Customer";
}

function customerDetail(conversation: ExternalConversation) {
  return conversation.customer?.email || conversation.customer?.externalId || conversation.customerId;
}

function StatusPill({ status }: { status: ExternalConversation["status"] }) {
  const tone = status === "open" ? "bg-success/10 text-success" : status === "pending" ? "bg-warning/15 text-espresso" : "bg-ink/5 text-muted";
  return <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${tone}`}>{status}</span>;
}

export function AdminSupportApiDashboard() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantId, setTenantId] = useState("");
  const [conversations, setConversations] = useState<ExternalConversation[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [selectedConversation, setSelectedConversation] = useState<ExternalConversation | null>(null);
  const [messages, setMessages] = useState<ExternalMessage[]>([]);
  const [status, setStatus] = useState<StatusFilter>("open");
  const [reply, setReply] = useState("");
  const [feedback, setFeedback] = useState("");
  const [usageEvents, setUsageEvents] = useState<UsageEvent[]>([]);
  const [usageSummary, setUsageSummary] = useState<UsageSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [usageLoading, setUsageLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const selectedTenant = useMemo(() => tenants.find((tenant) => tenant.id === tenantId) || null, [tenantId, tenants]);
  const unreadCount = useMemo(() => conversations.reduce((sum, conversation) => sum + conversation.agentUnreadCount, 0), [conversations]);
  const monthlyUsageLimit = selectedTenant?.monthlyUsageLimit ?? 0;
  const monthlyUsedUnits = usageSummary?.totalUnits ?? 0;
  const monthlyRemainingUnits = monthlyUsageLimit ? Math.max(monthlyUsageLimit - monthlyUsedUnits, 0) : 0;

  const loadTenants = useCallback(async () => {
    const result = await jsonApi<{ tenants: Tenant[] }>("/api/admin/support-api/tenants", { cache: "no-store" });
    if (result.ok) {
      setTenants(result.data.tenants);
      setTenantId((current) => current || result.data.tenants[0]?.id || "");
    } else {
      setFeedback(result.error.message);
    }
  }, []);

  const loadConversations = useCallback(async () => {
    setLoading(true);
    setFeedback("");
    const params = new URLSearchParams({ status });
    if (tenantId) params.set("tenantId", tenantId);
    const result = await jsonApi<{ conversations: ExternalConversation[] }>(`/api/admin/support-api/conversations?${params.toString()}`, { cache: "no-store" });
    if (result.ok) {
      setConversations(result.data.conversations);
      setSelectedId((current) => current || result.data.conversations[0]?.id || "");
    } else {
      setFeedback(result.error.message);
    }
    setLoading(false);
  }, [status, tenantId]);

  const loadUsage = useCallback(async () => {
    setUsageLoading(true);
    const params = new URLSearchParams({ limit: "10" });
    if (tenantId) params.set("tenantId", tenantId);
    const result = await jsonApi<{ usageEvents: UsageEvent[]; summary: UsageSummary }>(`/api/admin/support-api/usage?${params.toString()}`, { cache: "no-store" });
    if (result.ok) {
      setUsageEvents(result.data.usageEvents);
      setUsageSummary(result.data.summary);
    } else {
      setFeedback(result.error.message);
    }
    setUsageLoading(false);
  }, [tenantId]);

  const loadMessages = useCallback(async (conversationId: string) => {
    if (!conversationId) {
      setSelectedConversation(null);
      setMessages([]);
      return;
    }
    const result = await jsonApi<{ conversation: ExternalConversation; messages: ExternalMessage[]; nextCursor: string | null }>(
      `/api/admin/support-api/conversations/${conversationId}/messages`,
      { cache: "no-store" }
    );
    if (result.ok) {
      setSelectedConversation(result.data.conversation);
      setMessages(result.data.messages);
    } else {
      setFeedback(result.error.message);
    }
  }, []);

  useEffect(() => {
    void loadTenants();
  }, [loadTenants]);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    void loadUsage();
  }, [loadUsage]);

  useEffect(() => {
    void loadMessages(selectedId);
  }, [loadMessages, selectedId]);

  const sendReply = useCallback(async () => {
    const body = reply.trim();
    if (!selectedId || !body || sending) return;
    setSending(true);
    const result = await jsonApi<{ message: ExternalMessage; conversation: ExternalConversation | null }>(
      `/api/admin/support-api/conversations/${selectedId}/messages`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body, idempotencyKey: crypto.randomUUID() })
      }
    );
    if (result.ok) {
      setReply("");
      setMessages((current) => [...current, result.data.message]);
      if (result.data.conversation) {
        setSelectedConversation(result.data.conversation);
        setConversations((current) => current.map((conversation) => (conversation.id === result.data.conversation?.id ? result.data.conversation : conversation)));
      }
    } else {
      setFeedback(result.error.message);
    }
    setSending(false);
  }, [reply, selectedId, sending]);

  const updateStatus = useCallback(async (nextStatus: ExternalConversation["status"]) => {
    if (!selectedId) return;
    const result = await jsonApi<{ conversation: ExternalConversation }>(`/api/admin/support-api/conversations/${selectedId}/status`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: nextStatus })
    });
    if (result.ok) {
      setSelectedConversation(result.data.conversation);
      setConversations((current) => current.map((conversation) => (conversation.id === result.data.conversation.id ? result.data.conversation : conversation)));
    } else {
      setFeedback(result.error.message);
    }
  }, [selectedId]);

  return (
    <main className="min-h-[100svh] bg-canvas px-5 py-6 text-ink sm:px-8 lg:px-12">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-5">
        <header className="flex flex-col gap-4 rounded-xl4 border border-line bg-surface/90 p-5 shadow-card md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-3 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-cocoa">
              <KeyRound size={14} /> Support API
            </p>
            <h1 className="font-editorial text-4xl font-semibold leading-none tracking-editorial sm:text-5xl">External Support Console</h1>
            <p className="mt-3 text-sm text-muted">
              Reply to conversations created through the hosted support API. {unreadCount ? `${unreadCount} unread message${unreadCount === 1 ? "" : "s"}.` : "No unread API messages."}
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() => {
              void loadConversations();
              void loadUsage();
            }}
            disabled={loading || usageLoading}
          >
            <RefreshCw size={16} /> Refresh
          </Button>
        </header>

        {feedback ? <p className="rounded-2xl border border-danger/25 bg-danger/5 px-4 py-3 text-sm font-semibold text-danger">{feedback}</p> : null}

        <div className="grid min-h-[70svh] gap-5 lg:grid-cols-[25rem_minmax(0,1fr)]">
          <Card className="flex flex-col gap-4 p-4">
            <div className="grid gap-3">
              <label className="text-[10px] font-bold uppercase tracking-[0.22em] text-cocoa" htmlFor="support-api-tenant">Tenant</label>
              <select
                id="support-api-tenant"
                value={tenantId}
                onChange={(event) => {
                  setTenantId(event.target.value);
                  setSelectedId("");
                }}
                className="focus-ring min-h-11 rounded-2xl border border-line bg-white px-4 text-sm font-semibold"
              >
                <option value="">All tenants</option>
                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>{tenant.name}</option>
                ))}
              </select>
              {selectedTenant ? <p className="text-xs text-muted">Viewing {selectedTenant.name}.</p> : null}
            </div>

            <div className="grid grid-cols-4 gap-2">
              {(["open", "pending", "resolved", "all"] as StatusFilter[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    setStatus(item);
                    setSelectedId("");
                  }}
                  className={`rounded-2xl px-3 py-2 text-xs font-bold capitalize transition ${status === item ? "bg-cocoa text-canvas" : "bg-white text-muted"}`}
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="rounded-3xl border border-line bg-white p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-cocoa">
                  <Activity size={14} /> Usage
                </p>
                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">{monthlyUsedUnits} used</span>
              </div>
              {selectedTenant ? (
                <div className="mb-3 rounded-2xl bg-canvas px-3 py-2">
                  <p className="text-xs font-bold text-ink">{monthlyRemainingUnits} of {monthlyUsageLimit} units remaining</p>
                  <p className="mt-1 text-[10px] text-muted">{usageSummary?.totalCalls || 0} successful calls this month.</p>
                </div>
              ) : (
                <p className="mb-3 text-xs text-muted">{usageSummary?.totalUnits || 0} units across all tenants this month.</p>
              )}
              <div className="space-y-2">
                {usageEvents.slice(0, 5).map((event) => (
                  <div key={event.id} className="rounded-2xl bg-canvas px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-xs font-bold text-ink">{event.operation}</p>
                      <span className={`text-[10px] font-bold ${event.statusCode >= 400 ? "text-danger" : "text-success"}`}>{event.statusCode}</span>
                    </div>
                    <p className="mt-1 text-[10px] text-muted">{event.method} · {formatDate(event.createdAt)}</p>
                  </div>
                ))}
                {!usageEvents.length ? (
                  <p className="text-xs text-muted">{usageLoading ? "Loading usage..." : "No API usage recorded yet."}</p>
                ) : null}
              </div>
            </div>

            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
              {conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => setSelectedId(conversation.id)}
                  className={`w-full rounded-2xl border p-3 text-left transition ${selectedId === conversation.id ? "border-olive bg-olive/10" : "border-line bg-white hover:border-olive/40"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-ink">{customerName(conversation)}</p>
                      <p className="truncate text-xs text-muted">{customerDetail(conversation)}</p>
                    </div>
                    {conversation.agentUnreadCount ? <span className="grid size-6 place-items-center rounded-full bg-cocoa text-xs font-bold text-canvas">{conversation.agentUnreadCount}</span> : null}
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted">{conversation.latestMessagePreview || conversation.subject || "No messages yet"}</p>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <StatusPill status={conversation.status} />
                    <span className="text-[10px] text-muted">{formatDate(conversation.lastMessageAt)}</span>
                  </div>
                </button>
              ))}
              {!conversations.length ? (
                <p className="rounded-2xl bg-white p-4 text-sm text-muted">{loading ? "Loading conversations..." : "No API conversations match this view."}</p>
              ) : null}
            </div>
          </Card>

          <Card className="flex min-h-[70svh] flex-col p-0">
            {selectedConversation ? (
              <>
                <div className="border-b border-line p-5">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-lg font-bold text-ink">{customerName(selectedConversation)}</p>
                      <p className="text-sm text-muted">{customerDetail(selectedConversation)}</p>
                      {selectedConversation.subject ? <p className="mt-2 text-sm font-semibold text-ink">{selectedConversation.subject}</p> : null}
                      <p className="mt-2 text-xs text-muted">Created {formatDate(selectedConversation.createdAt)}. Last activity {formatDate(selectedConversation.lastMessageAt)}.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedConversation.status === "resolved" ? (
                        <Button variant="secondary" onClick={() => updateStatus("open")}>Reopen</Button>
                      ) : (
                        <>
                          <Button variant="secondary" onClick={() => updateStatus("pending")}>Mark pending</Button>
                          <Button variant="secondary" onClick={() => updateStatus("resolved")}><CheckCircle2 size={16} /> Resolve</Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-canvas/30 p-5">
                  {messages.map((message) => {
                    const agent = message.senderType === "agent";
                    return (
                      <div key={message.id} className={`flex ${agent ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[82%] rounded-3xl px-4 py-3 text-sm shadow-soft ${agent ? "bg-olive text-canvas" : "border border-line bg-white text-ink"}`}>
                          <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.16em] opacity-70">{message.senderName || message.senderType}</p>
                          <p className="whitespace-pre-wrap leading-6">{message.body}</p>
                          <p className={`mt-2 text-[10px] ${agent ? "text-canvas/70" : "text-muted"}`}>{formatDate(message.createdAt)}</p>
                        </div>
                      </div>
                    );
                  })}
                  {!messages.length ? (
                    <div className="grid h-full place-items-center rounded-3xl border border-dashed border-line bg-white p-8 text-center">
                      <div>
                        <Inbox className="mx-auto mb-3 text-olive" size={28} />
                        <p className="font-bold text-ink">No messages yet.</p>
                        <p className="mt-1 text-sm text-muted">The conversation is ready when the customer writes in.</p>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="border-t border-line bg-surface p-4">
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <textarea
                      value={reply}
                      onChange={(event) => setReply(event.target.value)}
                      placeholder="Write a support reply..."
                      className="focus-ring min-h-24 flex-1 resize-none rounded-2xl border border-line bg-white px-4 py-3 text-sm"
                      maxLength={4000}
                    />
                    <Button className="sm:self-end" onClick={sendReply} disabled={sending || !reply.trim()}>
                      <Send size={16} /> {sending ? "Sending..." : "Send reply"}
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="grid flex-1 place-items-center p-8 text-center">
                <div>
                  <Inbox className="mx-auto mb-4 text-olive" size={34} />
                  <p className="font-editorial text-3xl font-semibold text-ink">Choose a conversation</p>
                  <p className="mt-2 text-sm text-muted">External API conversations will appear here.</p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </main>
  );
}
