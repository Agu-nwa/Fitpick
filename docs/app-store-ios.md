# MyFitPick iOS App Store Wrapper

MyFitPick's fastest App Store path is a Capacitor iOS wrapper around the production web app at `https://myfitpick.com`.

## Product mode

The iOS build uses standard App Store credit purchases:

- users can sign in;
- users can use their closet;
- users can use available Credits;
- users can create looks, match outfits, and run try-on when they already have Credits;
- credit purchases inside the iOS wrapper use Apple In-App Purchase through RevenueCat;
- credit purchases on the website continue to use Stripe.

The iOS wrapper must not direct users to the website to avoid Apple payment rules.

## App Store Connect products

Create consumable in-app purchases with these product IDs:

| Pack | Product ID | Credits |
| --- | --- | ---: |
| Starter | `myfitpick_credits_starter` | 50 |
| Popular | `myfitpick_credits_popular` | 150 |
| Pro | `myfitpick_credits_pro` | 400 |
| Creator | `myfitpick_credits_creator` | 1000 |

Configure the same products in RevenueCat.

## Required environment variables

```bash
NEXT_PUBLIC_REVENUECAT_IOS_API_KEY=
REVENUECAT_WEBHOOK_AUTH_TOKEN=
```

RevenueCat must send purchase webhooks to:

```text
https://myfitpick.com/api/webhooks/revenuecat
```

Use the same `REVENUECAT_WEBHOOK_AUTH_TOKEN` value as the webhook Authorization token.

## Commands

```bash
npm install
npm run build
npm run ios:add
npm run ios:sync
npm run ios:open
```

Use Xcode to set signing, bundle version, screenshots, privacy nutrition labels, and upload to TestFlight/App Store Connect.

## Bundle

- App name: MyFitPick
- Bundle id: `com.myfitpick.app`
- Remote app URL: `https://myfitpick.com`
- User agent suffix: `MyFitPickIOS/1.0 AppStoreShell`

## Required App Store checks

- Login works.
- New account flow works.
- Closet upload uses iOS photo permissions.
- Stylist and try-on flows work with existing Credits.
- Credit purchase controls inside the iOS wrapper open Apple purchase sheets.
- RevenueCat webhooks grant Credits after App Store confirmation.
- Delete account is available.
- Privacy Policy, Terms, Credits Policy, Refund Policy, and AI Try-On Disclosure are accessible.
- Support is accessible.

## Monetization

Website Stripe checkout remains active on `https://myfitpick.com`. Inside the iOS app, Credits must be purchased with Apple In-App Purchase.
