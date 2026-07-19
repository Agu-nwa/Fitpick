# FitPick Integration Status

## Completed Phases

- Frontend Phase 4D: mobile-first app shell, routes, mock screens, and UI states.
- Backend Phase 5A-5E: auth, sessions, MongoDB models, wardrobe, uploads, occasions, outfits, looks, preferences, notifications, Credits, audit, and safe API responses.
- S3 Storage Integration: signed upload foundation, image metadata, CloudFront URLs, and safe not-configured fallback.
- AI Tagging Phase: provider-based clothing tag suggestions with mandatory user review.
- Integration Phase 6A-6F: API client, auth, wardrobe, upload, AI tagging, occasion, outfit recommendation, looks, preferences, Credit wallet, payment foundation, and readiness cleanup.

## Integrated Screens

- `/login`, `/register`, `/profile`
- `/wardrobe`, `/wardrobe/add`, `/wardrobe/[id]`
- `/occasion`
- `/outfit`, `/outfit/[id]`
- `/looks`
- `/profile/preferences`
- `/plus`
- `/backend-ready`, `/frontend-complete`, `/states`

## Connected APIs

- Auth: register, login, logout, session check.
- Wardrobe: list, create, detail, update, tag update, archive, upload metadata, signed upload, suggest tags, review tags.
- Occasions: list and custom creation.
- Outfits: recommend, detail, swap, save, wear, feedback.
- Looks: saved, worn, favorites.
- Profile: current user, safe user update, style preferences, notification preferences.
- Credits and payments: wallet, trusted Credit packs, Stripe one-time Checkout, CoinPayments USDT invoice checkout, provider readiness, signed webhooks.

## Fallback Behavior

- Logged-out users see auth-required cards and example previews where useful.
- Backend unavailable states use safe copy and preserve helpful mock previews.
- Empty wardrobe and looks states guide users toward next actions.
- S3, AI tagging, Stripe, and CoinPayments return safe not-configured messages when environment variables are missing.

## Environment Variables

- App/auth: `APP_URL`, `NEXT_PUBLIC_APP_URL`, `MONGODB_URI`, `JWT_SECRET`, `SESSION_COOKIE_NAME`
- Storage: `STORAGE_PROVIDER`, `S3_BUCKET`, `S3_REGION`, `S3_PUBLIC_BASE_URL`; optional `S3_ACCESS_KEY_ID` and `S3_SECRET_ACCESS_KEY` when not using EC2 IAM role credentials
- AI tagging: `OPENAI_API_KEY`
- Payments: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `COINPAYMENTS_API_BASE_URL`, `COINPAYMENTS_CLIENT_ID`, `COINPAYMENTS_CLIENT_SECRET`, `COINPAYMENTS_WEBHOOK_SECRET`, `COINPAYMENTS_WEBHOOK_URL`, `COINPAYMENTS_USD_CURRENCY_ID`, `COINPAYMENTS_USDT_NETWORK_ALLOWLIST`

## Known Limitations

- Stripe and CoinPayments are implemented for one-time Credit purchases; production account activation, webhook registration, and live low-value transaction verification remain.
- AI tagging uses provider abstraction; production image-understanding quality tuning remains.
- Push notification delivery remains disabled until a production notification provider is selected.
- Account deletion/export execution needs production workflow hardening.

## Local Commands

- `npm install`
- `npm run dev`
- `npm run build`

## EC2 Notes

- `npm install`
- `npm run build`
- `pm2 start npm --name fitpick -- start -- --hostname 0.0.0.0 --port 3000`
- Nginx can proxy port 80 to 3000.

## Next Phase

Testing Phase 7: end-to-end QA, mobile/accessibility verification, backend smoke coverage, payment sandbox checks, upload QA, and deployment readiness.

See `docs/testing-phase-7.md` for the active QA checklist and command sequence.
