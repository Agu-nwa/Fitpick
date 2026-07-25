"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { CheckCircle2, Inbox, RefreshCw, Send, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { ApiResponse } from "@/types/api";
import type { SupportConversationStatus, SupportConversationSummary, SupportMessage } from "@/types/support";

type ListData = { conversations: SupportConversationSummary[] };
type MessagesData = { messages: SupportMessage[]; nextCursor: string | null };
type MessageAck = { message: SupportMessage; conversation: SupportConversationSummary };
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

export function AdminSupportDashboard({ agentName }: { agentName: string }) {
  const [conversations, setConversations] = useState<SupportConversationSummary[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [status, setStatus] = useState<StatusFilter>("open");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);
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

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    void loadMessages(selectedId);
  }, [loadMessages, selectedId]);

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

                <div className="flex-1 space-y-4 overflow-y-auto p-5">
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
