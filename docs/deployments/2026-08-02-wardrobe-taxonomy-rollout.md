# Wardrobe taxonomy rollout — 2026-08-02

## Deployment record

- Previous production candidate: `53331542e38731c5607caff0dc56548faaa4f72e`
- Deployment candidate before this note: `ee1eff972b5e8d11dec54d12c688d1faa9a9cc4f`
- Final deployment candidate: record after committing this document with `git rev-parse HEAD`.
- Production path: `~/Fitpick`
- Process: existing PM2 process named `fitpick`

## Included feature commits

- `5fcc580` — outfit structures and footwear completion
- `9c7edaa` — canonical accessory roles and restrained finishing
- `214374c` — diagnostics, backfill documentation and regression tests
- `d017182` — wardrobe taxonomy review workflow
- `db5d025` — structured styling compatibility metadata
- `8a80ed5` — confirmed metadata in recommendations
- `bc2fdfd` — safe audits and calibration reports
- `e80ef77` — prioritized wardrobe review queue
- `9b113c3` — resumable taxonomy review actions
- `a8a9c4d` — review queue behavioral tests
- `ee1eff9` — optimized review queue image

## Additive schema changes

`WardrobeItem` gains optional/defaulted taxonomy confirmation and conflict fields, styling-compatibility fields, structured footwear attributes, metadata-source tracking and optimistic concurrency. Existing taxonomy fields remain supported. No field removal, collection replacement or mandatory data rewrite is included.

MongoDB may create the new taxonomy-status index through the application's existing Mongoose index behavior. No database write backfill is part of this deployment.

## New route and manual scripts

- Authenticated page: `/wardrobe/review`
- `npm run audit:wardrobe-taxonomy`
- `npm run backfill:accessory-taxonomy`
- `npm run backfill:styling-metadata`
- `npm run analyze:recommendation-diagnostics`
- New focused taxonomy, styling, audit and recommendation tests are included in `npm test`.

The audit, analysis and backfill scripts are manual commands. They are not called by application startup, `npm ci`, tests or the production build. Write mode is not authorized for this rollout.

## Environment requirements

No new environment variable is required. Existing application authentication, MongoDB, storage, upload, recommendation and PM2 configuration remain in use. Secrets and environment values must not be copied into deployment logs or this document.

## Compatibility expectations

- Existing wardrobe records remain readable when new optional fields are absent.
- Legacy category, subcategory and taxonomy fallback behavior remains supported.
- Create Look and Match continue to use the existing routes with shared completion logic.
- Existing upload, authentication and item-detail workflows remain available.
- Old application code ignores newly stored optional fields, permitting a code-only rollback because this rollout performs no write migration.

## Deployment preflight and smoke tests

Stop on any failure. Before deployment, verify a clean production `main` worktree, record its exact commit, confirm PM2 is online, and check Node/npm versions, disk and memory. Create `pre-taxonomy-rollout-2026-08-02` at the recorded production commit without overwriting an existing tag. Back up only existing deployment configuration files outside the repository without printing their contents.

After a fast-forward pull, run `npm ci`, `npm run typecheck`, `npm test`, `npm run lint` and `npm run build` before restarting. After restart, verify PM2 stability, localhost and public HTTP health, authentication, closet loading, uploads entry, item detail, Create Look, Match, profile, queue count, sequential review, Skip, Previous, Not sure, confirmation and refresh behavior. Use only a non-critical test account and do not modify customer records.

Review production logs for casting, validation, concurrency, taxonomy, footwear, accessory, queue, unhandled, type and HTTP 500 errors. Verify separately whether the production collector captures browser-side queue events.

Only after stable smoke tests may the bounded aggregate audit run:

```bash
npm run audit:wardrobe-taxonomy -- --limit=1000 --confirm-production-readonly
```

Only dry-run backfills are permitted:

```bash
npm run backfill:accessory-taxonomy -- --limit=100 --batch-size=25
npm run backfill:styling-metadata -- --limit=100
```

Do not pass `--write`.

## Rollback

Use the exact production commit recorded immediately before deployment:

```bash
cd ~/Fitpick
git reset --hard "$PREVIOUS_COMMIT"
npm ci
npm run build
pm2 restart fitpick --update-env
pm2 save
```

This destructive reset is authorized only on the confirmed clean production worktree during rollback. Do not force-push GitHub, reset a dirty worktree, delete optional fields or run a reverse data migration.

## Migration statement

No write migration, unrestricted production audit, recommendation-threshold change or customer-record modification is part of this deployment.
