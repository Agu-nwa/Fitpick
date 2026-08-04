# Google Play Legal Review

**Internal launch assessment — August 4, 2026**

## Current position

The repository confirms a PWA and an iOS Capacitor wrapper. It does not confirm an Android project or Google Play Billing implementation. MyFitPick must not claim Google Play availability or Google-controlled refunds until implemented and verified.

| Topic | Status | Risk and action |
|---|---|---|
| Data Safety form | Not implemented | Inventory account/contact, photos, user content, purchases, location, identifiers and diagnostics; distinguish collection, sharing, optionality, encryption and deletion. |
| Privacy policy | Partially compliant | Public route exists but current policy needs approved factual replacement and stable public URL. |
| Play Billing | Not implemented | Add only if Android distribution begins; consumable Credits must use compliant billing unless an exception applies. |
| External payments | Legal review required | CoinPayments/Stripe links must not appear contrary to Play policy in an Android-distributed app. |
| Account and data deletion | High-risk gap | In-app request marker exists; full deletion and a web deletion resource must be established. |
| AI disclosure | Partially compliant | Approximation copy exists; complete reporting, moderation and safety process. |
| Image/UGC handling | Partially compliant | Upload validation exists; rights, reporting, removal, retention and sensitive-image controls need operational policy. |
| Security practices | Not verifiable | Verify TLS, encryption at rest, account deletion, independent security review and SDK data practices before answering Data Safety. |
| Children/content rating | Not implemented | Set minimum age, target audience and content rating. |
| Advertising/tracking | Not verified | No ad SDK confirmed in repository; production dependency/network audit required. |
| Subscriptions | Not implemented | Do not select subscription disclosures. |

## Launch blockers for a future Android release

- No confirmed Android/Play Billing implementation.
- Account deletion is incomplete.
- Data Safety answers, minimum age and content rating are unresolved.
- Production SDK data practices and external-payment presentation are unverified.

## Official references for review

- [Google Play account deletion requirements](https://support.google.com/googleplay/android-developer/answer/13327111)
- [Google Play Payments policy](https://support.google.com/googleplay/android-developer/answer/9858738)

## Assumptions Made

No Android release is currently ready.

## Missing Information Required from MyFitPick

Android roadmap, target countries/audience, Play developer configuration, billing plan, Data Safety inventory and web deletion URL.

## Legal Review Notes

Verify current Google Play policies before any submission.

## Recommended Updates Before Production Use

Treat Android as a separate compliance launch with billing, deletion, Data Safety and testing gates.

## Codebase Evidence Reviewed

Package dependencies, PWA manifest, Capacitor/iOS configuration, payments, deletion, uploads, AI and legal routes.

## Document Status

Internal draft; not Google approval or legal advice.
