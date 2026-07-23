import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { assertGeneratedImageBuffer, assertUsablePreviewRecord } from "@/lib/tryon/tryon-image-validation";

function read(path: string) {
  assert.ok(existsSync(path), `Missing file: ${path}`);
  return readFileSync(path, "utf8");
}

const creditEngine = read("lib/credits/credit-engine.ts");
assert.ok(creditEngine.includes("reserveCreditsForFeature"), "Credit engine must expose reservation helper.");
assert.ok(creditEngine.includes("commitReservedCredits"), "Credit engine must expose commit helper.");
assert.ok(creditEngine.includes("releaseCreditReservation"), "Credit engine must expose release helper.");
assert.ok(creditEngine.includes("refundCommittedCredits"), "Credit engine must expose refund helper.");

const generationModel = read("models/TryOnGeneration.ts");
for (const status of ["requested", "reserved", "submitting", "provider_completed", "saving", "completed", "failed", "expired"]) {
  assert.ok(generationModel.includes(`"${status}"`), `TryOnGeneration must support ${status}.`);
}
assert.ok(generationModel.includes("idempotencyKey"), "TryOnGeneration must store idempotency keys.");
assert.ok(generationModel.includes("creditsCommitted"), "TryOnGeneration must track committed credits.");
const generationService = read("lib/tryon/tryon-generation.ts");
assert.ok(generationService.includes("expireStaleTryOnGenerations"), "Try-on generation service must support stale cleanup.");
assert.ok(generationService.includes("refundTryOnGenerationIfCharged"), "Try-on generation service must refund committed credits after partial failures.");
assert.ok(generationService.includes("credit_refunded"), "Try-on generation service must log compensating refunds.");

const avatarRoute = read("app/api/outfits/[id]/avatar-preview/route.ts");
assert.ok(!avatarRoute.includes("spendCreditsAfterSuccess"), "Virtual try-on route must not spend directly.");
assert.ok(avatarRoute.includes("reserveTryOnGenerationCredits"), "Virtual try-on route must reserve before generation.");
assert.ok(avatarRoute.includes("commitTryOnGenerationCredits"), "Virtual try-on route must commit only after preview persistence.");
assert.ok(avatarRoute.includes("failTryOnGeneration"), "Virtual try-on route must fail/release on errors.");

const jobHandlers = read("lib/jobs/handlers.ts");
assert.ok(jobHandlers.includes("commitTryOnGenerationCredits"), "Worker try-on jobs must commit through generation helper.");
assert.ok(jobHandlers.includes("failTryOnGeneration"), "Worker try-on jobs must release failed reservations.");
assert.ok(!/avatar_preview_generation[\s\S]*referenceId: `job:\$\{String\(job\._id\)\}`/.test(jobHandlers), "Avatar preview worker must not charge using job id reference.");

const tryonProvider = read("lib/tryon/tryon-provider.ts");
assert.ok(tryonProvider.includes("assertUsablePreviewRecord"), "Provider orchestrator must require usable persisted previews.");
assert.ok(tryonProvider.includes("previewStorageKeys"), "Provider orchestrator must require permanent storage keys.");

const fashn = read("lib/tryon/providers/fashn-tryon.ts");
assert.ok(fashn.includes("uploadGeneratedImageFromUrl"), "FASHN provider must upload remote outputs to S3.");

const custom = read("lib/tryon/providers/dedicated-vton-tryon.ts");
assert.ok(custom.includes("uploadGeneratedImageFromUrl"), "Custom VTON provider must upload remote outputs to S3.");

const reconcile = read("scripts/reconcile-tryon-credits.ts");
assert.ok(reconcile.includes("--apply"), "Reconciliation script must require explicit apply mode.");
assert.ok(reconcile.includes("dry-run"), "Reconciliation script must default to dry-run.");
assert.ok(reconcile.includes("--expire-stale"), "Reconciliation script must support explicit stale generation cleanup.");

const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
assert.equal(assertGeneratedImageBuffer(png, "image/png").contentType, "image/png");
assert.throws(() => assertGeneratedImageBuffer(Buffer.from("<html>bad gateway</html>"), "text/html"), /supported image|image content/);
assert.throws(() => assertGeneratedImageBuffer(Buffer.alloc(0), "image/png"), /empty/i);

assert.equal(assertUsablePreviewRecord({ status: "ready", imageUrl: "https://cdn.example.com/a.png", storageKey: "generated/a.png" }), true);
assert.equal(assertUsablePreviewRecord({ status: "ready", imageUrl: "https://provider.example.com/temp.png", storageKey: "" }), false);
assert.equal(assertUsablePreviewRecord({ status: "failed", imageUrl: "https://cdn.example.com/a.png", storageKey: "generated/a.png" }), false);

console.log("Try-on billing integrity checks passed.");
