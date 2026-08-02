import fs from "node:fs/promises";
import { connectDB } from "../lib/db";
import { parseStudioModelAppearance, studioModelAppearanceKey } from "../lib/studio-model/configuration";
import { ensureStudioModelAssetRecord } from "../lib/studio-model/catalog/asset-catalog";
import { validateStudioModelAsset } from "../lib/studio-model/catalog/asset-validation";
import { storeStudioModelAsset } from "../lib/studio-model/catalog/asset-storage";
import { registerGeneratedStudioModelAsset } from "../lib/studio-model/catalog/asset-registration";

async function main() {
  const configPath = process.argv.find((arg) => arg.startsWith("--config="))?.slice(9) || "";
  const imagePath = process.argv.find((arg) => arg.startsWith("--image="))?.slice(8) || "";
  const version = process.argv.find((arg) => arg.startsWith("--version="))?.slice(10) || "v1";
  const write = process.argv.includes("--write"), confirmed = process.argv.includes("--confirm-write");
  if (!configPath || !imagePath) throw new Error("configuration_and_image_are_required");
  const appearance = parseStudioModelAppearance(JSON.parse(await fs.readFile(configPath, "utf8")));
  const body = await fs.readFile(imagePath); const validation = await validateStudioModelAsset(body, appearance);
  if (!validation.accepted) throw new Error(validation.reviewRequired ? "manual_asset_review_required" : "manual_asset_validation_failed");
  const appearanceKey = studioModelAppearanceKey(appearance);
  if (!write) { console.log(JSON.stringify({ dryRun: true, appearanceKey, version, validation: { accepted: true, qualityScore: validation.qualityScore } }, null, 2)); return; }
  if (!confirmed) throw new Error("manual_registration_write_confirmation_required");
  await connectDB(); const record = await ensureStudioModelAssetRecord(appearance, version);
  if (record.status === "READY") throw new Error("ready_asset_already_exists");
  record.status = "GENERATING"; await record.save();
  const stored = await storeStudioModelAsset(body, appearanceKey, version);
  const asset = await registerGeneratedStudioModelAsset(record._id, { ...stored, qualityScore: validation.qualityScore, provider: "manual", providerModel: "approved_local_asset", generatedBy: "manual_registration", generationPromptVersion: "manual-v1", originalWidth: validation.width, originalHeight: validation.height, originalBytes: body.byteLength, originalFormat: validation.format });
  console.log(JSON.stringify({ assetId: String(asset?._id || ""), appearanceKey, status: asset?.status || "FAILED" }, null, 2));
}
main().catch((error) => { console.error(error instanceof Error ? error.message : "Manual registration failed."); process.exitCode = 1; });
