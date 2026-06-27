"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { cn } from "@/lib/utils";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const promptSuggestions = [
  "Style me for church this Sunday",
  "Build a polished date night outfit",
  "What should I wear to a Nigerian wedding?",
  "Give me a business casual look for a hot day"
];

export function StylistChat() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const recentMessages = useMemo(() => messages.slice(-8), [messages]);

  async function askStylist() {
    const trimmed = message.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError("");
    setMessage("");
    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages(nextMessages);

    try {
      const response = await fetch("/api/stylist/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: trimmed,
          recentMessages: recentMessages.map((entry) => ({ role: entry.role, content: entry.content }))
        }),
      });

      const data = await response.json();
      const reply = data.data?.reply || "No recommendation available.";
      setMessages((current) => [...current, { role: "assistant", content: reply }]);
    } catch {
      setError("Unable to reach FitPick Stylist right now.");
    }

    setLoading(false);
  }

  return (
    <section className="space-y-4">
      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-ink">Premium personal stylist</p>
            <p className="mt-1 text-xs leading-5 text-muted">Grounded in your wardrobe, Style DNA, and fashion memory.</p>
          </div>
          <Badge tone="premium">Wardrobe-only</Badge>
        </div>

        <div className="flex flex-wrap gap-2">
          {promptSuggestions.map((prompt) => (
            <button
              key={prompt}
              type="button"
              className="focus-ring rounded-full"
              onClick={() => setMessage(prompt)}
              disabled={loading}
            >
              <Chip>{prompt}</Chip>
            </button>
          ))}
        </div>
      </Card>

      <Card className="space-y-3">
        <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1" aria-live="polite">
          {messages.length ? (
            messages.map((entry, index) => (
              <div
                key={`${entry.role}-${index}`}
                className={cn(
                  "rounded-2xl px-3 py-2 text-sm leading-6",
                  entry.role === "user" ? "ml-8 bg-cocoa text-white" : "mr-8 border border-line bg-white text-ink"
                )}
              >
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] opacity-80">
                  {entry.role === "user" ? "You" : "FitPick Stylist"}
                </p>
                <p className="whitespace-pre-wrap">{entry.content}</p>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-line bg-white px-4 py-5 text-center">
              <p className="text-sm font-semibold text-ink">Ask for a complete look</p>
              <p className="mt-2 text-xs leading-5 text-muted">Try occasion, weather, mood, or dress code. FitPick will stay grounded in what you own.</p>
            </div>
          )}

          {loading ? (
            <div className="mr-8 rounded-2xl border border-line bg-white px-3 py-2 text-sm leading-6 text-muted">
              Styling from your verified wardrobe...
            </div>
          ) : null}
        </div>

        {error ? <p className="rounded-2xl bg-danger/10 px-3 py-2 text-xs font-semibold text-ink">{error}</p> : null}

        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            void askStylist();
          }}
        >
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Ask FitPick what to wear..."
            className="focus-ring min-h-28 w-full resize-none rounded-2xl border border-line bg-white px-3 py-3 text-sm leading-6 text-ink outline-none placeholder:text-muted"
          />

          <Button type="submit" className="w-full" disabled={loading || !message.trim()}>
            {loading ? "Styling..." : "Ask FitPick Stylist"}
          </Button>
        </form>
      </Card>
    </section>
  );
}
