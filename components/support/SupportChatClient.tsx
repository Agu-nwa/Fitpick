"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, Send, ShieldCheck } from "lucide-react";
import { io, type Socket } from "socket.io-client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { ApiResponse } from "@/types/api";
import type { SupportAttachment, SupportConversationSummary, SupportMessage } from "@/types/support";

type InitialData = {
  conversation: SupportConversationSummary | null;
  messages: SupportMessage[];
  nextCursor?: string | null;
  config: {
    enabled: boolean;
    realtimeUrl: string;
    messageMaxLength: number;
    attachmentMaxBytes: number;
  };
};

type SendAck = { message: SupportMessage; conversation: SupportConversationSummary; deduplicated?: boolean };
type LoadState = "loading" | "ready" | "error";
type ConnectionState = "offline" | "connecting" | "connected" | "fallback";

async function api<T>(path: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(path, { ...options, credentials: "include" });
    return (await response.json()) as ApiResponse<T>;
  } catch {
    return { ok: false, error: { code: "INTERNAL_ERROR", message: "We couldn’t send your message. Please try again." } };
  }
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function mergeMessage(messages: SupportMessage[], incoming: SupportMessage) {
  if (messages.some((message) => message.id === incoming.id)) return messages;
  return [...messages, incoming];
}

