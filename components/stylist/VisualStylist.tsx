"use client";

import { useState } from "react";

export function VisualStylist() {
  const [imageUrl, setImageUrl] =
    useState("");

  const [question, setQuestion] =
    useState("");

  const [answer, setAnswer] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  async function analyze() {
    if (!imageUrl) return;

    setLoading(true);

    try {
      const response = await fetch(
        "/api/stylist/vision",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            imageUrl,
            question
          })
        }
      );

      const data = await response.json();

      setAnswer(data.reply);

    } catch {
      setAnswer(
        "Unable to analyze image."
      );
    }

    setLoading(false);
  }

  return (
    <div className="space-y-4 rounded-xl border p-4">

      <h2 className="text-xl font-semibold">
        Visual Stylist
      </h2>

      <input
        placeholder="Image URL"
        value={imageUrl}
        onChange={(e) =>
          setImageUrl(e.target.value)
        }
        className="w-full rounded border p-3"
      />

      <input
        placeholder="Ask a question"
        value={question}
        onChange={(e) =>
          setQuestion(e.target.value)
        }
        className="w-full rounded border p-3"
      />

      <button
        onClick={analyze}
        className="rounded bg-cocoa px-4 py-2 text-white"
      >
        {loading
          ? "Analyzing..."
          : "Analyze Outfit"}
      </button>

      {answer && (
        <div className="rounded border p-4">
          {answer}
        </div>
      )}
    </div>
  );
}
