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
assert.deepEqual(
  parseListenerPids('LISTEN 0 511 *:3000 *:* users:(("next-server",pid=759261,fd=18))'),
  [759261],
  "ss socket queue values are never interpreted as listener PIDs"
);

const verifierSource = readFileSync("scripts/verify-production-release.mjs", "utf8");
assert.match(verifierSource, /listeners\.length === 0/, "runtime verification requires the web port to have a listener");
assert.match(verifierSource, /listeners\.filter\(\(pid\) => !pidBelongsToProcessTree\(pid, pm2Pid\)\)/, "all listener PIDs must belong to the PM2 web process tree");
assert.doesNotMatch(verifierSource, /listeners\.length !== 1/, "runtime verification permits multiple PIDs sharing a socket within one PM2 process tree");
assert.match(verifierSource, /searchParams\.set\("deployment_check", expectedDeploymentId\)/, "deployment health checks use a release-specific cache key");
assert.match(verifierSource, /cache:\s*"no-store"/, "deployment health checks bypass the fetch cache");

const healthRouteSource = readFileSync("app/api/health/route.ts", "utf8");
assert.match(healthRouteSource, /s-maxage=0/, "the health endpoint disables shared intermediary caching");
assert.match(healthRouteSource, /Pragma", "no-cache"/, "the health endpoint disables legacy caches");

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

const releaseScript = readFileSync("scripts/deploy-production-release.sh", "utf8");
assert.match(releaseScript, /pm2 delete "\$\{PM2_APPS\[@\]\}"/, "release activation replaces stale PM2 process definitions");
assert.doesNotMatch(releaseScript, /pm2 startOrRestart/, "release activation never preserves an old PM2 cwd");
assert.match(releaseScript, /wait_for_web_port_to_clear/, "release activation waits for the old web listener to stop");
assert.match(releaseScript, /wait_for_local_release "\$SHORT_SHA"/, "release activation waits for the expected local health identity");
assert.match(releaseScript, /worktree remove --force "\$RELEASE_DIR"/, "failed releases are removed to avoid filling the production disk");
assert.match(releaseScript, /cleanup_inactive_releases/, "deployment removes inactive Git-managed releases before installation");
assert.match(releaseScript, /MIN_FREE_KB/, "deployment enforces a minimum free-space threshold");
assert.match(releaseScript, /npm cache clean --force/, "deployment may clear only the disposable npm cache when capacity is low");
assert.doesNotMatch(releaseScript, /rm\s+-rf/, "deployment cleanup never recursively deletes arbitrary paths");

const ecosystemSource = readFileSync("ecosystem.config.js", "utf8");
assert.match(ecosystemSource, /script:\s*["']node_modules\/next\/dist\/bin\/next["']/, "PM2 owns the Next server directly without an npm wrapper");
assert.doesNotMatch(ecosystemSource, /script:\s*["']npm["']\s*,\s*args:\s*["']start["']/s, "the web process cannot leave an npm-spawned listener behind");

console.log("Deployment safety tests passed.");
