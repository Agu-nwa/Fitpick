# MyFitPick design system

MyFitPick is an intelligent wardrobe and personal stylist product. The interface should feel like a calm editorial fashion studio: useful first, polished without ornament, and trustworthy during slow AI operations.

Use the existing MyFitPick components documented in `.superdesign/init/components.md`. The palette below is extracted from the live production website and is the single source of truth for the redesigned frontend.

## Visual language

- Production canvas is paper cream `#FAF7F0`; elevated cards are pure white `#FFFFFF`; secondary warm panels use `#F4EFE7`; primary ink is `#171514`; muted text is `#746E67`; borders are `#E8DED0`.
- Sage-teal `#557C78` is the sole primary brand accent for actions, active states, focus rings, selected controls, icons, links, and confirmed or informational moments. Its hover tone is `#456A66`.
- Dark umber `#4A2E22` anchors restrained dark/footer surfaces and provides the warm hue for shadows. Pale gold `#D8B98C` is optional and limited to tiny premium or warning details.
- Deep black `#0A0A09` is reserved for cinematic surfaces and browser theme chrome; normal text uses production ink `#171514`.
- Do not introduce cocoa as a competing primary, lime, blush, pink, blue, saturated gradients, or multiple decorative accent colours. Semantic danger remains red and is used only for real system states.
- Bodoni Moda/Didot editorial headings may be large on landing and result moments. Operational states use concise system-sans headings and body text for clarity.
- Use flat cream canvases, solid white surfaces, thin warm borders, generous spacing, and warm-umber shadows. Avoid decorative gradients, excessive glass, glow, floating decoration, and dense card grids.
- Product and wardrobe imagery remains prominent; use neutral placeholders in design drafts.

## Authenticated application

- Shared shell first: consistent desktop rail, mobile bottom navigation, contextual headers, focus states, safe-area spacing, and support access.
- Closet is image-led and task-focused: upload, processing, review, confirmed, failed, and empty states must remain immediately distinguishable.
- Stylist uses a focused studio hierarchy with one sage primary action and a quiet white or warm-panel alternative.
- Looks behaves like an editorial archive with clear dates and uncluttered image surfaces.
- Profile is an orderly settings workspace; active sections use sage and destructive actions remain semantically red.
- Preserve every route, control, loading state, error state, and backend integration. This is a visual-system change, not a workflow rewrite.

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
