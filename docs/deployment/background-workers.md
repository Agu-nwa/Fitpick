# FitPick Background Workers

FitPick can run expensive AI jobs in a background worker when `ENABLE_BACKGROUND_JOBS=true`.

The worker entrypoint loads environment files before validating configuration. It checks these files from the app directory, without logging secret values:

1. `.env.production.local`
2. `.env.local`
3. `.env.production`
4. `.env`

Real EC2 secrets should live in `.env.local` or in the PM2 environment, never in committed files.

Supported v1 jobs:

- `outfit_preview_generation`
- `wardrobe_analysis`
- `label_ocr`
- `avatar_preview_generation`
- `garment_background_processing`
- `garment_asset_generation`
- `fit_locked_preview_generation`
- `true_3d_tryon_generation`
- `style_profile_learning`
- `memory_rollup`

The current queue is MongoDB-backed and shaped so AWS SQS can replace it later.

`true_3d_tryon_generation` is integration-ready only. It returns provider unavailable until a real garment simulation provider or internal mesh pipeline is configured.

## Local Development

```bash
npm run worker
```

Runs the worker once as a long-lived polling process.

```bash
npm run worker:dev
```

Runs the worker with file watching for local development.

## EC2 + PM2

Before starting PM2, confirm `.env.local` exists in the FitPick app directory and includes the worker variables listed below.

```bash
pm2 startOrRestart ecosystem.config.js --only fitpick-worker --update-env
```

Starts or restarts the worker as a separate PM2 process.

```bash
pm2 restart fitpick-worker --update-env
```

Restarts the worker and reloads environment variables.

```bash
pm2 logs fitpick-worker --lines 100
```

Shows the latest worker logs for job processing, retries, and failures.

If `ENABLE_BACKGROUND_JOBS=false`, the worker exits with status `disabled`. PM2 is configured with `stop_exit_codes: [0]`, so this clean exit should not restart in a loop.

```bash
pm2 save
```

Persists the PM2 process list so the worker restarts after reboot.

## Environment

```env
ENABLE_BACKGROUND_JOBS=true
WORKER_POLL_MS=5000
AI_CACHE_PROVIDER=memory
RATE_LIMIT_PROVIDER=memory
```

Required production variables for the worker and job handlers:

```env
NODE_ENV=production
MONGODB_URI=
JWT_SECRET=
OPENAI_API_KEY=
S3_BUCKET=
S3_REGION=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_PUBLIC_BASE_URL=
NEXT_PUBLIC_APP_URL=
```

Optional, depending on enabled job types:

```env
BACKGROUND_REMOVAL_PROVIDER=removebg
BACKGROUND_REMOVAL_API_KEY=
FITPICK_STUDIO_BACKGROUND_PRESET=ivory
```

The worker startup log may list missing variable names, but it must never print variable values.

Redis and SQS are not required for this phase. Future adapters should keep the same queue/cache interfaces.
