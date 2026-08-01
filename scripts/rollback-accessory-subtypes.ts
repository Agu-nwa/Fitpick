import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { connectDB } from "@/lib/db";
import { WardrobeItem } from "@/models/WardrobeItem";

function flag(name: string) { return process.argv.includes(`--${name}`); }
function value(name: string) { return process.argv.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3) || ""; }

async function main() {
  const runId = value("run-id");
  if (!runId) throw new Error("run_id_required");
  const write = flag("write");
  if (write && process.env.NODE_ENV === "production" && !flag("confirm-production")) throw new Error("production_confirmation_required");
  await connectDB();
  const items = await WardrobeItem.find({ "accessorySubtypeResolution.migrationRunId": runId }).sort({ _id: 1 }).cursor();
  const report = { runId, mode: write ? "write" : "dry-run", matched: 0, eligible: 0, reverted: 0, skippedUserConfirmed: 0, skippedLaterEdit: 0 };
  for await (const item of items) {
    report.matched += 1;
    const resolution = item.accessorySubtypeResolution as { resolvedBy?: string; migrationRunId?: string; migrationWrittenAt?: Date; previousSubtype?: string | null; previousResolution?: unknown } | null;
    if (!resolution || resolution.resolvedBy !== "migration") { report.skippedUserConfirmed += 1; continue; }
    const writtenAt = resolution.migrationWrittenAt ? new Date(resolution.migrationWrittenAt).getTime() : 0;
    const updatedAt = item.updatedAt ? new Date(item.updatedAt).getTime() : 0;
    if (writtenAt && updatedAt > writtenAt + 2_000) { report.skippedLaterEdit += 1; continue; }
    report.eligible += 1;
    if (write) {
      const update = await WardrobeItem.updateOne({ _id: item._id, "accessorySubtypeResolution.migrationRunId": runId, "accessorySubtypeResolution.resolvedBy": "migration" }, { $set: { accessorySubtype: resolution.previousSubtype || null, accessorySubtypeResolution: resolution.previousResolution || null } });
      report.reverted += update.modifiedCount;
    }
  }
  const directory = path.join(process.cwd(), "reports", "accessory-subtype-migrations");
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, `rollback-${runId}.json`), `${JSON.stringify(report, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main().then(() => process.exit(0)).catch((error: unknown) => {
  process.stderr.write(`${JSON.stringify({ ok: false, code: error instanceof Error ? error.message : "rollback_failed" })}\n`);
  process.exit(1);
});
