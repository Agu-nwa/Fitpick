# Canadian Privacy Compliance Assessment

**Internal legal-operations draft — August 4, 2026**

## Assessment

| Requirement | Status | Current implementation and evidence | Risk | Recommendation | Priority | Proposed owner |
|---|---|---|---|---|---|---|
| Accountable organization and Privacy Officer | Not implemented | No accountable legal entity or Privacy Officer is identified in code; only `support@myfitpick.com` appears in `lib/legal/policies.ts` | Regulatory and complaint-handling gap | Appoint an officer; publish entity/contact and governance mandate | Critical | Executive/Legal |
| Meaningful consent | Partially compliant | `PrivacyPreference` includes photo storage, personalization, history and marketing flags; `AvatarProfile` has `consentAccepted`; version/source/purpose evidence is incomplete | Consent cannot be demonstrated or withdrawn granularly | Version notices; log purpose, timestamp, source and withdrawal | High | Legal/Product/Engineering |
| Appropriate purposes and minimization | Partially compliant | Feature-specific schemas and ownership checks exist; optional body measurements and images are broad | Sensitive fashion/appearance data may exceed need | Complete necessity assessment and make optional fields clearly optional | High | Privacy/Product |
| Openness and transparency | Partially compliant | Legal pages exist, but current short policies omit provider, deletion and retention realities | Misleading or incomplete notice | Replace only after counsel approves these drafts | High | Legal |
| Access and correction | Partially compliant | Users edit profile, preferences and wardrobe; no complete access/export workflow | Statutory request handling gap | Implement verified access/export/correction process | High | Engineering/Privacy |
| Withdrawal of consent | Not implemented | Preferences exist but end-to-end downstream deletion/cessation is not established | Continued processing after withdrawal | Add workflow and effects matrix | High | Engineering/Privacy |
| Retention and destruction | Not implemented | OTP TTL and some reference cleanup exist; no general schedule; account deletion remains pending | Over-retention and inaccurate public claims | Adopt schedule and deletion orchestration across DB/S3/cache/providers/backups | Critical | Engineering/Security/Legal |
| Safeguards | Not verifiable | Auth, validation, rate limits, safe logs and webhook verification exist; infrastructure encryption/access/backups unknown | Security assurance incomplete | Document controls, test access, incident response and vendor security | High | Security/Engineering |
| Breach/confidentiality incident response | Not implemented | No complete breach register, assessment or regulator/user notification workflow confirmed | PIPEDA/provincial reporting failure | Create incident plan and breach record process | Critical | Security/Privacy |
| Cross-border transparency | Partially compliant | International vendors are implemented; regions/contracts not verified | Quebec/PIPEDA transparency and transfer risk | Verify regions/DPAs and complete transfer PIAs | High | Legal/Security |
| Quebec privacy impact assessment | Not implemented | No PIA artefact confirmed for AI/image systems or transfers outside Quebec | Law 25 exposure | Complete PIAs before Quebec launch/material changes | Critical | Privacy/Legal |
| Automated decision transparency | Partially compliant | UI discloses approximate previews and confidence; notice/rights for decisions under Quebec law not formalized | Insufficient disclosure | Determine whether automated decisions produce legal/significant effects; provide required notice | High | Legal/Product |
| Privacy by default | Partially compliant | Marketing defaults false; personalization/history default true; photo consent default false | Defaults may not reflect sensitivity and consent | Review each default and gate sensitive uploads | Medium | Product/Privacy |
| CASL | Not verifiable | Transactional Resend email is implemented; marketing preference exists; no complete consent/unsubscribe ledger | Marketing compliance risk | Separate transactional/commercial email and implement consent evidence/unsubscribe | High | Marketing/Legal/Engineering |
| Alberta/BC private-sector laws | Legal review required | General controls exist, but organization nexus and detailed practices are unknown | Provincial obligations may apply | Counsel to map operations and user locations | High | Legal |
| Children | Not implemented | No age field or age gate confirmed | Children’s privacy and capacity risk | Set minimum age and implement age assurance proportionate to risk | Critical | Executive/Legal/Product |

## PIPEDA, Alberta PIPA and British Columbia PIPA

The platform has a foundation for safeguards and user correction, but accountability, consent proof, purpose documentation, retention, rights operations and breach response remain incomplete. Applicability depends on business operations and provincial nexus.

## Quebec Law 25

Launch to Quebec should be blocked pending designation of the person in charge, governance policies, confidentiality-incident procedures, PIAs for sensitive AI/image systems and transfers, French-language/legal review where applicable, retention/destruction rules and automated-decision analysis.

## Official references for counsel

- [PIPEDA, Schedule 1 accountability and fair-information principles](https://laws-lois.justice.gc.ca/eng/acts/p-8.6/page-7.html?wbdisable=true)
- [Office of the Privacy Commissioner guidance on mandatory breach reporting and records](https://www.priv.gc.ca/en/privacy-topics/business-privacy/breaches-and-safeguards/privacy-breaches-at-your-business/gd_pb_201810/)
- [Commission d’accès à l’information summary of Quebec Law 25 changes](https://www.cai.gouv.qc.ca/protection-renseignements-personnels/sujets-et-domaines-dinteret/principaux-changements-loi-25)
- [Commission d’accès à l’information privacy impact assessment guide](https://www.cai.gouv.qc.ca/uploads/pdfs/CAI_GU_EFVP.pdf?gt=obligation)

## Assumptions Made

Engineering update (August 4, 2026): the application now has an idempotent deletion request, immediate access disablement, retryable job, referenced-object cleanup, local deletion/anonymization, minimal tombstone, and provider action tracking. The control remains unverified in production and lacks an approved retention schedule, backup replay evidence, and completed third-party actions.

MyFitPick is a Canadian private-sector organization serving consumers and may serve users nationally.

## Missing Information Required from MyFitPick

Entity/province, markets, Privacy Officer, policies, vendor contracts, safeguards, retention, incident plan, marketing practices and age position.

## Legal Review Notes

Statuses are operational assessments, not legal opinions; counsel must determine statutory applicability.

## Recommended Updates Before Production Use

Resolve every Critical finding and obtain counsel sign-off on High findings.

## Codebase Evidence Reviewed

Privacy, user, OTP, audit, account deletion, auth, storage, AI, payment, support and notification implementations.

## Document Status

Internal draft requiring licensed Canadian privacy counsel.
