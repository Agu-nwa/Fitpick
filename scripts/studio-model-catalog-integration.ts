import assert from "node:assert/strict";
import { connectDB } from "../lib/db";
import { StudioModelAsset } from "../models/StudioModelAsset";
import { STUDIO_MODEL_APPEARANCE_VERSION } from "../lib/studio-model/appearance-taxonomy";
import { studioModelAppearanceKey } from "../lib/studio-model/configuration";
import { assertStudioModelIntegrationEnvironment } from "../lib/studio-model/catalog/integration-guard";
import { ensureStudioModelAssetRecord } from "../lib/studio-model/catalog/asset-catalog";
import { claimStudioModelGeneration } from "../lib/studio-model/catalog/asset-generator";
import { BackgroundJob } from "../models/BackgroundJob";
import mongoose from "mongoose";
import { runBackgroundJobByType } from "../lib/jobs/handlers";
import { resolveStudioModelCatalog } from "../lib/studio-model/catalog/asset-resolution";
import { deleteGeneratedImage } from "../lib/storage/generated-images";
import { resetStudioModelStubCalls, studioModelStubCalls } from "../lib/studio-model/catalog/integration-provider";

async function main() {
  const environment = assertStudioModelIntegrationEnvironment();
  const realProvider = process.argv.includes("--real-provider");
  if (realProvider && !process.argv.includes("--confirm-image-generation-cost")) throw new Error("real_provider_cost_confirmation_required");
  process.env.STUDIO_MODEL_INTEGRATION_PROVIDER = realProvider ? "real" : "stub";
  process.env.STUDIO_MODEL_REQUIRE_HUMAN_APPROVAL = "false";
  resetStudioModelStubCalls(); await connectDB(); await StudioModelAsset.syncIndexes();
  const appearance = { version: STUDIO_MODEL_APPEARANCE_VERSION, representation: "studio_model", gender: "male", bodyType: "standard", skinTone: "tone_07", undertone: "neutral", hairTexture: "coily", hairLength: "short", hairColor: "black", hairStyle: "short_natural", heightBand: "average" } as const;
  const key = studioModelAppearanceKey(appearance); assert.equal(key, studioModelAppearanceKey({ ...appearance })); assert.equal(/user/i.test(key), false);
  await ensureStudioModelAssetRecord(appearance, "integration-v1");
  await StudioModelAsset.updateOne({ appearanceKey: key, version: "integration-v1" }, { $set: { status: "MISSING" } });
  const claims = await Promise.all(Array.from({ length: 20 }, () => claimStudioModelGeneration(key, "integration-v1")));
  assert.equal(claims.filter(Boolean).length, 1);
  const count = await StudioModelAsset.countDocuments({ appearanceKey: key, version: "integration-v1" }); assert.equal(count, 1);
  const job = await BackgroundJob.create({ userId: new mongoose.Types.ObjectId(), type:"studio_model_asset_generation",status:"processing",payload:{appearanceKey:key,version:"integration-v1"},attempts:1,maxAttempts:1 });
  await runBackgroundJobByType(job);
  const ready = await StudioModelAsset.findOne({appearanceKey:key,version:"integration-v1"}).lean(); assert.equal(ready?.status,"READY"); assert.ok(ready?.assetUrl && ready?.thumbnailUrl); assert.notEqual(ready?.storageKey,ready?.thumbnailStorageKey);
  const resolved = await resolveStudioModelCatalog(appearance,{version:"integration-v1",enqueueMissing:false}); assert.equal(resolved.status,"READY");
  const resolvedAgain = await resolveStudioModelCatalog(appearance,{version:"integration-v1",enqueueMissing:false}); assert.equal(resolvedAgain.asset?.appearanceKey,key);
  if (!realProvider) assert.equal(studioModelStubCalls(),1);
  if (!process.argv.includes("--retain")) { if(ready?.storageKey)await deleteGeneratedImage(ready.storageKey); if(ready?.thumbnailStorageKey)await deleteGeneratedImage(ready.thumbnailStorageKey); await BackgroundJob.deleteOne({_id:job._id}); await StudioModelAsset.deleteOne({appearanceKey:key,version:"integration-v1"}); }
  console.log(JSON.stringify({ mode: realProvider ? "real-provider" : "stub", database: environment.database, prefix: environment.prefix, deterministicKey: true, concurrentClaims: 20, owners: 1, canonicalRecords: 1, providerCalls:realProvider?1:studioModelStubCalls(),storedOriginal:true,storedThumbnail:true,exactResolverHit:true,cacheReuse:true,cleanup: !process.argv.includes("--retain") }, null, 2));
}
main().catch((error) => { console.error(error instanceof Error ? error.message : "Studio Model integration failed."); process.exitCode = 1; });
