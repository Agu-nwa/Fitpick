import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const roots = ["app", "components", "hooks"];
const checkedExtensions = new Set([".ts", ".tsx"]);
const skippedPathParts = [`${path.sep}api${path.sep}`];

const dangerousLiteralPattern =
  /\b(?:FASHN|OpenAI|Gemini|AWS|MongoDB|S3|CloudFront|CoinPayments|Ready Player Me|Custom GLB)\b|HTTP\s+[0-9]{3}|Job\s+\{/;

const rawErrorSetterPattern =
  /set[A-Za-z]*(?:Error|Message)\([^;\n]*(?:result\.error\.message|failure\?\.error\.message|job\.errorMessage|preview\.errorMessage|error\.message)/;

const sanitizerPattern = /safeUserMessage|safeTryOnErrorMessage|safeUploadErrorMessage|friendlyAuthError/;

function listFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const fullPath = path.join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) return listFiles(fullPath);
    return checkedExtensions.has(path.extname(fullPath)) ? [fullPath] : [];
  });
}

function stringLiterals(source: string) {
  const matches = source.matchAll(/(["'`])((?:\\.|(?!\1)[\s\S])*?)\1/g);
  return Array.from(matches, (match) => match[2]);
}

const files = roots
  .flatMap(listFiles)
  .filter((file) => !skippedPathParts.some((part) => file.includes(part)));

const literalLeaks: string[] = [];
const rawSetterLeaks: string[] = [];

for (const file of files) {
  const source = readFileSync(file, "utf8");
  for (const literal of stringLiterals(source)) {
    if (dangerousLiteralPattern.test(literal)) {
      literalLeaks.push(`${file}: ${literal.slice(0, 120)}`);
    }
  }

  source.split("\n").forEach((line, index) => {
    if (rawErrorSetterPattern.test(line) && !sanitizerPattern.test(line)) {
      rawSetterLeaks.push(`${file}:${index + 1}: ${line.trim()}`);
    }
  });
}

const errorUtility = readFileSync("lib/user-facing-errors.ts", "utf8");

assert.ok(errorUtility.includes("containsInternalErrorDetails"), "Central internal-detail detector must exist.");
assert.ok(errorUtility.includes("safeApiFailure"), "API failures must have a central sanitizer.");
assert.ok(errorUtility.includes("safeTryOnErrorMessage"), "Virtual Try-On failures must have approved user copy.");
assert.deepEqual(literalLeaks, [], "User-facing string literals must not expose provider names, HTTP statuses, or job IDs.");
assert.deepEqual(rawSetterLeaks, [], "UI state setters must not render raw error.message fields.");

console.log("User-facing error copy check passed.");
