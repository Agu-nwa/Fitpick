#!/usr/bin/env bash
set -Eeuo pipefail

RELEASE_SHA="${1:-}"
SOURCE_REPO="${FITPICK_SOURCE_REPO:-/home/ubuntu/Fitpick}"
RELEASE_ROOT="${FITPICK_RELEASE_ROOT:-/home/ubuntu/fitpick-releases}"
PUBLIC_HEALTH_URL="${FITPICK_PUBLIC_HEALTH_URL:-https://myfitpick.com/api/health}"
LOCK_FILE="${FITPICK_DEPLOY_LOCK:-/tmp/myfitpick-production-deploy.lock}"
PM2_APPS=(fitpick fitpick-worker fitpick-tryon-worker fitpick-realtime)
MIN_FREE_KB="${FITPICK_MIN_FREE_KB:-5242880}"

if [[ ! "$RELEASE_SHA" =~ ^[0-9a-f]{40}$ ]]; then
  echo "A full 40-character release SHA is required." >&2
  exit 2
fi

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo "Another MyFitPick deployment is already running." >&2
  exit 3
fi

cd "$SOURCE_REPO"
git cat-file -e "${RELEASE_SHA}^{commit}"
if ! git merge-base --is-ancestor "$RELEASE_SHA" origin/main; then
  echo "The requested release is not part of origin/main." >&2
  exit 2
fi
SHORT_SHA="$(git rev-parse --short=12 "$RELEASE_SHA")"
CURRENT_PID="$(pm2 pid fitpick || true)"
CURRENT_DIR=""
if [[ "$CURRENT_PID" =~ ^[0-9]+$ ]] && (( CURRENT_PID > 0 )); then
  CURRENT_DIR="$(readlink -f "/proc/${CURRENT_PID}/cwd" || true)"
fi
if [[ -z "$CURRENT_DIR" ]]; then
  CURRENT_DIR="$SOURCE_REPO"
fi
if [[ ! -f "$CURRENT_DIR/.env.local" ]]; then
  echo "The active release does not contain .env.local; deployment stopped." >&2
  exit 4
fi

mkdir -p "$RELEASE_ROOT"

cleanup_inactive_releases() {
  local worktree_path=""
  local resolved_path=""

  # Only remove paths registered by Git as worktrees beneath the dedicated
  # release root. The source checkout and currently running release are never
  # candidates, so one verified rollback target is always preserved.
  while IFS= read -r worktree_path; do
    [[ "$worktree_path" == "$RELEASE_ROOT"/* ]] || continue
    resolved_path="$(readlink -f "$worktree_path" 2>/dev/null || true)"
    [[ -n "$resolved_path" ]] || continue
    [[ "$resolved_path" == "$CURRENT_DIR" ]] && continue
    echo "Removing inactive release worktree: $resolved_path"
    git -C "$SOURCE_REPO" worktree remove --force "$resolved_path"
  done < <(git -C "$SOURCE_REPO" worktree list --porcelain | sed -n 's/^worktree //p')

  git -C "$SOURCE_REPO" worktree prune
}

available_kb() {
  df -Pk "$RELEASE_ROOT" | awk 'NR == 2 { print $4 }'
}

ensure_deployment_capacity() {
  local free_kb="$(available_kb)"
  if [[ ! "$free_kb" =~ ^[0-9]+$ ]]; then
    echo "Unable to determine free disk capacity for $RELEASE_ROOT." >&2
    exit 5
  fi

  if (( free_kb < MIN_FREE_KB )); then
    echo "Only $((free_kb / 1024)) MiB is free; clearing the ubuntu npm download cache." >&2
    npm cache clean --force
    free_kb="$(available_kb)"
  fi

  if [[ ! "$free_kb" =~ ^[0-9]+$ ]] || (( free_kb < MIN_FREE_KB )); then
    echo "Deployment requires at least $((MIN_FREE_KB / 1024)) MiB free under $RELEASE_ROOT; only $((free_kb / 1024)) MiB is available." >&2
    exit 5
  fi

  echo "Deployment capacity check passed: $((free_kb / 1024)) MiB free."
}

cleanup_inactive_releases
ensure_deployment_capacity

RELEASE_DIR="${RELEASE_ROOT}/${SHORT_SHA}-$(date -u +%Y%m%d%H%M%S)"
git worktree add --detach "$RELEASE_DIR" "$RELEASE_SHA"
cp "$CURRENT_DIR/.env.local" "$RELEASE_DIR/.env.local"
chmod 600 "$RELEASE_DIR/.env.local"

# Worktrees intentionally start without build output. Reusing only Next's
# disposable compiler cache keeps the active release isolated while avoiding
# a full cold webpack rebuild on the production host.
if [[ -d "$CURRENT_DIR/.next/cache" ]]; then
  mkdir -p "$RELEASE_DIR/.next"
  cp -a "$CURRENT_DIR/.next/cache" "$RELEASE_DIR/.next/cache"
fi

activate_release() {
  local release_dir="$1"
  cd "$release_dir"

  # PM2's startOrRestart preserves the cwd of an existing process. Delete only
  # MyFitPick's named processes so the ecosystem file is recreated from this
  # exact release directory.
  pm2 delete "${PM2_APPS[@]}" >/dev/null 2>&1 || true
  pm2 start ecosystem.config.js --update-env
  pm2 save
}

wait_for_local_release() {
  local expected="$1"
  local actual=""
  for attempt in $(seq 1 30); do
    actual="$(curl --fail --silent --show-error --max-time 5 http://127.0.0.1:3000/api/health 2>/dev/null \
      | node -e 'let body=""; process.stdin.on("data", chunk => body += chunk); process.stdin.on("end", () => { try { const value = JSON.parse(body); process.stdout.write(value?.data?.deploymentId || value?.deploymentId || ""); } catch {} });' || true)"
    if [[ "$actual" == "$expected" ]]; then
      return 0
    fi
    sleep 2
  done
  echo "The new application did not become healthy on port 3000 within 60 seconds." >&2
  return 1
}

SWITCHED=false
rollback() {
  local exit_code=$?
  if [[ "$SWITCHED" == "true" && -f "$CURRENT_DIR/ecosystem.config.js" ]]; then
    echo "Release verification failed; restoring the previous PM2 release." >&2
    export NEXT_DEPLOYMENT_ID="$(git -C "$CURRENT_DIR" rev-parse --short=12 HEAD)"
    activate_release "$CURRENT_DIR" || true
    wait_for_local_release "$NEXT_DEPLOYMENT_ID" || true
  fi
  if [[ -d "$RELEASE_DIR" && "$RELEASE_DIR" != "$CURRENT_DIR" ]]; then
    git -C "$SOURCE_REPO" worktree remove --force "$RELEASE_DIR" || true
    git -C "$SOURCE_REPO" worktree prune || true
  fi
  exit "$exit_code"
}
trap rollback ERR

cd "$RELEASE_DIR"
export CI=true
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=4096}"
export NEXT_DEPLOYMENT_ID="$SHORT_SHA"

npm ci --no-audit --no-fund
npm run deploy:check
npm run typecheck
npm run test:recommendation-integrity
npm run test:deployment-safety
npm run build:ec2
npm run deploy:verify-build

SWITCHED=true
activate_release "$RELEASE_DIR"
wait_for_local_release "$SHORT_SHA"

node scripts/verify-production-release.mjs \
  --runtime \
  --expected-deployment="$SHORT_SHA" \
  --local-url=http://127.0.0.1:3000/api/health \
  --public-url="$PUBLIC_HEALTH_URL"

SWITCHED=false
echo "MyFitPick production deployment completed: $SHORT_SHA"
