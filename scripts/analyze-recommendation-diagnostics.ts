import fs from "node:fs";

const file = process.argv.find((value) => value.startsWith("--file="))?.slice(7);
if (!file) throw new Error("Provide --file=/path/to/diagnostics.json or .jsonl");
const raw = fs.readFileSync(file, "utf8").trim();
const records: any[] = raw.startsWith("[") ? JSON.parse(raw) : raw.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
const byRole: Record<string, { considered: number; selected: number; missingMetadata: number; rejected: Record<string, number>; scores: number[] }> = {};
let footwearRescued = 0, zeroFinishers = 0, maximumFinishers = 0, watchBracelet = 0, necklaceEarrings = 0, unresolved = 0;
for (const record of records) {
  if (record.event === "recommendation.footwear.selected_by_rescue") footwearRescued += Number(record.selectedCount || 1);
  const diagnostics = Array.isArray(record.diagnostics) ? record.diagnostics : [];
  const selectedRoles = diagnostics.filter((entry: any) => entry.selected).map((entry: any) => entry.role);
  if (!selectedRoles.length) zeroFinishers += 1; if (selectedRoles.length >= 3) maximumFinishers += 1;
  if (selectedRoles.includes("watch") && selectedRoles.includes("wrist_jewelry")) watchBracelet += 1;
  if (selectedRoles.includes("neck_jewelry") && selectedRoles.includes("ear_jewelry")) necklaceEarrings += 1;
  for (const entry of diagnostics) { const role = String(entry.role || "unknown"); const row = byRole[role] ||= { considered: 0, selected: 0, missingMetadata: 0, rejected: {}, scores: [] }; row.considered += 1; if (entry.selected) row.selected += 1; if (entry.missingSignals?.length) row.missingMetadata += 1; if (entry.rejectionCode) increment(row.rejected, entry.rejectionCode); if (Number.isFinite(entry.score)) row.scores.push(entry.score); if (entry.rejectionCode === "insufficient_identity") unresolved += 1; }
}
function increment(target: Record<string, number>, key: string) { target[key] = (target[key] || 0) + 1; }
const roles = Object.fromEntries(Object.entries(byRole).map(([role, row]) => { const rejectionRate = row.considered ? (row.considered - row.selected) / row.considered : 0; const missingRate = row.considered ? row.missingMetadata / row.considered : 0; return [role, { considered: row.considered, selectionRate: row.considered ? row.selected / row.considered : 0, rejectionRate, missingMetadataRate: missingRate, rejectionReasons: row.rejected, scoreRange: row.scores.length ? [Math.min(...row.scores), Math.max(...row.scores)] : [], reviewSignal: missingRate > 0.4 ? "likely missing metadata problem" : rejectionRate > 0.8 ? "review for likely scoring or structural restraint" : "expected stylistic restraint" }]; }));
console.log(JSON.stringify({ records: records.length, roles, footwearRescueFrequency: records.length ? footwearRescued / records.length : 0, looksWithZeroFinishers: zeroFinishers, looksWithMaximumFinishers: maximumFinishers, watchPlusBraceletFrequency: watchBracelet, necklacePlusEarringsFrequency: necklaceEarrings, unresolvedTaxonomyFrequency: records.length ? unresolved / records.length : 0, thresholdsModified: false }, null, 2));
