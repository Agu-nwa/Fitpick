# FitPick EC2 + PM2 Production Commands

Run these from the FitPick app directory on EC2.

Before building or restarting PM2, create or update `.env.local` in this directory. The Next.js web app and the `fitpick-worker` PM2 process both rely on it. Do not commit real values.

```bash
git pull
```

Pulls the latest committed application code from GitHub.

```bash
npm install
```

Installs dependencies exactly from `package-lock.json`.

```bash
npm run build:ec2
```

Builds the Next.js production bundle with a larger Node heap for small EC2 instances and catches TypeScript/build issues before restart.

```bash
npm run test:secret-scan
npm run test:safety-copy
npm run check:routes
```

Runs lightweight deployment safety checks before PM2 restart.

```bash
pm2 startOrRestart ecosystem.config.js --update-env
```

Starts or restarts both the FitPick web process and the background worker, then reloads updated environment variables.

The worker also loads `.env.local` itself before validating config. If `ENABLE_BACKGROUND_JOBS=false`, it exits cleanly with status `disabled` and PM2 should not restart it in a loop.

```bash
pm2 status
```

Shows process health, uptime, restart count, and memory usage.

```bash
pm2 logs fitpick --lines 100
pm2 logs fitpick-worker --lines 100
```

Shows the latest application and worker logs for deployment verification.

Worker configuration failures should show only missing variable names, never secret values. If you see `errorCategory: "configuration"`, confirm `.env.local` includes `ENABLE_BACKGROUND_JOBS=true`, MongoDB, OpenAI, S3, CloudFront/public URL, and app URL variables.

```bash
pm2 save
```

Persists the current PM2 process list so it restores on reboot.

## Rollback Basics

If a deployment fails after `git pull`, identify the previous good commit and reset back to it:

```bash
git log --oneline -5
git checkout <previous-good-commit>
npm install
npm run build:ec2
pm2 startOrRestart ecosystem.config.js --update-env
pm2 save
```

After rollback, create a follow-up fix branch before returning to the latest main branch.
