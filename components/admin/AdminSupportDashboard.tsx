"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { CheckCircle2, ClipboardList, Inbox, RefreshCw, Send, StickyNote, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { ApiResponse } from "@/types/api";
import type { SupportConversationStatus, SupportConversationSummary, SupportInternalNote, SupportMessage, SupportOperationalContext } from "@/types/support";

type ListData = { conversations: SupportConversationSummary[] };
type MessagesData = { messages: SupportMessage[]; nextCursor: string | null };
type MessageAck = { message: SupportMessage; conversation: SupportConversationSummary };
type ContextData = { context: SupportOperationalContext };
type NotesData = { notes: SupportInternalNote[] };
type NoteData = { note: SupportInternalNote };
type StatusFilter = "all" | SupportConversationStatus;

async function jsonApi<T>(path: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(path, { ...options, credentials: "include" });
    return (await response.json()) as ApiResponse<T>;
  } catch {
    return { ok: false, error: { code: "INTERNAL_ERROR", message: "Unable to reach support inbox right now." } };
  }
}

function formatDate(value?: string | null) {
  if (!value) return "No activity";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function mergeMessage(messages: SupportMessage[], incoming: SupportMessage) {
  if (messages.some((message) => message.id === incoming.id)) return messages;
  return [...messages, incoming];
}

function StatusPill({ status }: { status: SupportConversationStatus }) {
  const tone = status === "open" ? "bg-success/10 text-success" : status === "pending" ? "bg-warning/15 text-espresso" : "bg-ink/5 text-muted";
  return <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${tone}`}>{status}</span>;
}

function ContextRow({ label, value, tone }: { label: string; value: string | number; tone?: "good" | "warn" | "bad" }) {
  const toneClass = tone === "bad" ? "text-danger" : tone === "warn" ? "text-espresso" : tone === "good" ? "text-success" : "text-ink";
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line/70 py-2 last:border-b-0">
      <span className="text-xs font-semibold text-muted">{label}</span>
      <span className={`max-w-[60%] truncate text-right text-xs font-bold ${toneClass}`}>{value || "n/a"}</span>
    </div>
  );
}

function formatMoney(amountMinor: number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: currency || "USD" }).format((amountMinor || 0) / 100);
}

export function AdminSupportDashboard({ agentName }: { agentName: string }) {
  const [conversations, setConversations] = useState<SupportConversationSummary[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [supportContext, setSupportContext] = useState<SupportOperationalContext | null>(null);
  const [notes, setNotes] = useState<SupportInternalNote[]>([]);
  const [status, setStatus] = useState<StatusFilter>("open");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [reply, setReply] = useState("");
  const [noteDraft, setNoteDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [contextLoading, setContextLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState("");

  const selectedConversation = useMemo(() => conversations.find((conversation) => conversation.id === selectedId) || null, [conversations, selectedId]);
  const totalUnread = useMemo(() => conversations.reduce((sum, conversation) => sum + conversation.supportUnreadCount, 0), [conversations]);

  const loadConversations = useCallback(async () => {
    setLoading(true);
    setFeedback("");
    const params = new URLSearchParams({ status, unread: unreadOnly ? "support" : "all", search });
    const result = await jsonApi<ListData>(`/api/admin/support/conversations?${params.toString()}`, { cache: "no-store" });
    if (result.ok) {
      setConversations(result.data.conversations);
      if (!selectedId && result.data.conversations[0]) setSelectedId(result.data.conversations[0].id);
    } else {
      setFeedback(result.error.message);
    }
    setLoading(false);
  }, [search, selectedId, status, unreadOnly]);

  const loadMessages = useCallback(async (conversationId: string) => {
    if (!conversationId) return;
    const result = await jsonApi<MessagesData>(`/api/admin/support/conversations/${conversationId}/messages`, { cache: "no-store" });
    if (result.ok) setMessages(result.data.messages);
    if (!result.ok) setFeedback(result.error.message);
  }, []);

  const loadSupportContext = useCallback(async (conversationId: string) => {
    if (!conversationId) return;
    setContextLoading(true);
    const [contextResult, notesResult] = await Promise.all([
      jsonApi<ContextData>(`/api/admin/support/conversations/${conversationId}/context`, { cache: "no-store" }),
      jsonApi<NotesData>(`/api/admin/support/conversations/${conversationId}/notes`, { cache: "no-store" })
    ]);
    if (contextResult.ok) setSupportContext(contextResult.data.context);
    if (!contextResult.ok) setFeedback(contextResult.error.message);
    if (notesResult.ok) setNotes(notesResult.data.notes);
    if (!notesResult.ok) setFeedback(notesResult.error.message);
    setContextLoading(false);
  }, []);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    void loadMessages(selectedId);
    void loadSupportContext(selectedId);
  }, [loadMessages, loadSupportContext, selectedId]);

  const updateConversation = useCallback((conversation: SupportConversationSummary) => {
    setConversations((current) => current.map((item) => (item.id === conversation.id ? conversation : item)));
  }, []);

  const sendReply = useCallback(async () => {
    const body = reply.trim();
    if (!selectedId || !body) return;
    setSending(true);
    const result = await jsonApi<MessageAck>(`/api/admin/support/conversations/${selectedId}/messages`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body, idempotencyKey: crypto.randomUUID() })
    });
    if (result.ok) {
      setReply("");
      setMessages((current) => mergeMessage(current, result.data.message));
      updateConversation(result.data.conversation);
    } else {
      setFeedback(result.error.message);
    }
    setSending(false);
  }, [reply, selectedId, updateConversation]);

  const patchConversation = useCallback(async (path: string, body: unknown) => {
    if (!selectedId) return;
    const result = await jsonApi<{ conversation: SupportConversationSummary }>(`/api/admin/support/conversations/${selectedId}/${path}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    });
    if (result.ok) updateConversation(result.data.conversation);
    if (!result.ok) setFeedback(result.error.message);
  }, [selectedId, updateConversation]);

  const saveNote = useCallback(async () => {
    const body = noteDraft.trim();
    if (!selectedId || !body) return;
    const result = await jsonApi<NoteData>(`/api/admin/support/conversations/${selectedId}/notes`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body })
    });
    if (result.ok) {
      setNotes((current) => [result.data.note, ...current]);
      setNoteDraft("");
    }
    if (!result.ok) setFeedback(result.error.message);
  }, [noteDraft, selectedId]);

  return (
    <main className="min-h-[100svh] bg-canvas px-5 py-6 text-ink sm:px-8 lg:px-12">
      <div className="mx-auto flex max-w-[1480px] flex-col gap-5">
        <header className="flex flex-col gap-4 rounded-xl4 border border-line bg-surface/90 p-5 shadow-card md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-3 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-cocoa"><Inbox size={14} /> Support inbox</p>
            <h1 className="font-editorial text-4xl font-semibold leading-none tracking-editorial sm:text-5xl">FitPick Support</h1>
            <p className="mt-3 text-sm text-muted">Signed in as {agentName}. {totalUnread ? `${totalUnread} unread customer message${totalUnread === 1 ? "" : "s"}.` : "Inbox is clear."}</p>
          </div>
          <Button variant="secondary" onClick={loadConversations} disabled={loading}><RefreshCw size={16} /> Refresh</Button>
        </header>

        {feedback ? <p className="rounded-2xl border border-danger/25 bg-danger/5 px-4 py-3 text-sm font-semibold text-danger">{feedback}</p> : null}

        <div className="grid min-h-[70svh] gap-5 lg:grid-cols-[26rem_minmax(0,1fr)]">
          <Card className="flex flex-col gap-4 p-4">
            <div className="grid grid-cols-3 gap-2">
              {(["open", "pending", "resolved"] as StatusFilter[]).map((item) => (
                <button key={item} type="button" onClick={() => setStatus(item)} className={`rounded-2xl px-3 py-2 text-xs font-bold capitalize transition ${status === item ? "bg-cocoa text-canvas" : "bg-white text-muted"}`}>{item}</button>
              ))}
            </div>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search customers" className="focus-ring min-h-11 rounded-2xl border border-line bg-white px-4 text-sm" />
            <label className="flex items-center gap-2 text-sm font-semibold text-muted">
              <input type="checkbox" checked={unreadOnly} onChange={(event) => setUnreadOnly(event.target.checked)} /> Unread only
            </label>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
              {conversations.map((conversation) => (
                <button key={conversation.id} type="button" onClick={() => setSelectedId(conversation.id)} className={`w-full rounded-2xl border p-3 text-left transition ${selectedId === conversation.id ? "border-olive bg-olive/10" : "border-line bg-white hover:border-olive/40"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-ink">{conversation.userName}</p>
                      <p className="truncate text-xs text-muted">{conversation.userEmail}</p>
                    </div>
                    {conversation.supportUnreadCount ? <span className="grid size-6 place-items-center rounded-full bg-cocoa text-xs font-bold text-canvas">{conversation.supportUnreadCount}</span> : null}
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted">{conversation.latestMessagePreview || "No messages yet"}</p>
                  <div className="mt-3 flex items-center justify-between gap-2"><StatusPill status={conversation.status} /><span className="text-[10px] text-muted">{formatDate(conversation.lastMessageAt)}</span></div>
                </button>
              ))}
              {!conversations.length ? <p className="rounded-2xl bg-white p-4 text-sm text-muted">No conversations match this view.</p> : null}
            </div>
          </Card>

          <Card className="flex min-h-[70svh] flex-col p-0">
            {selectedConversation ? (
              <>
                <div className="border-b border-line p-5">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-lg font-bold text-ink">{selectedConversation.userName}</p>
                      <p className="text-sm text-muted">{selectedConversation.userEmail}</p>
                      <p className="mt-2 text-xs text-muted">Created {formatDate(selectedConversation.createdAt)}. Last activity {formatDate(selectedConversation.lastMessageAt)}.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="secondary" onClick={() => patchConversation("assignment", {})}><UserCheck size={16} /> Assign to me</Button>
                      {selectedConversation.status === "resolved" ? (
                        <Button variant="secondary" onClick={() => patchConversation("status", { status: "open" })}>Reopen</Button>
                      ) : (
                        <Button variant="secondary" onClick={() => patchConversation("status", { status: "resolved" })}><CheckCircle2 size={16} /> Resolve</Button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 border-b border-line bg-canvas/35 p-5 xl:grid-cols-3">
                  <Card className="p-4 shadow-none">
                    <p className="mb-3 flex items-center gap-2 text-sm font-bold text-ink"><ClipboardList size={16} /> User overview</p>
                    {supportContext ? (
                      <>
                        <ContextRow label="Account" value={supportContext.user.accountStatus} tone="good" />
                        <ContextRow label="Credits" value={supportContext.user.credits.toFixed(2)} />
                        <ContextRow label="Closet items" value={supportContext.wardrobe.itemCount} />
                        <ContextRow label="Model setup" value={supportContext.user.modelSetupCompletedAt ? "complete" : "not complete"} tone={supportContext.user.modelSetupCompletedAt ? "good" : "warn"} />
                      </>
                    ) : <p className="text-xs text-muted">{contextLoading ? "Loading context..." : "No context loaded."}</p>}
                  </Card>

                  <Card className="p-4 shadow-none">
                    <p className="mb-3 text-sm font-bold text-ink">Recent try-on</p>
                    {supportContext?.tryOn.latest.length ? supportContext.tryOn.latest.slice(0, 3).map((item) => (
                      <div key={item.id} className="border-b border-line/70 py-2 last:border-b-0">
                        <div className="flex items-center justify-between gap-2"><span className="truncate text-xs font-bold text-ink">{item.generationId}</span><span className={`text-xs font-bold ${item.status === "failed" ? "text-danger" : item.status === "completed" ? "text-success" : "text-muted"}`}>{item.status}</span></div>
                        {item.safeIssue ? <p className="mt-1 line-clamp-2 text-xs text-muted">{item.safeIssue}</p> : null}
                      </div>
                    )) : <p className="text-xs text-muted">No recent try-on activity.</p>}
                  </Card>

                  <Card className="p-4 shadow-none">
                    <p className="mb-3 text-sm font-bold text-ink">Latest upload signals</p>
                    {supportContext?.wardrobe.latestUploads.length ? supportContext.wardrobe.latestUploads.slice(0, 3).map((item) => (
                      <div key={item.id} className="border-b border-line/70 py-2 last:border-b-0">
                        <div className="flex items-center justify-between gap-2"><span className="text-xs font-bold text-ink">{item.category}</span><span className="text-xs text-muted">{item.aiTagStatus}</span></div>
                        {item.safeIssue ? <p className="mt-1 line-clamp-2 text-xs text-muted">{item.safeIssue}</p> : null}
                      </div>
                    )) : <p className="text-xs text-muted">No recent wardrobe uploads.</p>}
                  </Card>
                </div>

                <div className="grid flex-1 overflow-hidden lg:grid-cols-[minmax(0,1fr)_22rem]">
                <div className="space-y-4 overflow-y-auto p-5">
                  {messages.map((message) => {
                    const mine = message.senderType === "support";
                    return (
                      <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[82%] rounded-3xl px-4 py-3 text-sm shadow-card ${mine ? "bg-cocoa text-canvas" : "border border-line bg-white text-ink"}`}>
                          {message.body ? <p className="whitespace-pre-wrap leading-6">{message.body}</p> : null}
                          {message.attachments.map((attachment) => (
                            <a key={attachment.key} href={attachment.url} target="_blank" rel="noreferrer" className="mt-3 block overflow-hidden rounded-2xl bg-white/20">
                              <Image src={attachment.url} alt={attachment.filename} width={attachment.width} height={attachment.height} className="max-h-72 w-full object-cover" />
                            </a>
                          ))}
                          <p className={`mt-2 text-[10px] ${mine ? "text-canvas/70" : "text-muted"}`}>{formatDate(message.createdAt)}</p>
                        </div>
                      </div>
                    );
                  })}
                  {!messages.length ? <p className="rounded-2xl border border-dashed border-line bg-canvas/60 p-5 text-sm text-muted">No messages in this conversation yet.</p> : null}
                </div>

                <aside className="space-y-4 overflow-y-auto border-t border-line bg-white/45 p-5 lg:border-l lg:border-t-0">
                  <div>
                    <p className="mb-3 flex items-center gap-2 text-sm font-bold text-ink"><StickyNote size={16} /> Internal notes</p>
                    <textarea value={noteDraft} onChange={(event) => setNoteDraft(event.target.value)} rows={3} placeholder="Add a private note" className="focus-ring w-full resize-none rounded-2xl border border-line bg-white px-4 py-3 text-sm" />
                    <Button variant="secondary" onClick={saveNote} disabled={!noteDraft.trim()} className="mt-2 w-full">Save note</Button>
                  </div>
                  <div className="space-y-3">
                    {notes.map((note) => (
                      <div key={note.id} className="rounded-2xl border border-line bg-white p-3">
                        <p className="text-xs font-bold text-ink">{note.authorName}</p>
                        <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-muted">{note.body}</p>
                        <p className="mt-2 text-[10px] text-muted">{formatDate(note.createdAt)}</p>
                      </div>
                    ))}
                    {!notes.length ? <p className="rounded-2xl border border-dashed border-line bg-white p-3 text-xs text-muted">No internal notes yet.</p> : null}
                  </div>

                  {supportContext ? (
                    <div className="rounded-2xl border border-line bg-white p-3">
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-cocoa">Troubleshooting</p>
                      <div className="mt-3 space-y-2">
                        <ContextRow label="Ready items" value={supportContext.wardrobe.readyCount} tone="good" />
                        <ContextRow label="Needs care" value={supportContext.wardrobe.needsCareCount} tone={supportContext.wardrobe.needsCareCount ? "warn" : undefined} />
                        <ContextRow label="Recent jobs" value={supportContext.jobs.latest.length} />
                        <ContextRow label="Transactions" value={supportContext.credits.latestTransactions.length} />
                      </div>
                      {supportContext.jobs.latest.slice(0, 3).map((job) => (
                        <div key={job.id} className="mt-3 rounded-xl border border-line/70 bg-canvas/60 p-2">
                          <div className="flex items-center justify-between gap-2"><span className="truncate text-xs font-bold text-ink">{job.type}</span><span className={`text-xs font-bold ${job.status === "failed" || job.status === "dead_letter" ? "text-danger" : "text-muted"}`}>{job.status}</span></div>
                          {job.safeIssue ? <p className="mt-1 line-clamp-2 text-xs text-muted">{job.safeIssue}</p> : null}
                        </div>
                      ))}
                      {supportContext.credits.latestPurchases.slice(0, 2).map((purchase) => (
                        <div key={purchase.id} className="mt-3 rounded-xl border border-line/70 bg-canvas/60 p-2">
                          <p className="text-xs font-bold text-ink">{purchase.packName} · {purchase.status}</p>
                          <p className="mt-1 text-xs text-muted">{purchase.credits} Credits · {formatMoney(purchase.amountMinor, purchase.currency)}</p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </aside>
                </div>

                <div className="border-t border-line p-4">
                  <div className="flex items-end gap-2">
                    <textarea value={reply} onChange={(event) => setReply(event.target.value)} rows={2} placeholder="Reply to customer" className="focus-ring min-h-14 flex-1 resize-none rounded-2xl border border-line bg-white px-4 py-3 text-sm" />
                    <Button onClick={sendReply} disabled={sending || !reply.trim()}><Send size={17} /> Send</Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="grid flex-1 place-items-center p-8 text-center text-muted">Select a conversation.</div>
            )}
          </Card>
        </div>
      </div>
    </main>
  );
}
