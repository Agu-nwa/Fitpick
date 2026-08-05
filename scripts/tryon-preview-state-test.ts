import assert from "node:assert/strict";
import {
  TRYON_DELAYED_AFTER_MS,
  creditRestorationConfirmed,
  deriveTryOnPreviewUiState,
  resolveTryOnOrigin,
  shouldPollTryOnPreview,
  tryOnOriginDestination,
  tryOnOriginLabel
} from "@/lib/tryon/preview-ui-state";

const startedAt = "2026-08-05T00:00:00.000Z";
const startedAtMs = Date.parse(startedAt);

assert.equal(deriveTryOnPreviewUiState({ preview: { status: "not_started" } }), "idle");
assert.equal(deriveTryOnPreviewUiState({ preview: { status: "generating" }, generation: { status: "queued", startedAt }, now: startedAtMs + 1_000 }), "queued");
assert.equal(deriveTryOnPreviewUiState({ preview: { status: "generating" }, job: { status: "processing", startedAt }, now: startedAtMs + 5_000 }), "processing");
assert.equal(deriveTryOnPreviewUiState({ preview: { status: "generating" }, job: { status: "processing", startedAt }, now: startedAtMs + TRYON_DELAYED_AFTER_MS }), "delayed");
assert.equal(deriveTryOnPreviewUiState({ preview: { status: "ready" }, imageUrl: "https://cdn.example.com/preview.webp" }), "completed");
assert.equal(deriveTryOnPreviewUiState({ preview: { status: "failed" } }), "failed");
assert.equal(deriveTryOnPreviewUiState({ job: { status: "dead_letter" } }), "failed");
assert.equal(deriveTryOnPreviewUiState({ generation: { status: "expired" } }), "failed");
assert.equal(deriveTryOnPreviewUiState({ requestPending: true }), "processing");
assert.equal(deriveTryOnPreviewUiState({ localFailure: true }), "failed");

assert.equal(shouldPollTryOnPreview("queued"), true);
assert.equal(shouldPollTryOnPreview("processing"), true);
assert.equal(shouldPollTryOnPreview("delayed"), true);
assert.equal(shouldPollTryOnPreview("completed"), false);
assert.equal(shouldPollTryOnPreview("failed"), false);

assert.equal(resolveTryOnOrigin("create_look"), "create_look");
assert.equal(resolveTryOnOrigin("match"), "match");
assert.equal(resolveTryOnOrigin(undefined, { referenceItemIds: ["reference"], source: "stylist_chat" } as any), "match");
assert.equal(resolveTryOnOrigin(undefined, { source: "stylist_chat" } as any), "stylist_chat");
assert.equal(resolveTryOnOrigin("unknown", { source: "system" } as any), "stylist");
assert.equal(tryOnOriginDestination("create_look"), "/stylist/create-look");
assert.equal(tryOnOriginDestination("match"), "/stylist/match");
assert.equal(tryOnOriginDestination("stylist_chat"), "/stylist");
assert.equal(tryOnOriginLabel("create_look"), "Back to Create a Look");

assert.equal(creditRestorationConfirmed({ generation: { creditsReleased: 1 } }), true);
assert.equal(creditRestorationConfirmed({ preview: { status: "failed", billingStatus: "refunded" } }), true);
assert.equal(creditRestorationConfirmed({ preview: { status: "failed", billingStatus: "pending" } }), false);

console.log("Try-on waiting-state lifecycle checks passed.");
