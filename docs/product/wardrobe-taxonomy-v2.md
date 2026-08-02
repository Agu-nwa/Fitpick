# Wardrobe taxonomy v2

MyFitPick retains the existing broad wardrobe categories while adding canonical subtype, structure, styling, visibility, set-component, confidence, evidence, and review fields underneath them.

New uploads use the shared catalogue in `lib/wardrobe/canonical-taxonomy.ts`. Ambiguous jewelry, sets, nightshirts, pouches, and traditional pieces remain review-required until their role or components are confirmed. Wallets and small leather goods do not count as primary bags. Closet hair pieces remain separate from Studio Model appearance and are not included in normal outfit completion.

## Backfill

The backfill is read-only by default:

```bash
npm run backfill:wardrobe-taxonomy
```

Optional dry-run filters:

```bash
npm run backfill:wardrobe-taxonomy -- --category=accessories --limit=100
npm run backfill:wardrobe-taxonomy -- --user-id=<id> --batch-size=50
```

Write mode requires an explicit flag:

```bash
npm run backfill:wardrobe-taxonomy -- --write
```

The script is idempotent, processes bounded batches, preserves confirmed taxonomy, does not replace a higher-confidence value, and marks uncertain records for review. Always inspect dry-run output and take a database backup before write mode. Write mode is never run automatically by application startup or deployment.
