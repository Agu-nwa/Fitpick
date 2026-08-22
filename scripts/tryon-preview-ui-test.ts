import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("components/outfit/LookPreviewClient.tsx", "utf8");
const helperSource = readFileSync("lib/tryon/preview-ui-state.ts", "utf8");
const routeSource = readFileSync("app/api/outfits/[id]/avatar-preview/route.ts", "utf8");
const pageSource = readFileSync("app/outfit/[id]/preview/page.tsx", "utf8");
const stylistSource = readFileSync("components/stylist/StylistChat.tsx", "utf8");
const shellSource = readFileSync("components/layout/AppShell.tsx", "utf8");
const notificationSource = readFileSync("lib/notifications/app-notifications.ts", "utf8");

for (const state of ["idle", "queued", "processing", "delayed", "completed", "failed"]) {
  assert.ok(helperSource.includes(`"${state}"`), `Preview lifecycle helper must support ${state}.`);
}

assert.ok(source.includes("deriveTryOnPreviewUiState"), "Preview page must derive one explicit lifecycle state.");
assert.ok(source.includes("shouldPollTryOnPreview"), "Preview page must poll only active lifecycle states.");
assert.ok(source.includes("getAvatarPreview(outfitId)"), "Polling must refresh durable persisted preview state.");
assert.ok(!source.includes("getJobStatus"), "Preview polling must not depend on a transient client-held job id.");
assert.ok(source.includes("pollDelays"), "Preview polling must use backoff.");
assert.ok(source.includes("You’ll see a notification in MyFitPick when it is ready."), "Waiting copy must accurately promise an in-app notification.");
assert.ok(source.includes("You can safely leave this page and return later."), "Waiting state must tell users they can leave safely.");
assert.ok(source.includes("Your preview is taking a little longer"), "Delayed jobs must remain a non-terminal state.");
assert.ok(source.includes("Core outfit ready"), "A durable core result must be displayed while finishers continue.");
assert.ok(source.includes("Adding selected finishers"), "Progressive rendering must explain the accessory stage without an artificial percentage.");
assert.ok(source.includes("Provider pass complete"), "Piece cards must distinguish completed provider passes.");
assert.ok(source.includes("Selected — finishing"), "Piece cards must expose selected finishing pieces still in progress.");
assert.ok(source.includes("Partial preview:"), "A fallback must report rendered and omitted pieces accurately.");
assert.ok(source.includes("Provider pass failed"), "Piece cards must identify the provider step that failed.");
assert.ok(source.includes("Studio Model ready"), "Waiting summary must expose model readiness when confirmed.");
assert.ok(source.includes("pieces selected"), "Waiting summary must expose selected-piece count.");
assert.ok(source.includes("Regenerate Preview"), "Completed preview must offer regeneration.");
assert.ok(source.includes("PreviewDownloadButton"), "Completed preview must offer download.");
assert.ok(source.includes("Save Look"), "Completed preview must offer saving.");
assert.ok(source.includes("Retry Try-On"), "Failed preview must offer retry.");
assert.ok(source.includes("creditRestored ?"), "Failure copy must condition credit-restoration language on confirmed state.");
assert.ok(source.includes('href="/support"'), "Failed preview must link to support.");
assert.ok(source.includes("buildOutfitPresentationItems(outfit)"), "Selected-piece summary must combine reference and closet items.");
assert.ok(source.includes('aria-labelledby="preview-accessories-title"'), "Accessories must be attached semantically and visually to the generated preview.");
assert.ok(source.includes("md:grid-cols-[minmax(0,1fr)_176px]"), "Accessories must use a dedicated in-preview rail on larger screens.");
assert.ok(source.includes("Selected to wear with this preview."), "The accessory rail must explain how its items relate to the preview.");
assert.ok(source.includes("corePresentationItems.map"), "The general piece grid must not duplicate accessories from the dedicated panel.");
assert.ok(source.includes("pb-[calc(1.5rem+var(--safe-bottom))]"), "Preview content must respect mobile safe-area padding.");
assert.ok(!source.includes("min-h-[720px]"), "Preview media must not force an oversized mobile minimum height.");
assert.ok(!source.includes("% complete"), "Try-On progress must not invent provider percentages.");

assert.ok(routeSource.includes("TryOnGeneration.findOne"), "GET must restore persisted generation state for return visits.");
assert.ok(routeSource.includes("BackgroundJob.findOne"), "GET must restore persisted job state for return visits.");
assert.ok(routeSource.includes('"payload.generationId"'), "GET job lookup must bind the job to the persisted generation.");
assert.ok(pageSource.includes("initialOrigin={origin}"), "Preview page must preserve source-aware return navigation.");
assert.ok(stylistSource.includes("preview?origin=${origin}"), "Create and Match links must declare their navigation origin.");
assert.ok(notificationSource.includes("tryon-ready:${input.generationId}"), "Ready notifications must remain idempotent per generation.");
assert.ok(!notificationSource.includes("Your Credits were not deducted."), "Failure notifications must not make an unverified credit claim.");
assert.ok(shellSource.includes("pb-[calc(11rem+var(--safe-bottom))]"), "Application content must reserve space above fixed mobile navigation.");
assert.ok(shellSource.includes("overflow-x-clip"), "Application shell must prevent horizontal overflow.");

console.log("Try-on preview UI state check passed.");
