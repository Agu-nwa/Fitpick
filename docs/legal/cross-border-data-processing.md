# MyFitPick Cross-Border Data Processing Statement

**Draft for Canadian legal review — not yet approved for publication**

## 1. Why Processing May Occur Outside Canada

MyFitPick depends on cloud storage and delivery, database, AI, Virtual Try-On, payment, app-store, email and error-monitoring services. These providers or their subprocessors may operate outside Canada so that MyFitPick can authenticate users, store images, generate results, process purchases, deliver communications and protect reliability.

## 2. Information Involved

Depending on the feature, transferred information may include account identifiers and email; IP and device information; wardrobe, label, inspiration, support or model images; wardrobe metadata; prompts and generated content; payment references and purchase status; support messages; and technical error information. Full payment credentials are handled by payment or app-store providers rather than being shown as stored by MyFitPick.

## 3. Current Provider Categories

Repository evidence supports Amazon Web Services, MongoDB, OpenAI, FASHN, Stripe, RevenueCat/Apple, Resend and Sentry integrations. CoinPayments is optionally implemented. Provider regions, contractual entities and subprocessor locations require verification.

## 4. Safeguards

Implemented technical measures include HTTPS-oriented configuration, HTTP-only session cookies, provider webhook verification, access/ownership controls, rate limiting, hashed OTPs, safe logging and scoped storage keys. MyFitPick should also maintain written data-processing agreements, least-privilege access, encryption commitments, vendor assessments, incident notice clauses, deletion assistance and subprocessor controls.

[ENGINEERING VERIFICATION REQUIRED: Confirm production TLS termination, encryption at rest, key management, backup regions and administrative access controls.]

## 5. Foreign Lawful Access

Information processed in another jurisdiction may be subject to that jurisdiction’s laws and lawful demands by courts, governments or law-enforcement bodies. Canadian law does not prevent all foreign access. MyFitPick should assess these risks and provide additional safeguards where appropriate.

## 6. Accountability and Questions

MyFitPick remains accountable as required by applicable Canadian privacy law. Users may contact `support@myfitpick.com` to ask about service providers or processing outside Canada.

[MYFITPICK INPUT REQUIRED: Appoint and publish the Privacy Officer and contact method.]

## 7. Changes

Providers may change. Material changes to purpose, sensitivity or jurisdiction should trigger vendor diligence, a privacy impact assessment where required, and an updated notice.

## Assumptions Made

Deletion implementation note: local and referenced S3 content cleanup is automated; Stripe, RevenueCat/Apple, OpenAI/FASHN, Sentry, and Resend review actions are tracked as manual pending until supported deletion behavior and contracts are verified. No fictional provider deletion API is claimed.

International providers may process data outside Canada; exact regions are unknown.

## Missing Information Required from MyFitPick

Contracting entities, regions, subprocessors, DPAs, transfer assessments, encryption and lawful-request policies.

## Legal Review Notes

Review transparency and assessment obligations under PIPEDA, provincial private-sector laws and Quebec Law 25.

## Recommended Updates Before Production Use

Complete vendor/region verification and Quebec privacy impact assessments before transfers involving Quebec residents.

## Codebase Evidence Reviewed

Environment-name documentation, provider adapters, storage/database/email/payment/Sentry configuration and mobile wrapper.

## Document Status

Draft for licensed Canadian legal review; not approved legal advice.
