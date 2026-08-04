# Product Compliance Inventory

| Feature | Page/API | Primary model | Third party | Personal data / AI / payment | Current disclosure | Required update | Launch risk |
|---|---|---|---|---|---|---|---|
| Registration/login | `/login`, `/register`, `/api/auth/*` | `User`, `EmailOtp` | Resend | Email, name, IP/UA; no AI/payment | Legal links exist in auth UI subject to verification | Versioned acceptance, entity/age/privacy notice | High |
| Account/profile/deletion | `/profile`, `/api/users/me/*` | `User`, `PrivacyPreference` | None direct | Profile/location; deletion request | Settings/legal routes | Implement deletion and rights workflow | Critical |
| Wardrobe upload/closet | `/wardrobe/*`, `/api/uploads/*`, `/api/wardrobe/*` | `WardrobeItem`, `WardrobeUpload` | AWS, OpenAI | Images/metadata; AI | Upload/review UI and short privacy/AI pages | Image purpose, retention, provider and deletion notice | High |
| Inspiration Match | `/stylist/match`, reference APIs | `ReferenceFashionItem`, `OutfitRecommendation` | AWS, OpenAI | Image, AI analysis/recommendation | Match UI | Expiry/deletion and third-party AI notice | High |
| Create Look/Stylist | `/stylist/create-look`, `/api/stylist/chat` | `OutfitRecommendation`, `OutfitHistory` | OpenAI | Prompt/profile/history; AI | Stylist UI and AI disclosure | Retention, accuracy and reporting | Medium |
| Recommendations/history | Outfit APIs/pages | `OutfitRecommendation`, `OutfitHistory`, `FashionMemory` | OpenAI for selected operations | Profiling/history; AI-assisted | Completeness and explanation UI | Personalization/automated processing rights | Medium/High |
| Studio Model | `/profile?section=appearance`, avatar APIs | `AvatarProfile`, `StudioModelAsset` | AWS, OpenAI | Appearance/measurements/images; AI | Consent field and model UI | Sensitive-data consent, retention, representation tests | Critical |
| Virtual Try-On | `/outfit/[id]/preview`, avatar-preview API | `AvatarOutfitPreview`, `TryOnGeneration` | FASHN/OpenAI/AWS | Model/garment/generated images; AI; 2 Credits | Approximation/fidelity labels | Provider/retention/deletion and failure policy | High |
| Credit wallet/web checkout | `/wallet`, payment APIs | `CreditPurchase`, `CreditTransaction`, `User` | Stripe, optional CoinPayments | Purchase/ledger; payment | Credits/refund routes | Approved expiry, refunds, tax and closure terms | High |
| iOS purchase | iOS shell, RevenueCat webhook | `CreditPurchase` | Apple, RevenueCat | Transaction/app-user data; payment | Store UI/metadata unverified | App Privacy, IAP, refund and reviewer disclosures | Critical for iOS |
| Support | `/support`, support APIs | `SupportConversation`, `SupportMessage` | AWS, Resend | Messages/attachments | Support UI | Retention, authorized access, reporting/removal | High |
| Notifications/email | notification and OTP APIs | `AppNotification`, `NotificationPreference`, `EmailOtp` | Resend | Email/preferences | Preference UI | CASL separation and retention | Medium |
| Weather location | home/location/weather APIs | `User` | Weather provider unknown | City/coordinates | Location selector | Provider identity, retention and cross-border notice | Medium |
| Diagnostics/security | middleware, audit/Sentry routes | `AuditEvent` | Sentry | IP/UA/errors | Generic privacy wording | Retention, scrubbing, access and incident response | High |
| PWA/iOS shell | manifest, Capacitor | N/A | Apple | Device/web data | Legal routes available | Offline/legal access and store metadata verification | Medium |

## Change-management rule

Any change to a listed feature’s data, provider, model, price, route, retention, sharing or user control must trigger review of the Privacy Policy, Terms, AI Policy, Credits Policy, vendor register, data map, app-store disclosures and this inventory.

## Assumptions Made

Routes and models reflect intended launch features.

## Missing Information Required from MyFitPick

Feature activation by platform, production providers, owners and approved disclosure versions.

## Legal Review Notes

Counsel should map mandatory disclosures to each launch jurisdiction/platform.

## Recommended Updates Before Production Use

Add this inventory to release review and assign an accountable owner per row.

## Codebase Evidence Reviewed

Application routes, models, components, providers, manifest and Capacitor configuration.

## Document Status

Internal living inventory.
