import { inspectLegacyStudioModelAssets } from "../lib/studio-model/catalog/legacy-assets";
async function main() {
  const write = process.argv.includes("--write");
  const confirmed = process.argv.includes("--confirm-write");
  const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
  const limit = Number(limitArg?.split("=")[1] || 100);
  if (write && !confirmed) throw new Error("legacy_import_write_confirmation_required");
  const report = await inspectLegacyStudioModelAssets(process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "", limit);
  if (write && report.wouldCreate > 0) throw new Error("legacy_import_contains_unreviewed_mappings");
  console.log(JSON.stringify({ dryRun: !write, ...report }, null, 2));
}
main().catch((error) => { console.error(error instanceof Error ? error.message : "Legacy Studio Model inspection failed."); process.exitCode = 1; });
