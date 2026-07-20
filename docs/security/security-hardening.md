# FitPick Security Hardening

Phase 10 hardening focuses on practical controls before deployment readiness. This is not the final production readiness audit.

## Authentication

- `JWT_SECRET` is required and must be at least 32 characters.
- Production cookies must be HTTP-only, secure, `sameSite=lax`, path-scoped to `/`, and time-limited.
- Auth routes return generic errors and must not log passwords, tokens, request cookies, or request bodies.
- Protected APIs must use `requireUser()` or `requireAdmin()`.

## Authorization

Every user-owned lookup must include `userId` from the authenticated session. Never trust a client-submitted `userId`.

Protected resources include wardrobe items, wardrobe uploads, outfit recommendations, outfit previews, Style DNA, Fashion Memory, background jobs, saved looks, worn looks, notification preferences, and privacy preferences.

## Validation

- API bodies should use Zod.
- Object IDs should be rejected before database lookup.
- Strings must be trimmed and length-limited.
- Arrays must be bounded and normalized.
- Booleans, enums, scores, and dates must be validated.
- Client MIME type is checked for upload intent. If uploads ever proxy through the app server, add image-content signature validation.

## Uploads And Storage

- Browser upload keys are server-generated.
- S3 keys must remain under the authenticated user prefix.
- Allowed image types are JPG, PNG, WebP, HEIC, and HEIF.
- Max wardrobe upload size is 20 MB.
- Generated previews must remain under `generated-previews/<userId>/`.
- Never log signed URLs, Authorization headers, Base64 image data, AWS keys, or raw provider errors.

## AI Safety

- User prompts, OCR text, label text, image-derived text, and wardrobe notes are untrusted.
- Stylist responses must remain grounded in owned wardrobe item IDs.
- AI JSON output must be schema-validated before use.
- Prompt injection attempts must not reveal system/developer prompts or internal instructions.
- Raw prompts and raw provider responses should not be stored in logs.

## Abuse Protection

The current limiter is in-memory and Redis-ready. Apply limits to login/register, signed upload creation, wardrobe upload/analyze/confirm, outfit recommendations, outfit previews, stylist chat/vision, Fashion Memory POST, Style DNA PATCH, and Credit checkout.

Move to Redis before multi-instance production traffic.

## Pre-Launch Checklist

- Run `npm run test:secret-scan`.
- Run `npm audit`.
- Run `npm run build`.
- Confirm no `.env.local` or secret backup files are tracked.
- Confirm S3 CORS and CloudFront OAC/OAI are configured.
- Confirm another user cannot access guessed wardrobe, upload, outfit, preview, or job IDs.
- Confirm logs contain categories, not tokens, signed URLs, prompts, or provider payloads.
