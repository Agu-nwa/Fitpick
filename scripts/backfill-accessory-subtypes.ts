import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { connectDB } from "@/lib/db";
import { ACCESSORY_SUBTYPE_CONFIDENCE_THRESHOLDS, accessorySubtypeResolverVersion, resolutionMetadata, resolveAccessorySubtype } from "@/lib/wardrobe/accessory-subtypes";
import { WardrobeItem } from "@/models/WardrobeItem";

function flag(name: string) { return process.argv.includes(`--${name}`); }
function value(name: string, fallback = "") { return process.argv.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3) || fallback; }
function integer(name: string, fallback: number) { const parsed = Number(value(name)); return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback; }

async function main() {
  const write = flag("write");
  const production = process.env.NODE_ENV === "production";
  if (write && production && !flag("confirm-production")) throw new Error("production_confirmation_required");
  const runId = value("run-id", `accessory-${new Date().toISOString().replace(/[:.]/g, "-")}-${crypto.randomBytes(3).toString("hex")}`);
  const limit = integer("limit", 500);
  const batchSize = Math.min(integer("batch-size", 25), 100);
  const resumeFrom = value("resume-from");
  const minimumConfidence = Math.max(Number(value("min-confidence", String(ACCESSORY_SUBTYPE_CONFIDENCE_THRESHOLDS.high))), ACCESSORY_SUBTYPE_CONFIDENCE_THRESHOLDS.high);
  const onlyStatus = value("only-status");
  const sampleLimit = Math.min(integer("sample", 20), 50);
  const includeImageAnalysis = flag("include-image-analysis");
  const excludeImageAnalysis = flag("exclude-image-analysis") || !includeImageAnalysis;
  const maximumImageRequests = integer("max-image-requests", 25);
  if (includeImageAnalysis && process.env.ENABLE_ACCESSORY_IMAGE_CLASSIFICATION !== "true") throw new Error("image_analysis_not_enabled");
  if (includeImageAnalysis) throw new Error("image_analysis_provider_not_configured");
  await connectDB();
  const report = {
    runId,
    configuration: { mode: write ? "write" : "dry-run", limit, batchSize, resumeFrom: resumeFrom || null, minimumConfidence, onlyStatus: onlyStatus || null, imageAnalysis: !excludeImageAnalysis, maximumImageRequests },
    counts: { inspected: 0, existingCanonical: 0, highConfidence: 0, needsUserConfirmation: 0, unresolved: 0, conflicts: 0, writes: 0, failures: 0 },
    highConfidenceUpdates: [] as Array<{ itemId: string; subtype: string }>,
    needsUserConfirmation: [] as Array<{ itemId: string; alternatives: string[] }>,
    unresolvedSamples: [] as Array<{ itemId: string; reasonCode: string }>,
    conflictSamples: [] as Array<{ itemId: string; alternatives: string[] }>,
    imageAnalysisCounts: { requests: 0, cacheHits: 0 },
    failures: [] as Array<{ itemId?: string; code: string }>,
    nextCursor: null as string | null
  };
  let cursor = resumeFrom;
  while (report.counts.inspected < limit) {
    const remaining = Math.min(batchSize, limit - report.counts.inspected);
    const query: Record<string, unknown> = { category: "accessories", archivedAt: null };
    if (cursor) query._id = { $gt: cursor };
    if (onlyStatus) query["accessorySubtypeResolution.status"] = onlyStatus;
    const items = await WardrobeItem.find(query).sort({ _id: 1 }).limit(remaining)
      .select("name category subcategory accessorySubtype accessorySubtypeResolution userInputMetadata categorySpecificMetadata recommendationMetadata verifiedMetadata aiAnalysis updatedAt").lean();
    if (!items.length) break;
    for (const item of items) {
      cursor = String(item._id);
      report.nextCursor = cursor;
      report.counts.inspected += 1;
      const currentResolution = item.accessorySubtypeResolution as { resolvedBy?: string } | null;
      if (item.accessorySubtype || currentResolution?.resolvedBy === "user") { report.counts.existingCanonical += 1; continue; }
      const result = resolveAccessorySubtype(item as unknown as Record<string, unknown>);
      if (result.status === "conflicting") {
        report.counts.conflicts += 1;
        report.counts.needsUserConfirmation += 1;
        if (report.conflictSamples.length < sampleLimit) report.conflictSamples.push({ itemId: cursor, alternatives: result.alternatives.map((entry) => entry.subtype) });
        if (write) {
          const migrationWrittenAt = new Date();
          await WardrobeItem.updateOne({ _id: item._id, accessorySubtype: null, "accessorySubtypeResolution.resolvedBy": { $ne: "user" } }, { $set: { accessorySubtypeResolution: { ...resolutionMetadata(result, "migration", runId), previousSubtype: null, previousResolution: item.accessorySubtypeResolution || null, migrationWrittenAt } } });
        }
      } else if (result.confidenceLevel === "high" && result.subtype && result.confidenceScore >= minimumConfidence) {
        report.counts.highConfidence += 1;
        if (report.highConfidenceUpdates.length < sampleLimit) report.highConfidenceUpdates.push({ itemId: cursor, subtype: result.subtype });
        if (write) {
          const writtenAt = new Date();
          const metadata = { ...resolutionMetadata(result, "migration", runId), previousSubtype: null, previousResolution: item.accessorySubtypeResolution || null, migrationWrittenAt: writtenAt };
          const update = await WardrobeItem.updateOne({ _id: item._id, accessorySubtype: null, "accessorySubtypeResolution.resolvedBy": { $ne: "user" } }, { $set: { accessorySubtype: result.subtype, accessorySubtypeResolution: metadata } });
          report.counts.writes += update.modifiedCount;
        }
      } else if (result.confidenceLevel === "medium") {
        report.counts.needsUserConfirmation += 1;
        if (report.needsUserConfirmation.length < sampleLimit) report.needsUserConfirmation.push({ itemId: cursor, alternatives: result.alternatives.map((entry) => entry.subtype) });
        if (write) {
          const migrationWrittenAt = new Date();
          await WardrobeItem.updateOne({ _id: item._id, accessorySubtype: null, "accessorySubtypeResolution.resolvedBy": { $ne: "user" } }, { $set: { accessorySubtypeResolution: { ...resolutionMetadata(result, "migration", runId), previousSubtype: null, previousResolution: item.accessorySubtypeResolution || null, migrationWrittenAt } } });
        }
      } else {
        report.counts.unresolved += 1;
        if (report.unresolvedSamples.length < sampleLimit) report.unresolvedSamples.push({ itemId: cursor, reasonCode: result.reasonCode });
      }
    }
    if (items.length < remaining) break;
  }
  const directory = path.join(process.cwd(), "reports", "accessory-subtype-migrations");
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, `${runId}.json`), `${JSON.stringify(report, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main().then(() => process.exit(0)).catch((error: unknown) => {
  const code = error instanceof Error ? error.message : "migration_failed";
  process.stderr.write(`${JSON.stringify({ ok: false, code })}\n`);
  process.exit(1);
});
