# Missing Information Register

| ID | Missing information / why it matters | Affected documents | Risk | Owner to answer | Recommended decision / temporary placeholder | Launch blocker |
|---|---|---|---|---|---|---|
| M01 | Legal entity name, registration and address identify accountable provider | All public policies | Critical | Founder/Legal | `[MYFITPICK INPUT REQUIRED: Insert legal entity and address.]` | Yes |
| M02 | Privacy Officer identity/contact is required for accountability and complaints | Privacy/compliance/checklist | Critical | Executive/Legal | Appoint and publish | Yes |
| M03 | Governing province, venue and markets determine terms/privacy obligations | Terms/compliance | High | Legal/Executive | Counsel-approved jurisdiction clause | Yes |
| M04 | Minimum age and parental-consent position | Privacy/Terms/store reviews | Critical | Legal/Product | Set and enforce before launch | Yes |
| M05 | Record-by-record retention, legal holds and backup deletion | Privacy/data inventory/data flow | Critical | Privacy/Security | Approve schedule and implement controls | Yes |
| M06 | End-to-end account/S3/cache/provider/log/backup deletion SLA | Privacy/store reviews/risk | Critical | Engineering/Privacy | Build orchestration and evidence | Yes |
| M07 | Data export, access, correction and withdrawal process | Privacy/compliance | High | Privacy/Engineering | Verified request workflow and SLA | Yes |
| M08 | Active vendor entities, regions and subprocessors | Privacy/cross-border/vendor | High | Procurement/Security | Verify each production environment | Yes |
| M09 | AI/FASHN/OpenAI retention and training settings | Privacy/AI/vendor | High | Legal/AI | Contract and account-setting confirmation | Yes |
| M10 | Encryption at rest, backup controls, production access and key management | Privacy/cross-border/risk | High | Security | Document/test controls | Yes |
| M11 | Incident/breach response, register, notification and owner | Compliance/risk/checklist | Critical | Security/Privacy | Implement approved plan | Yes |
| M12 | Credit expiry, closure, promotions and unused-balance treatment | Terms/Credits | High | Finance/Legal | Consumer-law review and explicit rule | Yes |
| M13 | Refund discretion, billing dispute SLA and tax/invoice position | Credits/Terms | High | Finance/Legal | Channel-specific approved process | Yes |
| M14 | Production CoinPayments status and AML/KYC allocation | Credits/vendor/risk | High | Finance/Legal | Keep disabled until verified | If enabled |
| M15 | Production cookie/analytics/tag/support SDK inventory | Privacy/cookie/store forms | High | Engineering/Marketing | Network and dependency audit; consent decision | Yes |
| M16 | CASL marketing consent, unsubscribe and evidence | Privacy/compliance | High | Marketing/Legal | Separate transactional and commercial messages | Before marketing |
| M17 | Trust/safety reporting, blocking, takedown, illegal-content and appeal | AI/Terms/store/risk | High | Trust & Safety/Legal | Operational policy and tooling | Yes |
| M18 | Representation/bias QA thresholds and ownership | AI/responsible AI/risk | High | AI/Product | Recurring test matrix and release gate | Yes |
| M19 | App Store Connect products, App Privacy, reviewer account and IAP sandbox proof | Apple review | Critical | Mobile/Product | Complete before submission | iOS |
| M20 | Android/Google Play roadmap, billing and Data Safety | Google review | High | Mobile/Product | Treat as separate launch | Android |
| M21 | Weather provider identity, region and retention | Privacy/vendor/data map | Medium | Engineering | Identify and contract-review | Yes if active |
| M22 | Support-record retention/access and attachment deletion | Privacy/support/risk | High | Support/Privacy | Define policy and deletion effects | Yes |
| M23 | Output and User Content licence/training/product-improvement scope | Terms/AI | High | Legal/Product | Narrow purpose-based licence and consent | Yes |
| M24 | Consumer liability, indemnity, governing law and dispute language | Terms | High | Canadian counsel | Draft after entity/markets/insurance confirmed | Yes |
| M25 | French-language and Quebec consumer/legal publication requirements | All public policies | High | Quebec counsel | Assess before Quebec launch | Quebec |

## Assumptions Made

No unresolved fact above is treated as confirmed elsewhere in this package.

## Missing Information Required from MyFitPick

Every row requires an accountable written response and evidence.

## Legal Review Notes

Counsel should decide which blockers apply to the exact launch scope.

## Recommended Updates Before Production Use

Track resolution in the launch checklist and update all affected drafts consistently.

## Codebase Evidence Reviewed

Full targeted legal/product/provider audit described in `assumptions-and-evidence.md`.

## Document Status

Open internal register.
