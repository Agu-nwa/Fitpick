# MyFitPick design system

MyFitPick is an intelligent wardrobe and personal stylist product. The interface should feel like a calm editorial fashion studio: useful first, polished without ornament, and trustworthy during slow AI operations.

Use only the existing FitPick tokens and components documented in `.superdesign/init/theme.md` and `.superdesign/init/components.md`.

## Visual language

- Warm cream canvas, translucent white cards, thin warm-gray borders.
- Teal/cocoa is the primary action and success color; espresso is reserved for strong navigation surfaces; olive/gold is secondary.
- Georgia editorial headings may be large on landing/result moments, but operational states use concise system-sans headings for clarity.
- Rounded cards, generous spacing, restrained shadows, and high-contrast readable copy.
- Product and wardrobe imagery remains prominent; use neutral placeholders in design drafts.

## Preview lifecycle UX

- Treat queued, processing, delayed, completed, and failed as distinct states.
- Waiting must occupy the primary preview canvas, never a tiny sidebar spinner or an empty page.
- Never show fabricated progress percentages or estimated completion times.
- Say that an in-app MyFitPick notification will arrive when ready. Do not promise email or push.
- Reinforce that the user can leave safely and the job will continue.
- Keep selected-item thumbnails and count visible while waiting.
- Completed state prioritizes the generated full-body preview, then download/save/regenerate actions.
- Failed state provides safe copy, conditional credit-restoration language, retry, return-to-origin, and support.
- Mobile layouts must remain above the bottom navigation and iOS safe-area inset; desktop must use the full content width without a blank canvas.
- Animations must be subtle, work with reduced-motion preferences, and never suggest fake provider progress.