export function SupportChatClient({ userName }: { userName: string }) {
  const [state, setState] = useState<LoadState>("loading");
  const [connection, setConnection] = useState<ConnectionState>("offline");
  const [config, setConfig] = useState<InitialData["config"] | null>(null);
  const [conversation, setConversation] = useState<SupportConversationSummary | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<SupportAttachment[]>([]);
  const [feedback, setFeedback] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [typing, setTyping] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const supportOnline = connection === "connected";
  const disabled = !config?.enabled;

  const scrollToLatest = useCallback(() => {
    requestAnimationFrame(() => scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }));
  }, []);

  const loadConversation = useCallback(async () => {
    setState("loading");
    const result = await api<InitialData>("/api/support/conversation", { cache: "no-store" });
    if (!result.ok) {
      setFeedback("We couldn’t load your messages. Please try again.");
      setState("error");
      return;
    }
    setConfig(result.data.config);
    setConversation(result.data.conversation);
    setMessages(result.data.messages || []);
    setState("ready");
    scrollToLatest();
  }, [scrollToLatest]);

  useEffect(() => {
    void loadConversation();
  }, [loadConversation]);

  useEffect(() => {
    if (!config?.enabled || !config.realtimeUrl) {
      setConnection(config?.enabled ? "fallback" : "offline");
      return;
    }

    let cancelled = false;
    void (async () => {
      setConnection("connecting");
      const tokenResult = await api<{ token: string }>("/api/support/socket-token", { cache: "no-store" });
      if (!tokenResult.ok || cancelled) {
        setConnection("fallback");
        return;
      }
      const socket = io(config.realtimeUrl, { auth: { token: tokenResult.data.token }, withCredentials: true, reconnectionAttempts: 6, timeout: 8000 });
      socketRef.current = socket;
      socket.on("connect", () => {
        setConnection("connected");
        if (conversation?.id) socket.emit("support:join", { conversationId: conversation.id });
      });
      socket.on("disconnect", () => setConnection("fallback"));
      socket.on("connect_error", () => setConnection("fallback"));
      socket.on("support:message:new", (payload: SendAck) => {
        setConversation(payload.conversation);
        setMessages((current) => mergeMessage(current, payload.message));
        scrollToLatest();
      });
      socket.on("support:conversation:update", (payload: SupportConversationSummary) => setConversation(payload));
      socket.on("support:typing", (payload: { actorRole: string; isTyping: boolean }) => setTyping(payload.actorRole === "admin" && payload.isTyping));
    })();

    return () => {
      cancelled = true;
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [config, conversation?.id, scrollToLatest]);

  useEffect(() => {
    if (!conversation?.id) return;
    void fetch(`/api/support/conversations/${conversation.id}/read`, { method: "POST", credentials: "include" });
  }, [conversation?.id, messages.length]);

  const ensureConversation = useCallback(async () => {
    if (conversation) return conversation;
    const result = await api<{ conversation: SupportConversationSummary }>("/api/support/conversation", { method: "POST" });
    if (!result.ok) throw new Error("We couldn’t send your message. Please try again.");
    setConversation(result.data.conversation);
    socketRef.current?.emit("support:join", { conversationId: result.data.conversation.id });
    return result.data.conversation;
  }, [conversation]);

  const sendMessage = useCallback(async () => {
    const cleanBody = body.trim();
    if (!cleanBody && attachments.length === 0) return;
    setSending(true);
    setFeedback("");
    try {
      const activeConversation = await ensureConversation();
      const payload = { conversationId: activeConversation.id, body: cleanBody, attachments, idempotencyKey: crypto.randomUUID() };
      const fallbackSend = async () => api<SendAck>(`/api/support/conversations/${activeConversation.id}/messages`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      if (socketRef.current?.connected) {
        socketRef.current.emit("support:message:send", payload, async (ack: ApiResponse<SendAck>) => {
          const result = ack?.ok ? ack : await fallbackSend();
          if (!result.ok) setFeedback("We couldn’t send your message. Please try again.");
          if (result.ok) {
            setConversation(result.data.conversation);
            setMessages((current) => mergeMessage(current, result.data.message));
            setBody("");
            setAttachments([]);
            scrollToLatest();
          }
          setSending(false);
        });
        return;
      }
      const result = await fallbackSend();
      if (!result.ok) setFeedback("We couldn’t send your message. Please try again.");
      if (result.ok) {
        setConversation(result.data.conversation);
        setMessages((current) => mergeMessage(current, result.data.message));
        setBody("");
        setAttachments([]);
        scrollToLatest();
      }
    } catch {
      setFeedback("We couldn’t send your message. Please try again.");
    } finally {
      if (!socketRef.current?.connected) setSending(false);
    }
  }, [attachments, body, ensureConversation, scrollToLatest]);

  const uploadAttachment = useCallback(async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    setFeedback("");
    const formData = new FormData();
    formData.append("file", file);
    const result = await fetch("/api/support/attachments", { method: "POST", credentials: "include", body: formData });
    const payload = (await result.json()) as ApiResponse<{ attachment: SupportAttachment }>;
    if (payload.ok) setAttachments((current) => [...current, payload.data.attachment].slice(0, 4));
    if (!payload.ok) setFeedback("We couldn’t send your message. Please try again.");
    setUploading(false);
  }, []);

  const statusCopy = useMemo(() => {
    if (disabled) return "Tell us what happened. We’ll take a look.";
    if (supportOnline) return "MyFitPick Support";
    return "Tell us what happened. We’ll take a look.";
  }, [disabled, supportOnline]);

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-5">
      <header className="rounded-xl4 border border-line bg-surface/85 p-5 shadow-card sm:p-8">
        <p className="mb-3 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-cocoa">
          <ShieldCheck size={14} aria-hidden="true" /> Message support
        </p>
        <h1 className="font-editorial text-4xl font-semibold leading-none tracking-editorial text-ink sm:text-5xl">Message support</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">{statusCopy}</p>
      </header>

      <Card className="flex min-h-[62svh] flex-1 flex-col p-0">
        <div className="border-b border-line px-5 py-4">
          <p className="text-sm font-semibold text-ink">MyFitPick Support</p>
          <p className="mt-1 text-xs text-muted">{connection === "connected" ? "We’ll take a look." : connection === "connecting" ? "Connecting..." : "We’ll take a look."}</p>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-6">
          {state === "loading" ? <p className="text-sm text-muted">Loading your conversation...</p> : null}
          {state === "error" ? <p className="text-sm text-danger">{feedback || "We couldn’t load your messages. Please try again."}</p> : null}
          {state === "ready" && messages.length === 0 ? (
            <div className="rounded-xl3 border border-dashed border-line bg-canvas/60 p-5 text-sm leading-6 text-muted">
              Tell us what happened. We’ll take a look.
            </div>
          ) : null}
          {messages.map((message) => {
            const mine = message.senderType === "user";
            return (
              <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[84%] rounded-3xl px-4 py-3 text-sm shadow-card ${mine ? "bg-cocoa text-canvas" : "border border-line bg-white text-ink"}`}>
                  {message.body ? <p className="whitespace-pre-wrap leading-6">{message.body}</p> : null}
                  {message.attachments.length ? (
                    <div className="mt-3 grid gap-2">
                      {message.attachments.map((attachment) => (
                        <a key={attachment.key} href={attachment.url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-2xl bg-white/20">
                          <Image src={attachment.url} alt={attachment.filename} width={attachment.width} height={attachment.height} className="max-h-64 w-full object-cover" />
                        </a>
                      ))}
                    </div>
                  ) : null}
                  <p className={`mt-2 text-[10px] ${mine ? "text-canvas/70" : "text-muted"}`}>{formatTime(message.createdAt)}</p>
                </div>
              </div>
            );
          })}
          {typing ? <p className="text-xs font-semibold text-muted">Support is replying...</p> : null}
          <div ref={scrollRef} />
        </div>

        {attachments.length ? (
          <div className="flex flex-wrap gap-2 border-t border-line px-4 py-3">
            {attachments.map((attachment) => (
              <button key={attachment.key} type="button" onClick={() => setAttachments((current) => current.filter((item) => item.key !== attachment.key))} className="rounded-full border border-line bg-white px-3 py-1 text-xs font-semibold text-muted">
                {attachment.filename} x
              </button>
            ))}
          </div>
        ) : null}

        <div className="border-t border-line p-4 sm:p-5">
          {feedback ? <p className="mb-3 text-sm font-semibold text-danger">{feedback}</p> : null}
          <div className="flex items-end gap-2">
            <label className="focus-ring inline-flex min-h-12 cursor-pointer items-center justify-center rounded-2xl border border-line bg-white px-4 text-muted transition hover:text-cocoa">
              <ImagePlus size={18} aria-hidden="true" />
              <span className="sr-only">Attach image</span>
              <input aria-label="Attach image" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={uploading || disabled} onChange={(event) => void uploadAttachment(event.target.files?.[0] || null)} />
            </label>
            <textarea
              aria-label="Support message"
              value={body}
              onChange={(event) => {
                setBody(event.target.value);
                socketRef.current?.emit("support:typing:start", { conversationId: conversation?.id });
              }}
              rows={1}
              maxLength={config?.messageMaxLength || 2000}
              disabled={disabled}
              placeholder="Describe the issue here..."
              className="focus-ring min-h-12 flex-1 resize-none rounded-2xl border border-line bg-white px-4 py-3 text-sm outline-none"
            />
            <Button onClick={sendMessage} disabled={sending || uploading || disabled || (!body.trim() && attachments.length === 0)} className="min-h-12 rounded-2xl px-4">
              <Send size={18} aria-hidden="true" />
              <span className="sr-only">Send</span>
            </Button>
          </div>
        </div>
      </Card>
    </section>
  );
}
