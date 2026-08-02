# Recommendation correctness repair

The shared Create Look and Match recommendation layers construct looks in three deterministic stages:

1. Select one core structure: `top_bottom`, `dress_one_piece`, `native_one_piece`, or `native_separates`.
2. Complete footwear from the full eligible wardrobe. This stage has no first-ten limit and records a reason for every non-selected owned shoe.
3. Select at most three intentional finishers across canonical accessory roles.

Core generation uses a bounded beam. Each slot receives a configurable quota containing top-ranked, least-recently-used, and subtype-diverse candidates. Stable item IDs break score ties. Accessories are not included during the core combinatorial search; they are selected by the finishing stage after footwear.

Missing metadata is uncertainty and remains neutral. Only explicit occasion, formality, weather, structure, color, duplicate-role, or wrist-stack conflicts reject an otherwise identifiable item.

## Accessory migration

Dry-run (default):

```bash
npm run backfill:accessory-taxonomy
```

Optional bounded dry-run:

```bash
npm run backfill:accessory-taxonomy -- --limit=1000 --batch-size=100
```

Write after reviewing the report:

```bash
npm run backfill:accessory-taxonomy -- --write --limit=10000 --batch-size=100
```

The backfill is idempotent, preserves confirmed or higher-confidence values, and leaves generic jewelry unresolved when available evidence cannot identify its role.
