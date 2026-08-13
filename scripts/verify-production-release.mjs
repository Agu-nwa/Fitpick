import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const requiredNextArtifacts = [
  ".next/BUILD_ID",
  ".next/prerender-manifest.json",
  ".next/routes-manifest.json",
  ".next/server/app-paths-manifest.json"
];

export function missingBuildArtifacts(root = process.cwd()) {
  return requiredNextArtifacts.filter((file) => !existsSync(resolve(root, file)));
}

export function parseListenerPids(output = "") {
  const pids = new Set();
  for (const match of output.matchAll(/(?:pid=|\s)(\d+)(?=,|\s|$)/g)) pids.add(Number(match[1]));
  return Array.from(pids).filter((pid) => Number.isInteger(pid) && pid > 0);
}

function commandOutput(command, args) {
  try {
    return execFileSync(command, args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return "";
  }
}

export function listenerPids(port) {
  const lsof = commandOutput("lsof", ["-nP", `-iTCP:${port}`, "-sTCP:LISTEN", "-t"]);
  if (lsof.trim()) return Array.from(new Set(lsof.trim().split(/\s+/).map(Number).filter(Boolean)));
  return parseListenerPids(commandOutput("ss", ["-ltnp", `sport = :${port}`]));
}

function pm2Process(name) {
  const output = commandOutput("pm2", ["jlist"]);
  if (!output.trim()) return null;
  try {
    const processes = JSON.parse(output);
    return processes.find((process) => process?.name === name) || null;
  } catch {
    return null;
  }
}

function parentPid(pid) {
  return Number(commandOutput("ps", ["-o", "ppid=", "-p", String(pid)]).trim() || 0);
}

export function pidBelongsToProcessTree(pid, rootPid) {
  if (!pid || !rootPid) return false;
  let current = pid;
  const seen = new Set();
  while (current > 1 && !seen.has(current)) {
    if (current === rootPid) return true;
    seen.add(current);
    current = parentPid(current);
  }
  return false;
}

async function health(url, expectedDeploymentId) {
  const response = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(8_000) });
  if (!response.ok) throw new Error(`Health endpoint returned HTTP ${response.status}.`);
  const payload = await response.json();
  const data = payload?.data || payload;
  if (data?.service !== "fitpick" || data?.checks?.app !== "ok") throw new Error("Health endpoint did not identify a healthy FitPick app.");
  if (expectedDeploymentId && data?.deploymentId !== expectedDeploymentId) {
    throw new Error(`Deployment identity mismatch: expected ${expectedDeploymentId}, received ${data?.deploymentId || "unknown"}.`);
  }
  return data;
}

export async function verifyProductionRelease(options = {}) {
  const root = options.root || process.cwd();
  const port = Number(options.port || 3000);
  const processName = options.processName || "fitpick";
  const failures = [];
  const missing = missingBuildArtifacts(root);
  if (missing.length) failures.push(`Missing Next.js build artifacts: ${missing.join(", ")}`);
  else {
    const buildId = readFileSync(resolve(root, ".next/BUILD_ID"), "utf8").trim();
    if (!buildId) failures.push(".next/BUILD_ID is empty.");
  }

  if (options.runtime) {
    const listeners = listenerPids(port);
    const app = pm2Process(processName);
    const pm2Pid = Number(app?.pid || 0);
    const pm2Cwd = app?.pm2_env?.pm_cwd ? resolve(app.pm2_env.pm_cwd) : "";
    if (!app || app?.pm2_env?.status !== "online") failures.push(`PM2 process ${processName} is not online.`);
    if (pm2Cwd !== resolve(root)) failures.push(`PM2 cwd mismatch: expected ${resolve(root)}, received ${pm2Cwd || "unknown"}.`);
    if (listeners.length === 0) {
      failures.push(`Expected a listener on port ${port}; found none.`);
    } else {
      const foreignListeners = listeners.filter((pid) => !pidBelongsToProcessTree(pid, pm2Pid));
      if (foreignListeners.length) {
        failures.push(`Port ${port} has listener PIDs outside the ${processName} PM2 process tree: ${foreignListeners.join(", ")}.`);
      }
    }

    for (const url of [options.localUrl, options.publicUrl].filter(Boolean)) {
      try {
        await health(url, options.expectedDeploymentId);
      } catch (error) {
        failures.push(`${url}: ${error instanceof Error ? error.message : "health check failed"}`);
      }
    }
  }

  return { ok: failures.length === 0, failures };
}

function argumentValue(name) {
  const prefix = `--${name}=`;
  return process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length) || "";
}

async function main() {
  const runtime = process.argv.includes("--runtime");
  const result = await verifyProductionRelease({
    runtime,
    expectedDeploymentId: argumentValue("expected-deployment"),
    localUrl: argumentValue("local-url") || (runtime ? "http://127.0.0.1:3000/api/health" : ""),
    publicUrl: argumentValue("public-url"),
    port: Number(argumentValue("port") || 3000),
    processName: argumentValue("process-name") || "fitpick"
  });
  if (!result.ok) {
    console.error("Production release verification failed:");
    for (const failure of result.failures) console.error(`- ${failure}`);
    process.exitCode = 1;
    return;
  }
  console.log(runtime ? "Production runtime verification passed." : "Next.js build artifact verification passed.");
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) await main();
