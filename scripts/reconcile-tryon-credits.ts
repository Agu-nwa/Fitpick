import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { connectDB } from "@/lib/db";
import { refundCommittedCredits } from "@/lib/credits/credit-engine";
import { expireStaleTryOnGenerations } from "@/lib/tryon/tryon-generation";
import { assertUsablePreviewRecord } from "@/lib/tryon/tryon-image-validation";
import { AvatarOutfitPreview } from "@/models/AvatarOutfitPreview";
import { CreditTransaction } from "@/models/CreditTransaction";
import { TryOnGeneration } from "@/models/TryOnGeneration";

function loadEnv() {
  for (const filename of [".env.local", ".env.production", ".env"]) {
    const envPath = path.resolve(process.cwd(), filename);
    if (fs.existsSync(envPath)) dotenv.config({ path: envPath, override: false, quiet: true });
  }
}

function parseLegacyReference(referenceId: string) {
  const match = /^(avatar-preview|stylist-tryon):([^:]+):(.+)$/.exec(referenceId);
  if (!match) return null;
  return { outfitId: match[2], cacheKey: match[3] };
}

async function previewForTransaction(transaction: any) {
  const generation = await TryOnGeneration.findOne({ creditReferenceId: transaction.referenceId }).lean() as any;
  if (generation?.previewId) {
    const preview = await AvatarOutfitPreview.findOne({ _id: generation.previewId, userId: transaction.user }).lean();
    return { generation, preview };
  }

  const parsed = parseLegacyReference(transaction.referenceId || "");
  if (parsed) {
    const preview = await AvatarOutfitPreview.findOne({
      userId: transaction.user,
      outfitId: parsed.outfitId,
      cacheKey: parsed.cacheKey
    }).lean();
    return { generation, preview };
  }

  return { generation, preview: null };
}

async function main() {
  loadEnv();
  const apply = process.argv.includes("--apply");
  const expireStale = process.argv.includes("--expire-stale");
  const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
  const limit = Math.max(1, Math.min(Number(limitArg?.split("=")[1] || 500), 2000));
  await connectDB();

  const staleCleanup = expireStale
    ? await expireStaleTryOnGenerations({ limit })
    : { expiredCount: 0, generationIds: [] };

  const transactions = await CreditTransaction.find({
    feature: { $in: ["virtual_try_on", "regenerate_try_on"] },
    status: "spent",
    referenceId: { $regex: /^(tryon-generation:|avatar-preview:|stylist-tryon:|job:)/ }
  }).sort({ createdAt: -1 }).limit(limit);

  const affected: Array<Record<string, unknown>> = [];

  for (const transaction of transactions) {
    const existingRefund = await CreditTransaction.findOne({
      user: transaction.user,
      referenceId: `refund:${transaction.referenceId}`.slice(0, 160),
      status: { $in: ["credited", "refunded"] }
    }).lean();
    if (existingRefund) continue;

    const { generation, preview } = await previewForTransaction(transaction);
    if (assertUsablePreviewRecord(preview)) continue;

    const row = {
      transactionId: String(transaction._id),
      userId: String(transaction.user),
      feature: transaction.feature,
      credits: Number(transaction.credits || 0),
      referenceId: transaction.referenceId,
      generationId: generation?.generationId || null,
      previewId: preview?._id ? String(preview._id) : null,
      previewStatus: preview?.status || null,
      reason: "charged_without_usable_tryon_preview"
    };
    affected.push(row);

    if (apply) {
      await refundCommittedCredits({
        userId: transaction.user,
        feature: transaction.feature as any,
        referenceId: transaction.referenceId,
        reason: "historical_tryon_preview_missing",
        metadata: { generationId: generation?.generationId || "", transactionId: String(transaction._id) }
      });
      if (generation?.generationId) {
        await TryOnGeneration.findOneAndUpdate({ generationId: generation.generationId }, {
          $set: {
            status: "failed",
            creditsReleased: Number(transaction.credits || 0),
            failureStage: "reconciliation",
            failureCode: "refunded_missing_preview",
            failureMessage: "Historical try-on charge refunded because no usable preview was found."
          }
        });
      }
    }
  }

  console.log(JSON.stringify({
    mode: apply ? "apply" : "dry-run",
    staleCleanupMode: expireStale ? "enabled" : "skipped",
    staleCleanup,
    scanned: transactions.length,
    affectedCount: affected.length,
    affected
  }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({
    status: "failed",
    message: "Try-on credit reconciliation failed safely.",
    errorCategory: error instanceof Error ? error.name : "unknown"
  }));
  process.exit(1);
});
