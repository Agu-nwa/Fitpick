#!/usr/bin/env bash
set -Eeuo pipefail

RELEASE_SHA="${1:-}"
SOURCE_REPO="${FITPICK_SOURCE_REPO:-/home/ubuntu/Fitpick}"
RELEASE_ROOT="${FITPICK_RELEASE_ROOT:-/home/ubuntu/fitpick-releases}"
PUBLIC_HEALTH_URL="${FITPICK_PUBLIC_HEALTH_URL:-https://myfitpick.com/api/health}"
LOCK_FILE="${FITPICK_DEPLOY_LOCK:-/tmp/myfitpick-production-deploy.lock}"

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

RELEASE_DIR="${RELEASE_ROOT}/${SHORT_SHA}-$(date -u +%Y%m%d%H%M%S)"
mkdir -p "$RELEASE_ROOT"
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

SWITCHED=false
rollback() {
  local exit_code=$?
  if [[ "$SWITCHED" == "true" && -f "$CURRENT_DIR/ecosystem.config.js" ]]; then
    echo "Release verification failed; restoring the previous PM2 release." >&2
    cd "$CURRENT_DIR"
    export NEXT_DEPLOYMENT_ID="$(git rev-parse --short=12 HEAD)"
    pm2 startOrRestart ecosystem.config.js --update-env || true
    pm2 save || true
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

pm2 startOrRestart ecosystem.config.js --update-env
SWITCHED=true
pm2 save

node scripts/verify-production-release.mjs \
  --runtime \
  --expected-deployment="$SHORT_SHA" \
  --local-url=http://127.0.0.1:3000/api/health \
  --public-url="$PUBLIC_HEALTH_URL"

SWITCHED=false
echo "MyFitPick production deployment completed: $SHORT_SHA"
