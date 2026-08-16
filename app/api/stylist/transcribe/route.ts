export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { toFile } from "openai";

import { apiError, apiSuccess } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { requestMeta } from "@/lib/audit";
import { openai } from "@/lib/ai/openai";
import { rateLimitRequest } from "@/lib/rate-limit";
import { logSafeError } from "@/lib/security/safe-log";

const MAX_AUDIO_BYTES = 10 * 1024 * 1024;
const MAX_TRANSCRIPT_LENGTH = 800;
const allowedAudioTypes = new Set([
  "audio/mp4",
  "audio/mpeg",
  "audio/ogg",
  "audio/wav",
  "audio/webm",
  "audio/x-m4a",
  "video/mp4",
  "video/webm"
]);

function extensionForAudioType(contentType: string) {
  if (contentType.includes("webm")) return "webm";
  if (contentType.includes("ogg")) return "ogg";
  if (contentType.includes("wav")) return "wav";
  if (contentType.includes("mpeg")) return "mp3";
  return "m4a";
}

export async function POST(request: NextRequest) {
  const meta = requestMeta(request);
  const limited = rateLimitRequest({
    key: `stylist-transcribe:${meta.ip}`,
    limit: 12,
    windowMs: 60 * 1000,
    operation: "stylist-transcribe"
  });
  if (limited) return limited;

  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    if (!process.env.OPENAI_API_KEY && !process.env.OPENAI_ADMIN_KEY) {
      return apiError("SETUP_REQUIRED", "Voice notes are not configured yet.");
    }

    const formData = await request.formData();
    const audio = formData.get("audio");
    if (!(audio instanceof File)) return apiError("BAD_REQUEST", "Record a voice note first.");

    const contentType = String(audio.type || "").toLowerCase().split(";")[0];
    if (!allowedAudioTypes.has(contentType)) {
      return apiError("VALIDATION_ERROR", "That recording format is not supported. Try recording again.");
    }
    if (audio.size < 512) return apiError("VALIDATION_ERROR", "That voice note was too short. Try again.");
    if (audio.size > MAX_AUDIO_BYTES) return apiError("VALIDATION_ERROR", "Keep voice notes under one minute.");

    const providerFile = await toFile(
      Buffer.from(await audio.arrayBuffer()),
      `stylist-voice-note.${extensionForAudioType(contentType)}`,
      { type: contentType }
    );
    const result = await openai.audio.transcriptions.create({
      file: providerFile,
      model: process.env.OPENAI_TRANSCRIPTION_MODEL || "gpt-4o-mini-transcribe",
      response_format: "json",
      prompt: "Transcribe a personal fashion styling request. Preserve clothing names, occasions, colors, weather details, and footwear or accessory preferences."
    }, { timeout: 45_000 });

    const transcript = String(result.text || "").trim();
    if (!transcript) return apiError("BAD_REQUEST", "I couldn't hear a clear request. Try recording again.");

    const text = transcript.slice(0, MAX_TRANSCRIPT_LENGTH);
    return apiSuccess({ text, truncated: transcript.length > MAX_TRANSCRIPT_LENGTH });
  } catch (error) {
    logSafeError("stylist.voice-transcription", error, { stage: "transcription" });
    return apiError("INTERNAL_ERROR", "I couldn't transcribe that voice note. Try again or type your request.");
  }
}
