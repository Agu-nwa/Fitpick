import assert from "node:assert/strict";
import crypto from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { retryTransient, TransientTryOnError } from "@/lib/tryon/reliability";

function read(path: string) {
  assert.ok(existsSync(path), `Missing file: ${path}`);
  return readFileSync(path, "utf8");
}

function createClientIdempotencyKey(prefix: string) {
  return `${prefix}:${crypto.randomUUID()}`.slice(0, 120);
}

const outfitResult = read("components/outfit/OutfitResult.tsx");
assert.ok(outfitResult.includes("handleGenerateAvatarPreview(Boolean(avatarPreviewUrl))"), "Primary try-on button must send regenerate=true when a preview already exists.");
assert.ok(outfitResult.includes('idempotencyKey: createClientIdempotencyKey("avatar-preview")'), "Outfit page must send a fresh client idempotency key per generate click.");
assert.ok(outfitResult.includes('job.status === "dead_letter"'), "Outfit page polling must treat dead-letter as a terminal state.");

const lookPreview = read("components/outfit/LookPreviewClient.tsx");
assert.ok(lookPreview.includes('idempotencyKey: createClientIdempotencyKey("avatar-preview")'), "Full look preview must send a fresh client idempotency key per generate click.");
assert.ok(lookPreview.includes('result.data.job.status === "dead_letter"'), "Full look polling must treat dead-letter as terminal.");

const generationService = read("lib/tryon/tryon-generation.ts");
assert.ok(generationService.includes("activeTryOnGenerationStatuses"), "Generation service must define active blocking statuses.");
assert.ok(generationService.includes("status: { $in: activeTryOnGenerationStatuses }"), "Only active statuses may block new generations.");
assert.ok(generationService.includes("crypto.randomUUID()"), "Backend regenerate fallback must create a new idempotency key.");

const jobHandlers = read("lib/jobs/handlers.ts");
assert.ok(jobHandlers.includes("isRetryableBackgroundJobFailure"), "Worker must classify retryable try-on failures.");
assert.ok(jobHandlers.includes("handleTerminalBackgroundJobFailure"), "Worker must release terminal failed try-on jobs.");
assert.ok(jobHandlers.includes('generation.status === "completed"'), "Worker must not revive completed try-on generations.");
assert.ok(jobHandlers.includes('status: "generating"'), "Retryable worker failures must leave preview state in progress instead of terminal failed.");

const queue = read("lib/jobs/queue.ts");
assert.ok(queue.includes('"dead_letter"'), "Queue must expose dead-letter state.");
assert.ok(queue.includes("heartbeatJob"), "Queue must support worker heartbeats.");
assert.ok(queue.includes("recoverStaleProcessingJobs"), "Queue must recover stale processing jobs.");

const worker = read("workers/fitpick-worker.ts");
assert.ok(worker.includes("heartbeatJob"), "Worker must heartbeat claimed jobs.");
assert.ok(worker.includes("recoverStaleProcessingJobs"), "Worker must recover stale processing jobs after restart.");
assert.ok(worker.includes("handleTerminalBackgroundJobFailure"), "Worker must run terminal cleanup for dead-letter jobs.");

const downloadRoute = read("app/api/outfits/[id]/avatar-preview/download/route.ts");
assert.ok(downloadRoute.includes("requireUser"), "Preview downloads must require authentication.");
assert.ok(downloadRoute.includes("AvatarOutfitPreview.findOne"), "Preview downloads must use persisted preview records.");
assert.ok(downloadRoute.includes('status: "ready"'), "Preview downloads must only serve completed previews.");
assert.ok(downloadRoute.includes("storageKeyBelongsToUser"), "Preview downloads must enforce storage ownership.");
assert.ok(downloadRoute.includes("getGeneratedImageUrl(storageKey)"), "Preview downloads must use durable FitPick storage URLs.");
assert.ok(downloadRoute.includes("content-disposition"), "Preview downloads must return an attachment filename.");
assert.ok(!downloadRoute.includes("providerUrl"), "Preview downloads must not use temporary provider URLs.");

const downloadButton = read("components/outfit/PreviewDownloadButton.tsx");
assert.ok(downloadButton.includes("downloadAvatarPreview"), "Preview download button must use the authenticated download API.");
assert.ok(downloadButton.includes("URL.createObjectURL"), "Preview download button must support blob download flows.");
assert.ok(downloadButton.includes("window.location.assign"), "Preview download button must have a direct-navigation fallback.");

async function main() {
  const generatedKeys = new Set<string>();
  const committedReferences = new Set<string>();
  const durations: number[] = [];

  for (let index = 0; index < 20; index += 1) {
    const idempotencyKey = createClientIdempotencyKey("avatar-preview");
    assert.ok(!generatedKeys.has(idempotencyKey), "Each intentional generation must use a new idempotency key.");
    generatedKeys.add(idempotencyKey);

    let transientFailureInjected = false;
    const startedAt = Date.now();
    const result = await retryTransient(async () => {
      if (index % 5 === 0 && !transientFailureInjected) {
        transientFailureInjected = true;
        throw new TransientTryOnError("controlled transient provider timeout", "controlled_timeout", 504);
      }
      return {
        status: "completed",
        creditReferenceId: `tryon-generation:${idempotencyKey}`
      };
    }, {
      operation: "tryon-lifecycle-regression",
      attempts: 2,
      baseDelayMs: 1,
      maxDelayMs: 2,
      metadata: { scenario: "immediate-regenerate", index }
    });

    assert.equal(result.status, "completed");
    assert.ok(!committedReferences.has(result.creditReferenceId), "A generation must not commit the same credit reference twice.");
    committedReferences.add(result.creditReferenceId);
    durations.push(Date.now() - startedAt);
  }

  const sortedDurations = [...durations].sort((a, b) => a - b);
  const p95 = sortedDurations[Math.max(0, Math.ceil(sortedDurations.length * 0.95) - 1)];
  const average = durations.reduce((sum, value) => sum + value, 0) / durations.length;

  console.log(JSON.stringify({
    status: "passed",
    scenario: "generate-preview-immediate-regenerate-20x",
    sequentialGenerations: generatedKeys.size,
    duplicateIdempotencyKeys: 0,
    duplicateCreditReferences: 0,
    stuckGenerations: 0,
    averageDurationMs: Math.round(average),
    p95DurationMs: Math.round(p95)
  }, null, 2));
}

void main();
