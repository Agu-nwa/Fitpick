# Apple App Store Legal Review

**Internal launch assessment — August 4, 2026**

## Confirmed implementation

- Capacitor iOS wrapper `com.myfitpick.app` loads `https://myfitpick.com` over HTTPS.
- Consumable Credit product identifiers and RevenueCat webhook processing exist.
- RevenueCat/Apple transaction identifiers are deduplicated.
- Privacy, Terms, AI and refund routes exist on the web product.
- In-app account-deletion request is implemented.
- AI image uploads, generated content and support are material review topics.

## Review matrix

| Topic | Status | Risk and action |
|---|---|---|
| App Privacy labels | Not verifiable | Map account, contact, photos, user content, purchases, identifiers, diagnostics and approximate location to Apple definitions; verify tracking is “No” only after SDK/network review. |
| Privacy-policy access | Partially compliant | Public route exists; ensure App Store Connect URL and in-app pre-account/settings access. |
| Account deletion | High-risk gap | Current endpoint only records a pending request. Apple expects initiation in-app and effective deletion, subject to lawful retention. Implement and test full workflow. |
| Sign in with Apple | Not applicable/not confirmed | Only email/password/OTP evidence found. Reassess if any third-party/social login is added. |
| In-App Purchase | Partially compliant | Consumable products and RevenueCat exist; verify App Store Connect products, receipts, webhook signing, sandbox/reviewer flow and no prohibited external purchase CTA in iOS. |
| Restore purchases | Legal/product review | Consumables generally are not restorable like non-consumables; transaction reconciliation must still prevent lost fulfilment. Explain behaviour accurately. |
| Subscriptions | Not implemented | Do not describe subscriptions or auto-renewal. |
| AI-generated content | Partially compliant | Disclosures exist; add reporting/moderation escalation and reviewer explanation. |
| User-generated content | High-risk gap | Uploads/support exist; blocking/reporting/removal processes are not complete for a social UGC standard. Confirm whether content is ever shared with other users. |
| Children/content rating | Not implemented | Establish age rating, minimum age and moderation position. |
| Reviewer access | Missing | Provide demo account/OTP instructions, IAP sandbox path, AI provider availability and model setup steps. |
| Support contact | Confirmed | `support@myfitpick.com`; verify monitored SLA and App Store metadata. |

## Likely launch blockers

1. Account deletion is a request marker, not a completed deletion workflow.
2. App Privacy answers cannot be finalized without production SDK/vendor/region inventory.
3. Minimum age and content-rating decisions are absent.
4. IAP sandbox, reviewer credentials and external-payment restrictions need end-to-end verification.
5. Reporting/moderation operations need definition for problematic uploads and outputs.

## Official references for review

- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Apple guidance on offering account deletion in an app](https://developer.apple.com/support/offering-account-deletion-in-your-app)

## Assumptions Made

The Capacitor wrapper and RevenueCat path are the intended iOS release.

## Missing Information Required from MyFitPick

App Store Connect configuration, privacy labels, reviewer account, production SDK list, age rating, IAP availability and moderation SLA.

## Legal Review Notes

Apple policies change; verify current requirements immediately before submission.

## Recommended Updates Before Production Use

Complete deletion, IAP sandbox review, privacy labels and reviewer notes; remove or gate external checkout in iOS where required.

## Codebase Evidence Reviewed

`capacitor.config.ts`, iOS configuration, payment packs/providers/webhook, legal routes, account deletion and support features.

## Document Status

Internal draft; not Apple approval or legal advice.
