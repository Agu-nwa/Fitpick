# Vendor and Data Processing Register

**Internal register — verify contracts and production activation before publication**

| Provider | Service/purpose | Likely role | Information/categories | Image or AI input access | Payment/account access | Location/transfer | Retention/deletion/contracts | Environment evidence | Verification |
|---|---|---|---|---|---|---|---|---|---|
| Amazon Web Services (S3/CloudFront; EC2 stated operationally) | Object storage, delivery and hosting | Processor | Wardrobe, support, reference, model and generated images; storage keys; request traffic | Images stored/delivered | No payment credential requirement | Region configured but value not documented; possible cross-border | Unknown; verify encryption, lifecycle, backup, deletion, DPA/subprocessors | `S3_BUCKET`, `S3_REGION`, `CLOUDFRONT_PUBLIC_URL` | Implemented; terms/region unknown |
| MongoDB | Primary database | Processor | Account, wardrobe metadata, preferences, recommendations, support, Credits, audit and provider references | Image URLs/keys and AI-derived metadata | Purchase references/status and account data | `MONGODB_URI`; region unknown | Most collection retention unknown; DPA/backups/deletion unknown | `MONGODB_URI` | Implemented; deployment facts unknown |
| OpenAI | Text, vision and image AI | Processor/independent-role legal review | Prompts, wardrobe/reference/model images, metadata, occasion/weather and generated outputs | Yes | No full payment data intended; user/outfit identifiers may be operational inputs | Likely cross-border; entity/region unknown | Training, retention, abuse-monitoring and deletion settings unknown | `OPENAI_API_KEY`, model variables | Implemented; contract/settings unknown |
| FASHN | Virtual Try-On | Processor/role review | Model image, selected garment images, prompt and provider job data | Yes | No payment credentials | Cross-border/region unknown | Retention, training, deletion, DPA and subprocessors unknown | `FASHN_API_KEY`, `TRYON_PROVIDER`, FASHN settings | Configurable implementation; production activation unknown |
| Stripe | Web checkout, webhooks and refunds | Independent controller/processor by activity | Email/account mapping, pack, amount, currency, checkout/payment references; Stripe handles card data | No | Yes | Cross-border possible | Stripe terms/retention apply; DPA/entity/region verify | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Implemented; production status unknown |
| Apple | iOS distribution and In-App Purchase | Independent controller | App account mapping, purchase/product/transaction data, device/store data | App can process user uploads; Apple receipt path does not require image content | Yes | Cross-border possible | Apple terms and refund/retention controls | App Store product IDs; iOS wrapper | Implemented pathway; store configuration unknown |
| RevenueCat | IAP event and entitlement infrastructure | Processor | App user ID, product, transaction, store, environment, amount/currency and event ID | No intended image access | Purchase metadata | Cross-border possible | DPA, retention, deletion and subprocessors unknown | `NEXT_PUBLIC_REVENUECAT_IOS_API_KEY`, `REVENUECAT_WEBHOOK_AUTH_TOKEN` | Implemented; production configuration unknown |
| Resend | OTP and transactional email | Processor | Email, message content and delivery metadata | No intended image access unless later attached | Account email only | Cross-border possible | Retention/DPA/subprocessors unknown | `EMAIL_PROVIDER`, `RESEND_API_KEY`, `EMAIL_FROM` | Implemented; production activation unknown |
| Sentry | Error monitoring | Processor | Error stack, route/device/request context; safe-log design should exclude secrets/images | No intentional raw image input | No intentional payment credentials | Cross-border possible | Scrubbing, retention, region and DPA unknown | Sentry package/configuration | Implemented; production project settings unknown |
| CoinPayments | Optional USDT checkout | Independent controller/processor review | Purchase, invoice, wallet/payment address, transaction hash, asset/network and amount | No | Yes | Cross-border possible | Vendor terms, AML/KYC allocation, retention and region unknown | `COINPAYMENTS_*`, feature flag | Implemented but disabled by default; activation unknown |
| Weather service | Weather-aware recommendations | Role unknown | Saved coordinates/city and weather request context | No | No | Unknown | Provider identity/terms/retention not confirmed in inspected configuration | `lib/weather/*` | Provider identity requires verification |

## Unconfirmed or unsupported providers

Google Play Billing is not confirmed. Redis may be configured for rate limiting or AI caching but the hosting vendor is unknown. No advertising network is confirmed. Support is primarily implemented internally; any external support tenant/webhook integration must be identified by deployment owners.

## Assumptions Made

Imports and environment references show implementation, not necessarily production activation.

## Missing Information Required from MyFitPick

Contracts, DPAs, regions, subprocessors, security terms, retention/deletion assistance, lawful-access processes and current activation.

## Legal Review Notes

Determine controller/processor allocation per activity and contract, not solely this preliminary classification.

## Recommended Updates Before Production Use

Obtain vendor attestations and complete a transfer/security assessment for every active provider.

## Codebase Evidence Reviewed

Environment-name documentation, packages, adapters, models, webhooks, storage, email, Sentry and mobile configuration.

## Document Status

Internal draft register requiring procurement, security and Canadian legal verification.
