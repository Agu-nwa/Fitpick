import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { missingBuildArtifacts, parseListenerPids, requiredNextArtifacts } from "./verify-production-release.mjs";

const emptyRoot = mkdtempSync(join(tmpdir(), "fitpick-release-empty-"));
assert.deepEqual(missingBuildArtifacts(emptyRoot), requiredNextArtifacts, "a missing .next release fails closed");

const validRoot = mkdtempSync(join(tmpdir(), "fitpick-release-valid-"));
for (const file of requiredNextArtifacts) {
  const path = join(validRoot, file);
  mkdirSync(path.slice(0, path.lastIndexOf("/")), { recursive: true });
  writeFileSync(path, file.endsWith("BUILD_ID") ? "build-123\n" : "{}\n");
}
assert.deepEqual(missingBuildArtifacts(validRoot), [], "a complete build artifact set passes");
assert.deepEqual(parseListenerPids('users:(("next-server",pid=1234,fd=20))'), [1234]);
assert.deepEqual(parseListenerPids('pid=1234,fd=20 pid=5678,fd=21'), [1234, 5678], "port conflicts retain both PIDs");

const middlewareSource = readFileSync("middleware.ts", "utf8");
assert.doesNotMatch(
  middlewareSource,
  /authPages\.has\(pathname\).*hasValidSessionToken/s,
  "edge middleware does not redirect auth pages using signature-only session validation"
);

for (const authPage of ["app/login/page.tsx", "app/register/page.tsx"]) {
  const source = readFileSync(authPage, "utf8");
  assert.match(source, /requireUser\(\)/, `${authPage} validates the active database session before redirecting`);
  assert.doesNotMatch(source, /getSessionUser\(\)/, `${authPage} does not redirect from a stale signed cookie`);
}

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
assert.match(packageJson.scripts["build:ec2"], /FITPICK_EC2_BUILD=true/, "EC2 build uses its constrained-host configuration");
assert.match(packageJson.scripts["build:ec2"], /--no-lint/, "EC2 build does not repeat the CI lint gate");

const nextConfigSource = readFileSync("next.config.mjs", "utf8");
assert.match(nextConfigSource, /ignoreBuildErrors:\s*process\.env\.FITPICK_EC2_BUILD === "true"/, "only the EC2 build skips Next's duplicate type-check");
assert.match(nextConfigSource, /webpackMemoryOptimizations:\s*true/, "low-memory webpack behavior remains enabled");

console.log("Deployment safety tests passed.");
