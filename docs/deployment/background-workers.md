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
- `garment_asset_generation`
- `fit_locked_preview_generation`
- `true_3d_tryon_generation`
- `style_profile_learning`
- `memory_rollup`

The current queue is MongoDB-backed and shaped so AWS SQS can replace it later.

`avatar_preview_generation` uses FitPick's internal image preview by default. To route previews to a real virtual try-on engine, set `TRYON_PROVIDER=custom` and configure the custom endpoint variables below.

`true_3d_tryon_generation` uses the same provider adapter. Without a configured external provider, it falls back to the internal still-image preview path or returns provider unavailable for unsupported provider modes.

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
S3_PUBLIC_BASE_URL=
NEXT_PUBLIC_APP_URL=
# Optional: provide both only when not using EC2 IAM role credentials.
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
```

The worker startup log may list missing variable names, but it must never print variable values. On EC2, `S3_ACCESS_KEY_ID` and `S3_SECRET_ACCESS_KEY` may be empty when the instance has an IAM role with S3 access.

Optional virtual try-on provider variables:

```env
TRYON_PROVIDER=internal_preview
# Use custom to call an external virtual try-on engine.
# TRYON_PROVIDER=custom
TRYON_CUSTOM_ENDPOINT=
TRYON_CUSTOM_API_KEY=
TRYON_CUSTOM_STATUS_ENDPOINT=
TRYON_TIMEOUT_MS=90000

# Use FASHN Try-On Max as a dedicated provider.
# TRYON_PROVIDER=fashn
FASHN_API_KEY=
FASHN_BASE_URL=https://api.fashn.ai/v1
FASHN_MODEL_NAME=tryon-max
FASHN_RESOLUTION=1k
FASHN_GENERATION_MODE=balanced
FASHN_OUTPUT_FORMAT=png
FASHN_RETURN_BASE64=true
FASHN_MAX_OUTFIT_ITEMS=6
FASHN_TIMEOUT_MS=90000
FASHN_POLL_MS=3000
```

The custom endpoint receives a JSON payload with:

- `avatar`: saved avatar profile and body preferences
- `garments`: selected wardrobe items with `referenceImageUrl`, category, color, fabric, fit, measurements, and image metadata
- `desiredView`: `front`, `back`, `side`, `walking`, or `360`
- `instructions`: FitPick's virtual try-on constraints, including preserving exact garment identity and keeping shoes/accessories

The provider may return a completed image immediately:

```json
{
  "status": "ready",
  "previewUrl": "https://provider.example/output.png",
  "accuracyLevel": "true_3d_simulation",
  "warnings": []
}
```

It may also return `previewBase64`/`base64`, which FitPick uploads to S3, or return `status: "queued"` with `jobId` for asynchronous providers. Do not include provider secrets in job payloads or logs.

Redis and SQS are not required for this phase. Future adapters should keep the same queue/cache interfaces.
