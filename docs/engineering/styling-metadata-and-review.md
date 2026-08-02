# Styling metadata and taxonomy review

## Status and precedence

`confirmed` means a user has verified the canonical identity. `inferred` is a structured AI or migration suggestion, `needs_review` is a usable suggestion requiring confirmation, and `unresolved` means the available evidence is ambiguous. User confirmation always wins; AI and migrations cannot overwrite it. Evidence, confidence, source and confirmation time remain separate.

## Review workflow

Closet **Needs review** and the item detail page surface a focused human question with readable choices and **Not sure**. A confirmed answer writes canonical subtype and roles together. Only one or two additional questions appear when the answer affects styling.

## Optional metadata

Relevant items may store neckline, accessory scale, waistband type, belt compatibility, cuff type, lapel and pocket-square support, garment length, and footwear construction/comfort/compatibility. Fields are optional. AI may suggest only visible features with per-field confidence; unknown remains valid. User answers are tagged as user sourced.

## Recommendation use

High or collared necklines reduce necklace priority; V-neck, scoop, strapless and sweetheart necklines support appropriate necklaces. Statement earrings and necklaces do not stack automatically. Statement wrist jewelry does not stack with a watch. Explicit belt incompatibility rejects belts; unknown remains eligible cautiously. Cufflinks require French or convertible cuffs. Pocket squares require jacket evidence. Footwear attributes add evidence without excluding sparse legacy shoes.

## Safe migration and audit

Dry-run styling metadata:

```bash
npm run backfill:styling-metadata -- --limit=500
npm run backfill:styling-metadata -- --category=accessories
npm run backfill:styling-metadata -- --user-id=<id>
```

Write only after reviewing output:

```bash
npm run backfill:styling-metadata -- --write --limit=500
```

Read-only aggregate audit:

```bash
npm run audit:wardrobe-taxonomy -- --limit=1000
npm run audit:wardrobe-taxonomy -- --category=accessories
npm run audit:wardrobe-taxonomy -- --days=30
```

Before running, verify `.env.local`/`.env.production` points to the intended database. Production requires the additional `--confirm-production-readonly` flag. Output includes only database name and aggregates—never wardrobe names, descriptions, images, emails, profiles or user IDs.

Offline calibration:

```bash
npm run analyze:recommendation-diagnostics -- --file=/safe/path/diagnostics.jsonl
```

The report distinguishes likely missing metadata, possible scoring issues, taxonomy problems and expected restraint. It never changes thresholds.

## Rollout and rollback

1. Deploy optional schema and diagnostics.
2. Enable Needs Review.
3. Run the read-only audit.
4. Run a bounded dry-run backfill.
5. Review unresolved/conflict rates.
6. Run a small scoped write.
7. Observe aggregate diagnostics.
8. Tune only with evidence.

Rollback application code normally. New optional fields may remain safely unused; do not delete legacy category or subtype fields and do not run an unrestricted migration.
