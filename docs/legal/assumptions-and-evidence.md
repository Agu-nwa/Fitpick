# Assumptions and Evidence Log

| Material statement | Assumption | Evidence/source | Confidence | Legal review |
|---|---|---|---|---|
| MyFitPick supports email OTP | Production enables implemented provider | Auth request/verify routes, `EmailOtp`, Resend adapter | Confirmed implementation | Review notice/CASL |
| Session cookie is HTTP-only, Lax and up to 30 days | Production HTTPS/secure setting is correct | `lib/cookies.ts` | Confirmed code | Review security wording |
| Wardrobe images are stored in S3-compatible AWS storage | Production `STORAGE_PROVIDER` is S3 | `lib/storage.ts`, generated storage, env names | Strong inference | Verify production |
| MongoDB stores application records | Production URI points to MongoDB deployment | `lib/db.ts`, Mongoose models | Confirmed implementation | Verify entity/region |
| OpenAI processes text/images | Relevant features enabled | OpenAI client, analysis/stylist/image modules | Confirmed implementation | Verify contract/settings |
| FASHN may process model and garment images | `TRYON_PROVIDER=fashn` in production | FASHN adapter/capabilities | Confirmed implementation; activation unknown | Verify contract/settings |
| Small accessories may be omitted | Capability mapping is intentionally conservative | `provider-capabilities.ts`, preview UI | Confirmed product rule | Review marketing claim |
| Credits charge after usable success | All paid routes use tested lifecycle | credit engine, Try-On routes/tests | Strong inference | Review consumer wording |
| Apple/RevenueCat IAP exists | Store products configured externally | provider/webhook/models/iOS wrapper | Confirmed implementation; activation unknown | Store review |
| Google Play Billing is absent | No external untracked Android implementation | package/config search | Strong inference | Verify roadmap |
| Account deletion is not complete | No external deletion worker exists | delete-request route returns pending | Confirmed repository fact | Critical |
| Hard wardrobe delete does not prove object deletion | No storage deletion call in route | wardrobe item DELETE, storage helper | Confirmed repository fact | Critical |
| No recurring subscription currently | No subscription model/renewal logic found | credit packs/policies/payment models | Strong inference | Verify business plan |
| No ad/tracking SDK confirmed | Production tags may exist externally | package/config search | Weak inference | Full production audit |
| Support email is `support@myfitpick.com` | Mailbox is monitored | `lib/legal/policies.ts` | Confirmed string; operation unknown | Verify SLA |
| Canadian business context | User supplied jurisdiction | Task instruction | Confirmed instruction | Entity/province unknown |
| Retention is largely undefined | External policies/jobs may exist | model TTL/search and deletion review | Strong inference | Approve schedule |
| User content is not used for training | No code proves either use or prohibition | Repository absence | Unknown | Must verify; do not claim |

## Assumptions Made

No infrastructure consoles, contracts, provider dashboards or production databases were accessed.

## Missing Information Required from MyFitPick

See `missing-information.md`.

## Legal Review Notes

“Confirmed implementation” does not confirm production configuration, contractual status or legal compliance.

## Recommended Updates Before Production Use

Attach dated owner evidence to every Strong/Weak/Unknown entry and re-review on release.

## Codebase Evidence Reviewed

`app/`, `components/`, `lib/`, `models/`, `types/`, `public/`, `ios/`, middleware, Next/Capacitor/package/environment documentation and existing legal pages.

## Document Status

Internal evidence log; update continuously.
