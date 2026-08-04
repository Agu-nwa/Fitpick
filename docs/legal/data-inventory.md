# Personal Information Data Inventory

| Feature | Data/source | Required? / purpose | Storage | Recipients / transfer | Retention/deletion | AI/training | Sensitivity | Evidence |
|---|---|---|---|---|---|---|---|---|
| Account/auth | Name, email, hashed password if used, OTP hash, IP, user agent, session/login data; user/device | Required for account/security | MongoDB, cookie, logs | Resend; Sentry possible; cross-border possible | Cookie 30 days; OTP TTL; account/audit unknown; account request pending | No intended AI; training N/A | Medium | `User`, `EmailOtp`, auth routes/libs |
| Profile/location | Locale/timezone, selected city/country/coordinates; user | Optional personalization/weather | MongoDB | Weather vendor unknown | Until changed/account process; undefined | Recommendation input; training unknown | Medium | `User`, location/weather routes |
| Wardrobe | Garment photos/details, labels, fit/size/brand/care; user and inference | Required/optional by upload slot; closet and recommendations | S3/CloudFront, MongoDB, local draft | AWS; OpenAI for analysis | Archive/hard DB delete; S3 deletion not coupled; unknown | AI input/output; provider training unknown | High | Wardrobe models/routes/storage/AI |
| Inspiration Match | Reference image, analysis, category/colour/occasion; user/inferred | Optional; match outfits | S3, MongoDB | AWS/OpenAI | Expiry and cleanup fields; execution unknown | AI input/output; training unknown | High | `ReferenceFashionItem`, reference AI/routes |
| Studio Model | Gender/body/skin/hair/measurements/model images; user/generated | Optional but required for configured model/try-on | MongoDB, S3 | AWS/OpenAI and Try-On provider where used | Undefined | AI input/output; training unknown | High | `AvatarProfile`, Studio Model/avatar modules |
| Recommendations | Wardrobe IDs, occasion/weather, preferences, scores/history/feedback | Required for feature | MongoDB | OpenAI for some text/visuals | Undefined | Automated profiling/personalization; training unknown | Medium | recommendation/outfit/history models/modules |
| Stylist | Prompt, response, wardrobe context and reference item | Optional; styling assistance | Recommendation/history records; provider | OpenAI | Undefined | AI input/output; training unknown | Medium/High if prompt contains sensitive data | stylist routes/modules |
| Generated previews | Model/garment inputs, generated image, fidelity/errors | Optional paid/free feature | S3, MongoDB | OpenAI/FASHN/custom | Undefined; delete helper exists but full user workflow absent | AI input/output; training unknown | High | Try-On/avatar/outfit preview modules/models |
| Credits/payments | Balance, pack, amount/currency, provider refs/status/refund/dispute | Required for purchase/paid actions | MongoDB; provider systems | Stripe, Apple/RevenueCat, optional CoinPayments | Accounting/legal schedule unknown | No intended AI | Medium/High | credit/payment modules/models/webhooks |
| Support | Messages, attachments, read/status/agent data | Optional support | MongoDB, S3 | Resend; support integrations if activated | Undefined; no user-delete flow confirmed | No intended AI unless added | High | support models/routes |
| Notifications | Preference, title/body, read status and transactional email | Optional/operational | MongoDB; email provider | Resend | Undefined | No intended AI | Low/Medium | notification models/modules |
| Security/diagnostics | IP, user agent, action/entity, errors, provider status | Operational/security | MongoDB/logs/Sentry | Sentry | Undefined | No intended model training | Medium | `AuditEvent`, safe logs, Sentry |
| Device draft/recovery | Upload draft fields and recovery flag; device | Optional UX | local/session storage | None unless submitted | Until cleared/browser policy | No | Low/Medium | wardrobe client, client recovery |

## Assumptions Made

Images are personal information when linked to an account; exact vendor activation varies by environment.

## Missing Information Required from MyFitPick

Retention schedule, data classification owner, required/optional UX confirmation, all production recipients, training settings and deletion SLAs.

## Legal Review Notes

Assess sensitive/biometric characterization and legal bases by province and user context.

## Recommended Updates Before Production Use

Convert this inventory into a maintained record of processing with store, owner, retention and deletion controls.

## Codebase Evidence Reviewed

Models, routes, components, storage, AI, payments, support, session and mobile code.

## Document Status

Internal factual inventory; legal and infrastructure verification required.
