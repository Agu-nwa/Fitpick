"use client";

import { useState } from "react";

export function StylistChat() {
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);

  async function askStylist() {
    if (!message.trim()) return;

    setLoading(true);

    try {
      const response = await fetch(
        "/api/stylist/chat",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            message
          })
        }
      );

      const data = await response.json();

      setReply(
        data.data?.reply ||
          "No recommendation available."
      );
    } catch {
      setReply(
        "Unable to reach AI Stylist."
      );
    }

    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <textarea
        value={message}
        onChange={(e) =>
          setMessage(e.target.value)
        }
        placeholder="Ask FitPick what to wear..."
        className="w-full rounded-lg border p-4"
      />

      <button
        onClick={askStylist}
        className="rounded-lg bg-black px-4 py-2 text-white"
      >
        {loading
          ? "Thinking..."
          : "Ask Stylist"}
      </button>

      {reply && (
        <div className="rounded-lg border p-4">
          <h3 className="font-bold mb-2">
            FitPick Stylist
          </h3>

          <p>{reply}</p>
        </div>
      )}
    </div>
  );
}