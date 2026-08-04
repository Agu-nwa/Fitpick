# MyFitPick Account-Deletion Data Inventory

Last reviewed: August 4, 2026

This engineering inventory describes deletion behavior implemented in the repository. It is not a legally approved retention schedule.

| Data class | Model/service and link | Action | Provider | Retention constraint | Status/evidence |
|---|---|---|---|---|---|
| Account and session | `User._id`, `activeSessionId` | Immediately disable session; after cleanup anonymize name, email, profile/location and credentials while retaining the non-personal internal subject record | MongoDB | Financial/security references may require a stable non-public subject | Implemented in `lib/account-deletion/account-deletion.ts` |
| OTP | `EmailOtp.email` from deletion snapshot | Delete | MongoDB | None identified | Implemented |
| Privacy, notification, style and profile settings | `userId` | Delete | MongoDB | None identified | Implemented |
| Avatar/Studio Model profile | `AvatarProfile.userId` | Delete user profile; never delete shared `StudioModelAsset` catalogue records | MongoDB/S3 | Shared catalogue assets are not user-owned | Implemented distinction |
| Wardrobe items/uploads | `userId`; nested `storageKey` fields | Delete records and referenced owned objects | MongoDB/S3 | Unreferenced/abandoned objects need prefix-list verification | Implemented for referenced objects |
| Generated garment assets | `GarmentAsset.userId`, `storageKey` | Delete | MongoDB/S3 | None identified | Implemented |
| Recommendations, outfits, history and feedback | `userId` | Delete | MongoDB | None identified | Implemented |
| Recommendation/try-on preview records and output | `userId`, `storageKey` | Delete | MongoDB/S3 | Provider-side retention remains unverified | Implemented locally |
| Reference-fashion uploads | `userId`, `storageKey` | Delete | MongoDB/S3 | None identified | Implemented |
| Background jobs | `userId` | Immediately cancel active non-deletion jobs; historical jobs are removed by cleanup except the deletion job required for audit/retry | MongoDB | Deletion job/tombstone retained minimally | Partially implemented; deletion job remains |
| Fashion memory and compatibility graph | `userId` | Delete | MongoDB | De-identified aggregate analytics may remain only if no longer identifiable | Implemented for application records |
| Notifications and daily usage | `userId` | Delete | MongoDB | None identified | Implemented |
| Support conversation/messages/attachments | conversation `userId`; message `conversationId`; attachment `key` | Delete conversation graph and referenced user-owned attachments | MongoDB/S3 | External support copies require separate verification | Implemented locally |
| External support customer | `email` | Replace email/name with deletion reference | MongoDB | Related external-provider retention unknown | Implemented local anonymization |
| Credit ledger and purchases | `userId` | Retain with anonymized account subject; remove unrelated profile data | MongoDB/Stripe/RevenueCat/Apple | [MYFITPICK INPUT REQUIRED: Approve finance/tax/chargeback retention periods.] | Retained deliberately; provider review manual |
| Audit/security events | `userId` | Retain against anonymized subject pending approved schedule | MongoDB/Sentry | [CANADIAN LEGAL REVIEW REQUIRED: Approve necessity and duration.] | Retained deliberately |
| Payment webhook deduplication | provider transaction references | Retain as necessary to prevent duplicate fulfilment/refunds | MongoDB/payment providers | Finance/legal decision required | Retained deliberately |
| Provider prompts/content | provider request identifiers where available | No fictional deletion call; track manual/contract review | OpenAI/FASHN | Provider terms and retention not verified here | Manual pending |
| Email delivery | email/provider events | Application has no per-message deletion adapter | Resend | Contract/provider retention unknown | Manual pending |
| Backups/noncurrent versions | deletion reference/tombstone | Replay deletion after restore; age out under approved schedule | MongoDB/AWS | Schedule and S3 versioning unknown | Workflow documented, infrastructure verification pending |

## Deletion-State Evidence

`AccountDeletionRequest` stores the state, deletion reference, retry job, object progress, retained classes and provider actions. It intentionally removes the temporary subject email and object-key snapshot after completion. Ordinary API access is rejected when `User.deletionStatus` is not `active`.

## Assumptions Made

- MongoDB collection naming follows the Mongoose collection names confirmed by the current models.
- Referenced object keys are the authoritative local inventory until production prefix listing is available.

## Missing Information Required from MyFitPick

- Approved retention periods, S3 versioning configuration, database backup configuration, provider contracts and the owner of manual deletion actions.

## Legal Review Notes

[CANADIAN LEGAL REVIEW REQUIRED: Approve every retained class, purpose, duration, user notice and deletion-completion representation.]

## Recommended Updates Before Production Use

- Run a controlled production-like deletion against a synthetic account and preserve redacted evidence for every stage.
- Add periodic escalation for manual provider actions and abandoned-object prefix reconciliation.

## Codebase Evidence Reviewed

- `models/AccountDeletionRequest.ts`
- `lib/account-deletion/account-deletion.ts`
- `app/api/users/me/delete-request/route.ts`
- `lib/auth.ts`
- `models/*.ts`

## Document Status

Engineering draft; not legally approved.
