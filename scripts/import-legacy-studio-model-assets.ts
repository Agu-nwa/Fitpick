import { connectDB } from "../lib/db";
import { importLegacyStudioModelAssets, legacyStudioModelSeedRecords } from "../lib/studio-model/catalog/legacy-assets";

async function main() {
  const write = process.argv.includes("--write");
  const publicBaseUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "";
  if (!write) {
    console.log(JSON.stringify({ dryRun: true, assets: legacyStudioModelSeedRecords(publicBaseUrl).map(({ appearanceKey, genderPresentation, bodyType, status, assetUrl }) => ({ appearanceKey, genderPresentation, bodyType, status, assetUrl })) }, null, 2));
    return;
  }
  await connectDB();
  console.log(JSON.stringify(await importLegacyStudioModelAssets(publicBaseUrl), null, 2));
}
main().catch((error) => { console.error(error instanceof Error ? error.message : "Legacy Studio Model import failed."); process.exitCode = 1; });
