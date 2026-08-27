# Apple privacy inventory and App Review checklist

Engineering draft — counsel and App Store Connect owner approval required.

## Privacy-label inventory

| Data | Linked | Tracking | Purpose |
| --- | --- | --- | --- |
| Email address | Yes | No | Authentication and account functionality |
| User content: wardrobe/model photos | Yes | No | Closet, styling and optional AI/try-on functionality |
| Purchases | Yes | No | Credit fulfilment, refunds and fraud/reconciliation |
| Product interaction and diagnostics | Yes | No | App functionality, personalization when enabled, consented analytics |
| Approximate location/weather choice | Yes when saved | No | Weather-aware styling |
| Support messages and attachments | Yes | No | Customer support |

Do not declare cross-app tracking. Session replay is disabled. Uploaded images and form text are blocked from monitoring payloads.

## Review notes

- MyFitPick is a digital closet and outfit-styling app. AI photo processing is optional and requires an explicit, versioned consent.
- A manual Closet-entry path is available without sending photos to an AI provider.
- Consumable Credits in iOS use Apple In-App Purchase through RevenueCat.
- Stripe and crypto providers are removed from the iOS provider response and rejected server-side for iOS requests.
- Account deletion is available in Profile. Local deletion and provider cleanup progress are tracked separately.
- Apple controls refunds for App Store purchases. Users are directed to `reportaproblem.apple.com`; MyFitPick can investigate fulfilment but cannot issue Apple refunds directly.

## Engineering release checklist

- [ ] Add `PrivacyInfo.xcprivacy` to the App target's Copy Bundle Resources and confirm it appears in the archive.
- [ ] Confirm bundle ID, version, signing, icons and launch screen.
- [ ] Reconcile all four consumable product IDs between code, App Store Connect and RevenueCat.
- [ ] Confirm products exactly match: Essential 80/$11.99, Popular 160/$23.99, Pro 320/$47.99, Creator 640/$95.99.
- [ ] Run payment-credit, webhook idempotency, refund and iOS-provider-isolation tests.
- [ ] Verify no web checkout URL, external purchase CTA or crypto network appears in the iOS shell.
- [ ] Verify age confirmation, AI consent, withdrawal, export and account deletion on a physical device.
- [ ] Confirm camera/photo usage descriptions match actual access.
- [ ] Complete App Store privacy labels from the inventory above and obtain legal approval.
