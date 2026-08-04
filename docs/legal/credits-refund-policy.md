# MyFitPick Credits and Refund Policy

**Draft for Canadian legal review — not yet approved for publication**

## 1. Credits

Credits are consumable units used for selected MyFitPick features. New accounts currently receive 20 complimentary Credits. Credits are not currency, a bank balance or a stored-value deposit and are not transferable unless required by law.

## 2. Current Feature Costs

Current code lists Virtual Try-On and Try-On regeneration at two Credits per usable successful result. AI stylist chat and premium outfit preview currently have a zero-Credit cost. The amount displayed in the Service when a request is made controls, subject to applicable law.

## 3. Current Packs

Repository-configured packs are 80 Credits for USD 11.99, 160 for USD 23.99, 320 for USD 47.99 and 640 for USD 95.99. Prices, taxes and app-store local pricing may differ and the checkout display controls.

## 4. Charging and Failure Handling

MyFitPick validates and may reserve Credits before a paid generation. A reservation is committed after a usable result succeeds. Idempotency references reduce duplicate charges. A provider failure, unusable or empty result, persistence failure or cancelled workflow should release the reservation or avoid spending Credits. Internal restoration may correct a Credit ledger and is not a monetary refund.

An otherwise usable core preview is not automatically failed because a provider omits an unsupported watch, bag, jewellery item or similar accessory.

## 5. Purchase Channels

- **Stripe:** MyFitPick can initiate eligible merchant refunds. Card data is processed by Stripe.
- **Apple/RevenueCat:** Apple controls payment and monetary refund decisions for Apple In-App Purchases. RevenueCat supplies purchase-event infrastructure.
- **Google Play:** Billing is not confirmed as implemented. If enabled, Google’s billing and refund rules must be added before sale.
- **CoinPayments:** USDT checkout is implemented behind a feature flag and must not be described as available unless production configuration and legal review confirm it.

## 6. Refund Requests

Contact `support@myfitpick.com` for Stripe billing disputes or internal Credit discrepancies. Apple users should use Apple’s refund process. Store and statutory rights remain unaffected. MyFitPick should not promise a refund outcome before reviewing transaction status and applicable law.

## 7. Duplicate, Disputed and Reversed Payments

Provider references and transaction indexes are designed to prevent duplicate fulfilment. Chargebacks, disputes, underpayment, overpayment, fraud or reversal may place a purchase under review and may reverse associated Credits to the extent lawful and not already consumed, without producing a negative balance unless an approved policy permits it.

## 8. Expiration, Closure and Promotions

[MYFITPICK INPUT REQUIRED: Decide whether purchased and complimentary Credits expire, how advance notice works, what happens on voluntary or enforced account closure, and whether unused purchased Credits are refundable where required.]

Promotional Credits may have separate disclosed conditions. No general Credit-expiration rule is confirmed in code.

## 9. Taxes and Currency

Packs are configured in USD. Applicable taxes, currency conversion and store pricing are shown by the payment provider. [MYFITPICK INPUT REQUIRED: Confirm merchant tax registration, invoicing and supported countries/currencies.]

## Assumptions Made

Current code prices and providers represent the intended launch configuration.

## Missing Information Required from MyFitPick

Expiration, closure, promotional conditions, refund discretion, tax treatment, supported markets and production CoinPayments status.

## Legal Review Notes

Review provincial gift-card/stored-value, consumer, prepaid purchase, app-store and chargeback requirements.

## Recommended Updates Before Production Use

Display exact cost before generation and channel-specific refund instructions at checkout and in purchase history.

## Codebase Evidence Reviewed

Credit costs/engine/wallet, purchase and transaction models, packs, fulfilment/refund modules, Stripe, RevenueCat and CoinPayments routes.

## Document Status

Draft for licensed Canadian legal review; not approved legal advice.
