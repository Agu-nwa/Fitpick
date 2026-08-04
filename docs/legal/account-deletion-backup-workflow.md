# MyFitPick Account-Deletion Backup Workflow

Last reviewed: August 4, 2026

## Confirmed Application Behaviour

- A minimal `AccountDeletionRequest` tombstone survives ordinary user-content cleanup.
- The tombstone contains an irreversible email hash, deletion reference, status and retained/provider action evidence.
- Ordinary account access cannot resume because the user is disabled and then anonymized.
- A deletion job can retry from recorded object-deletion progress without recreating content or charging Credits.

## Infrastructure Unknowns

- [ENGINEERING VERIFICATION REQUIRED: Confirm whether MongoDB backups or snapshots exist and their retention settings.]
- [ENGINEERING VERIFICATION REQUIRED: Confirm whether S3 versioning is enabled and whether delete operations create delete markers while retaining noncurrent versions.]
- [ENGINEERING VERIFICATION REQUIRED: Confirm AWS backup, replication, lifecycle and object-lock settings.]
- [MYFITPICK INPUT REQUIRED: Confirm approved backup-retention periods for each production system.]

## Restore-and-Redelete Procedure

1. Restore into an isolated recovery environment with outbound user communications, purchases, recommendations and AI jobs disabled.
2. Load deletion tombstones before permitting any account access.
3. For every tombstone, re-disable/anonymize the matching subject and replay the local collection cleanup.
4. Reconcile referenced and user-prefix object keys; preserve shared catalogue assets.
5. Verify retained financial/security records remain minimized and subject to their approved schedules.
6. Record redacted replay results and unresolved provider/manual actions.
7. Permit production traffic only after deletion-replay verification succeeds.

## S3 Versioning Implications

The application issues object deletion for current referenced keys. It does not currently enumerate or permanently remove noncurrent versions. If versioning is enabled, lifecycle rules or a privileged deletion process must age out/delete those versions. Until verified, MyFitPick must not claim immediate erasure from backups or object history.

## Ownership and Evidence

| Control | Proposed owner | Required evidence |
|---|---|---|
| MongoDB backup configuration | Infrastructure | Redacted backup policy/configuration and restore test |
| S3 versioning/lifecycle | Infrastructure | Bucket versioning and lifecycle output |
| Tombstone replay | Engineering/Privacy | Synthetic restore-and-redelete test record |
| Provider backup retention | Privacy/Vendor Management | Contract/DPA or provider documentation |
| Retention approval | Legal/Finance/Privacy | Approved retention schedule |

## Assumptions Made

- The deletion tombstone database is included in disaster recovery. If it is not, an independent immutable tombstone register is required.

## Missing Information Required from MyFitPick

- Production backup providers, locations, schedules, versioning, replication, legal holds and accountable owners.

## Legal Review Notes

[CANADIAN LEGAL REVIEW REQUIRED: Approve backup disclosures, retention language and restoration controls.]

## Recommended Updates Before Production Use

- Automate a deployment/restore gate that replays deletion tombstones before user access.
- Add privileged noncurrent-version reconciliation if S3 versioning is enabled.

## Codebase Evidence Reviewed

- `models/AccountDeletionRequest.ts`
- `lib/account-deletion/account-deletion.ts`
- `lib/storage.ts`

## Document Status

Engineering workflow draft; infrastructure and legal verification pending.
