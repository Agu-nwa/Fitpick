# FitPick EC2 + PM2 Production Release

Build each release in its own directory. Do not run `next build` inside the directory currently served by PM2: replacing `.next` while the old process is live can mix old HTML and new Server Action assets.

## Prepare an isolated release

Run as the deployment user:

```bash
cd /home/ubuntu/Fitpick
git fetch --prune origin main

RELEASE_SHA="$(git rev-parse --short=12 origin/main)"
RELEASE_DIR="/home/ubuntu/fitpick-releases/$RELEASE_SHA"
CURRENT_DIR="$(readlink -f /proc/$(pm2 pid fitpick)/cwd)"

mkdir -p /home/ubuntu/fitpick-releases
git worktree add --detach "$RELEASE_DIR" origin/main
cp "$CURRENT_DIR/.env.local" "$RELEASE_DIR/.env.local"
chmod 600 "$RELEASE_DIR/.env.local"

cd "$RELEASE_DIR"
npm ci
npm run typecheck
npm run test:recommendation-integrity
npm run test:deployment-safety
npm run build:ec2
npm run deploy:verify-build
```

If any command fails, do not restart PM2. The currently running release remains untouched.

## Atomic PM2 switch

The deployment identity is exposed by `/api/health` and lets the checks prove which code is serving traffic.

```bash
cd "$RELEASE_DIR"
export NEXT_DEPLOYMENT_ID="$RELEASE_SHA"

pm2 startOrRestart ecosystem.config.js --update-env
pm2 save

node scripts/verify-production-release.mjs \
  --runtime \
  --expected-deployment="$RELEASE_SHA" \
  --local-url=http://127.0.0.1:3000/api/health \
  --public-url=https://myfitpick.com/api/health
```

The runtime verification fails when build manifests are missing, PM2 uses the wrong release directory, more than one process owns port 3000, the listener is outside the FitPick PM2 process tree, health is not OK, or the local/public deployment identity does not match the expected commit.

Inspect the release after the switch:

```bash
pm2 status
pm2 describe fitpick | grep -Ei 'status|exec cwd|script path'
pm2 logs fitpick --lines 100 --nostream
```

Users with a page open during the switch can still have an old browser bundle. A normal reload obtains the new build. If a browser reports a Server Action mismatch, close the old tab or perform a full reload; do not delete the active release's `.next` directory.

## Roll back without rebuilding in place

Choose a previously built release directory, then switch PM2 back to it:

```bash
ROLLBACK_DIR=/home/ubuntu/fitpick-releases/PREVIOUS_RELEASE_SHA
cd "$ROLLBACK_DIR"
export NEXT_DEPLOYMENT_ID="$(git rev-parse --short=12 HEAD)"
pm2 startOrRestart ecosystem.config.js --update-env
pm2 save

node scripts/verify-production-release.mjs \
  --runtime \
  --expected-deployment="$NEXT_DEPLOYMENT_ID" \
  --local-url=http://127.0.0.1:3000/api/health \
  --public-url=https://myfitpick.com/api/health
```

Keep at least the current and previous verified release directories. Remove older worktrees only during a separate, reviewed cleanup—not during an active deployment.
