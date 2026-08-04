# Legal Pages Implementation Plan

This plan does not authorize product changes. Implement only after licensed Canadian counsel approves final wording and versions.

## Existing surfaces

MyFitPick already exposes `/legal`, `/legal/privacy`, `/legal/terms`, cookie, acceptable-use, AI/Virtual Try-On, Credits, refund and copyright routes backed by `lib/legal/policies.ts`. Legal links should be checked in the legal chrome, auth/register screens, profile/settings, wallet/checkout and mobile shell.

## Recommended route mapping

| Approved document | Recommended public route |
|---|---|
| Privacy Policy | `/legal/privacy` |
| Terms of Service | `/legal/terms` |
| AI and Virtual Try-On Policy | `/legal/ai-virtual-try-on-disclosure` |
| Credits and Refund Policy | Consolidate or cross-link `/legal/subscription-and-credits-policy` and `/legal/refund-policy` |
| Cross-Border Statement | Section of Privacy plus optional `/legal/cross-border-processing` |
| Responsible AI statement | Link from AI disclosure or optional transparency route |

Internal assessments/registers must not be published as consumer policies without review.

## Placement

1. Persistent website footer and legal index.
2. Login/register before account creation, with links accessible without authentication.
3. Versioned affirmative acceptance during registration for Terms/Privacy; separate meaningful consent for sensitive optional processing.
4. Wardrobe/reference/model uploads immediately before collection, with concise purpose/provider/retention notice.
5. Wallet and each checkout before purchase, with exact price, Credits, consumption, expiry and refund channel.
6. Profile/settings with privacy choices, access/export, deletion status and support.
7. Virtual Try-On immediately before first paid generation and beside preview fidelity copy.
8. iOS/PWA navigation with safe-area-accessible links and an external-browser fallback.

## Version and acceptance records

Create immutable policy versions with identifier, effective date, locale, content hash and superseded version. Record user ID, policy/version, action, timestamp, source surface and necessary request evidence. Record withdrawal separately without erasing historical proof needed by law.

## Account deletion

Replace the pending marker with a state machine: requested → identity verified → hold checked → active deletion → provider/object cleanup → completed/exception. Show status and lawful exceptions. Add a public web deletion-request route suitable for app stores.

## Rollout sequence

1. Counsel resolves placeholders and approves documents.
2. Engineering maps approved content to `lib/legal/policies.ts` or a versioned content source.
3. Add acceptance/consent schema and APIs.
4. Implement deletion and rights workflows.
5. Add contextual notices and purchase disclosures.
6. Test unauthenticated, authenticated, PWA and iOS access.
7. Complete App Store/Google forms from the verified inventory.
8. Archive approvals and deploy through normal change control.

## Assumptions Made

Existing route names should be preserved where practical.

## Missing Information Required from MyFitPick

Approved text, policy owner, versions/effective date, locale plan, consent decisions and deletion SLA.

## Legal Review Notes

Counsel must approve publication/acceptance design and whether renewed consent is required.

## Recommended Updates Before Production Use

Implement this plan as a separately reviewed product phase; do not paste internal assessments into public pages.

## Codebase Evidence Reviewed

Existing legal routes/policies/chrome, auth/profile/wallet/upload/Try-On UI, models and mobile configuration.

## Document Status

Proposed implementation plan; no product code changed.
