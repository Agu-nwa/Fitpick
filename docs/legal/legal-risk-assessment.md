# MyFitPick Legal Risk Assessment

**Internal privileged-work-product candidate — confirm handling with counsel**

| Severity | Risk / affected feature | Likelihood | Impact | Current control | Gap and mitigation | Owner | Launch blocker |
|---|---|---|---|---|---|---|---|
| Critical | Account deletion lifecycle lacks production/provider/backup verification | High | High | Explicit confirmation, immediate access disablement, retryable job, referenced S3 cleanup, local deletion/anonymization, provider action register, tombstone | Exercise production-safe deletion test; complete manual provider actions; approve retention and backup replay | Engineering/Privacy | Yes |
| Critical | No accountable entity/Privacy Officer/age rule | High | High | Support email only | Decide, appoint, publish and operationalize | Executive/Legal | Yes |
| Critical | Quebec Law 25 governance/PIAs not evidenced | Medium | High | Some consent fields and security controls | Complete PIAs, incident governance, officer and policies | Legal/Privacy | Quebec launch |
| Critical | Breach response and breach register absent | Medium | High | Sentry/audit/safe logs | Implement detection, assessment, records and notification plan | Security/Privacy | Yes |
| High | Sensitive appearance/image consent is not demonstrably versioned | High | High | `consentAccepted`, `photoStorageConsent` fields | Purpose-specific versioned consent and withdrawal effects | Product/Legal | Yes |
| High | Object-storage images may survive DB record deletion | High | High | Delete helpers and scoped keys exist | Orchestrate storage deletion and verify orphan cleanup | Engineering | Yes |
| High | Provider training/retention/region unknown | Medium | High | Vendor-specific adapters | Contract/DPA/settings verification and notice | Legal/Security | Yes |
| High | AI/Virtual Try-On representation and bias | Medium | High | Approximation copy, fidelity metadata, selectable tones/hair | Representative test programme, reporting, QA and claims review | AI/Product/Legal | Yes |
| High | UGC rights/moderation/reporting incomplete | Medium | High | Validation, content rules, provider moderation, support | Formal notice/report/removal/escalation and illegal-content process | Trust & Safety | Yes |
| High | App-store privacy/deletion/IAP disclosures incomplete | High | High | iOS wrapper, RevenueCat, legal routes | Complete deletion, privacy labels, sandbox/reviewer and external-payment review | Mobile/Legal | iOS launch |
| High | Credit/refund/expiry/account-closure rules unresolved | High | Medium | Idempotent ledger, reserve/commit/release, provider refunds | Approve consumer policy and channel-specific workflows | Finance/Legal | Yes |
| High | Retention is generally undefined | High | High | OTP TTL/reference cleanup fields | Record schedule, lifecycle jobs, holds and backup deletion | Privacy/Engineering | Yes |
| High | Security controls not fully verifiable | Medium | High | Auth, ownership, rate limits, validation, webhooks, safe logs | Infrastructure control evidence, testing, incident/vendor programme | Security | Yes |
| High | Consumer legal terms incomplete | High | Medium | Existing short terms | Counsel-approved entity, governing law, mandatory rights and remedies | Legal | Yes |
| Medium | Recommendation may be unsuitable or incomplete | Medium | Medium | Hard guards, completeness/fallback, evaluation suite | Continue taxonomy audits, monitoring and clear non-reliance | AI/Product | No |
| Medium | IP infringement in uploads/outputs | Medium | Medium | Acceptable-use copy, analysis conservatism | Takedown process, rights attestations, output complaints | Legal/Trust | No |
| Medium | CASL consent evidence incomplete | Medium | Medium | Marketing default false; transactional email | Separate purposes, consent ledger and unsubscribe | Marketing/Legal | Before marketing |
| Medium | Exact vendor list changes over time | Medium | Medium | Environment-specific adapters | Change-management trigger for privacy/legal register | Engineering/Privacy | No |
| Low | PWA device storage contains draft data | Medium | Low | Local only; user can clear browser | Disclose, minimize and expire draft state | Product | No |

## Assumptions Made

No production contracts or infrastructure console evidence was reviewed.

## Missing Information Required from MyFitPick

Business decisions and evidence listed in `missing-information.md`.

## Legal Review Notes

Counsel should validate privilege, statutory applicability and launch-blocker classification.

## Recommended Updates Before Production Use

Resolve Critical and launch-blocking High risks; document risk acceptance for the remainder.

## Codebase Evidence Reviewed

Entire feature/provider surface sampled through targeted searches and core models/routes.

## Document Status

Internal preliminary risk assessment; not legal advice.
