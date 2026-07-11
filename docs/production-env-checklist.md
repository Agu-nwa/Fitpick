# FitPick Production Environment Checklist

Use this checklist to create the production `.env.local` on EC2. Do not commit real values.

## App and Session

```bash
NODE_ENV=production
APP_URL=
NEXT_PUBLIC_APP_URL=
SESSION_COOKIE_NAME=fitpick_session
SESSION_COOKIE_SECURE=false
JWT_SECRET=
```

Notes:

- `APP_URL` and `NEXT_PUBLIC_APP_URL` should use the production domain after DNS is ready.
- Use `SESSION_COOKIE_SECURE=false` for temporary plain HTTP EC2 IP testing. Switch to `SESSION_COOKIE_SECURE=true` when HTTPS is enabled.
- `JWT_SECRET` must be a long, random secret.
- Keep session cookies HTTP-only through the backend session implementation.
- In production, session cookies must be `httpOnly`, `secure`, `sameSite=lax`, and scoped to `/`.

## Email OTP Auth

```bash
EMAIL_PROVIDER=resend
RESEND_API_KEY=
EMAIL_FROM="FitPick <auth@myfitpick.com>"
OTP_CODE_TTL_MINUTES=10
OTP_MAX_ATTEMPTS=5
```

Notes:

- `RESEND_API_KEY` must remain server-only.
- The Resend sender for production beta is `FitPick <auth@myfitpick.com>`.
- OTP codes are 6 digits, expire after 10 minutes by default, and allow 5 attempts by default.
- FitPick stores only hashed OTP codes in MongoDB.
- Sign in never creates users automatically; users must complete sign up first.

## Database

```bash
MONGODB_URI=
```

Notes:

- Use a production MongoDB database.
- Restrict network access where possible.
- Use a database user with only the permissions FitPick needs.

## S3 + CloudFront

```bash
STORAGE_PROVIDER=s3
S3_BUCKET=
S3_REGION=
S3_PUBLIC_BASE_URL=
# Optional for local/static-key deployments. Leave both empty on EC2 when using an IAM role.
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
```

Notes:

- Production EC2 should prefer IAM role credentials. Leave `S3_ACCESS_KEY_ID` and `S3_SECRET_ACCESS_KEY` empty when using the EC2 role.
- If static S3 keys are used for local development or a non-EC2 deployment, provide both keys. Providing only one key fails validation.
- `S3_SECRET_ACCESS_KEY` must remain server-only when configured.
- Test signed S3 upload before public launch.
- Customer UI should never show raw S3 errors, signed URLs, access keys, or provider internals.
- Prefer CloudFront Origin Access Control and avoid direct public S3 access for production.

## AI Tagging

```bash
AI_TAGGING_PROVIDER=mock
GEMINI_API_KEY=
OPENAI_API_KEY=
```

Allowed provider values:

```text
mock | gemini | openai
```

Notes:

- `mock` is the safest default until provider testing is complete.
- Keep user tag review required.
- Do not auto-save AI suggestions without user confirmation.

## Background Worker

```bash
ENABLE_BACKGROUND_JOBS=true
WORKER_POLL_MS=5000
```

Notes:

- The PM2 worker loads `.env.local` before validating configuration.
- If background jobs should be disabled, set `ENABLE_BACKGROUND_JOBS=false`; the worker exits cleanly and PM2 should not restart it in a loop.
- Worker logs may show missing variable names, but must not show secret values.


## Payments

```bash
PAYMENT_PROVIDER=placeholder
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
FITPICK_PLUS_STRIPE_PRICE_ID=
STRIPE_SUCCESS_URL=
STRIPE_CANCEL_URL=
PAYSTACK_SECRET_KEY=
PAYSTACK_PUBLIC_KEY=
PAYSTACK_WEBHOOK_SECRET=
FITPICK_PLUS_PAYSTACK_PLAN_CODE=
PAYSTACK_CALLBACK_URL=
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=
```

Allowed provider values:

```text
auto | stripe | paystack | placeholder
```

Notes:

- Use sandbox keys until HTTPS and webhook verification are complete.
- Stripe webhook URL: `https://YOUR_DOMAIN/api/billing/webhook/stripe`
- Paystack webhook URL: `https://YOUR_DOMAIN/api/billing/webhook/paystack`
- Live payments should not be activated before HTTPS is working.

## Optional

```bash
RATE_LIMIT_REDIS_URL=
```

Notes:

- Add Redis-backed rate limiting when production traffic begins.
- Leave blank only if the current deployment does not require external rate limiting.

## Final Review

- `.env.local` exists on EC2.
- `.env.local` is not committed.
- No real secrets appear in docs, screenshots, logs, or client code.
- `npm run test:secret-scan` passes.
- `npm run deploy:check` passes.
- `curl -I http://127.0.0.1:3000/api/health` returns `200 OK`.
