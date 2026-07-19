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
- The Resend sender for production launch is `FitPick <auth@myfitpick.com>`.
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
OPENAI_API_KEY=
```

Notes:

- Production wardrobe analysis uses OpenAI. Do not configure mock AI tagging for launch.
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


## Credit Purchases

```bash
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
COINPAYMENTS_API_BASE_URL=https://a-api.coinpayments.net/api/v2
COINPAYMENTS_CLIENT_ID=
COINPAYMENTS_CLIENT_SECRET=
COINPAYMENTS_WEBHOOK_SECRET=
COINPAYMENTS_WEBHOOK_URL=https://YOUR_DOMAIN/api/webhooks/coinpayments
COINPAYMENTS_USD_CURRENCY_ID=
COINPAYMENTS_USDT_NETWORK_ALLOWLIST=
```

Notes:

- Use sandbox keys until HTTPS and webhook verification are complete.
- Stripe webhook URL: `https://YOUR_DOMAIN/api/webhooks/stripe`
- CoinPayments webhook URL: `https://YOUR_DOMAIN/api/webhooks/coinpayments`
- Stripe is used only for one-time Credit purchases with hosted Checkout.
- CoinPayments is used only for hosted USDT invoices. Do not use a static wallet address.
- `COINPAYMENTS_USDT_NETWORK_ALLOWLIST` must use exact CoinPayments provider currency IDs from the merchant account.
- Live payments should not be activated before HTTPS is working.

Example network allowlist shape:

```json
[
  { "id": "usdt-trc20", "displayName": "USDT on Tron", "asset": "USDT", "network": "TRC20", "providerCurrencyId": "COINPAYMENTS_VALUE", "estimatedFee": "Very low" },
  { "id": "usdt-bep20", "displayName": "USDT on BNB Smart Chain", "asset": "USDT", "network": "BEP20", "providerCurrencyId": "COINPAYMENTS_VALUE", "estimatedFee": "Very low" },
  { "id": "usdt-erc20", "displayName": "USDT on Ethereum", "asset": "USDT", "network": "ERC20", "providerCurrencyId": "COINPAYMENTS_VALUE", "estimatedFee": "Higher" },
  { "id": "usdt-solana", "displayName": "USDT on Solana", "asset": "USDT", "network": "Solana", "providerCurrencyId": "COINPAYMENTS_VALUE", "estimatedFee": "Fast · Lower network fees" }
]
```

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
