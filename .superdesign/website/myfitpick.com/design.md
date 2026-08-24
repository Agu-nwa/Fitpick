---
version: "superdesign-alpha"
name: "Editorial Wardrobe Cream"
description: "A warm off-white editorial system pairing a bold serif display with sans body text, a rationed sage-teal accent, and soft-shadowed white product cards documenting a step-by-step process flow."
colors:
  background: "#FAF7F0"
  surface: "#FFFFFF"
  surface-warm: "#F4EFE7"
  text-primary: "#171514"
  text-secondary: "#746E67"
  accent: "#557C78"
  accent-border: "#547C78"
  border-soft: "#E8DED0"
  footer-bg: "#4A2E22"
typography:
  display-lg:
    fontFamily: "Georgia"
    fontSize: "88px"
    fontWeight: 600
    lineHeight: "1"
    letterSpacing: "-1.8px"
  headline-md:
    fontFamily: "Georgia"
    fontSize: "72px"
    fontWeight: 600
    lineHeight: "1"
    letterSpacing: "-1.4px"
  body-md:
    fontFamily: "ui-sans-serif"
    fontSize: "20px"
    fontWeight: 400
    lineHeight: "1.6"
  label-md:
    fontFamily: "Georgia"
    fontSize: "30px"
    fontWeight: 600
    lineHeight: "1.2"
  accent-serif-italic:
    fontFamily: "Georgia"
    fontStyle: "italic"
    fontWeight: 600
  body-sm:
    fontFamily: "ui-sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "1.6"
    color: "#171514"
spacing:
  base: "4px"
  gap-sm: "8px"
  gap-md: "12px"
  gap-lg: "20px"
  gap-xl: "24px"
  section-gap: "118px"
  section-padding: "96px"
  content-max-width: "118px"
rounded:
  control: "8px"
  card: "20px"
  card-lg: "30px"
  panel: "12px"
  callout: "16px"
  pill: "9999px"
components:
  navbar:
    background: "#FAF7F0"
    backdrop-filter: "blur(24px)"
    height: "65px"
    width: "100%"
    radius: "0px 0px 0px 0px"
    items: 7
  button-primary-hero:
    background: "#557C78"
    text-color: "#FFFFFF"
    radius: "16px"
    height: "44px"
  button-secondary-outline:
    background: "#FFFFFF"
    text-color: "#171514"
    border: "1px solid #E8DED0"
    radius: "16px"
    height: "44px"
  button-nav-cta:
    background: "#557C78"
    text-color: "#FFFFFF"
    radius: "16px"
    height: "44px"
  button-on-band:
    background: "#FFFFFF"
    text-color: "#557C78"
    radius: "9999px"
    height: "44px"
  card-product:
    background: "#FFFFFF"
    radius: "20px"
    padding: "0px"
    shadow: "rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(74, 46, 34, 0.06) 0px 8px 24px 0px"
  card-app-panel:
    background: "#FFFFFF"
    radius: "20px"
    padding: "24px"
    shadow: "rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(74, 46, 34, 0.11) 0px 20px 48px 0px"
  card-step-block:
    background: "transparent"
    radius: "0px"
    padding: "0px"
  card-faq-row:
    background: "transparent"
    radius: "0px"
    border-bottom: "1px solid #E8DED0"
  cta-band:
    background: "#557C78"
    radius: "30px"
    text-color: "#FFFFFF"
  footer:
    background: "#4A2E22"
    text-color: "#FFFFFF"
---
# Editorial Wardrobe Cream
Source: https://myfitpick.com

## Overview
This is a warm-neutral, editorial minimalism system: a cream (#FAF7F0) canvas dominates roughly three-quarters of every screen, carrying oversized Georgia serif headlines with tight negative tracking, sparse sans-serif body copy, and a single desaturated sage-teal (#557C78) accent rationed to buttons, icons, and one CTA band. The tone sits between Swiss-grid restraint and soft-glassmorphic product staging — white cards with barely-there warm shadows document an app's workflow like tiles in an annotated case study, not a saturated SaaS marketing gradient.

## Composition
The hero is pure text-on-cream: a two-line Georgia headline (first clause in solid black weight, second clause switching to italic sage-teal), a short sans subhead, and a two-button row, all centered on a wide empty canvas with no illustration above the fold — a deliberate choice favoring typographic confidence over a hero visual, rejecting the more common product-screenshot-behind-headline pattern. Below the fold the page shifts to a numbered, alternating step sequence (four steps, each pairing a left/right Georgia heading + sans paragraph against a right/left white app-panel screenshot), each step marked by a small circular numeral badge in Georgia italic. The rhythm is airy — one step per generous vertical band, section gaps near 118px — until the FAQ, which compresses into a dense single-column accordion list, and the page closes on a bold sage CTA band and a dark brown footer. Density is low throughout except inside the white panels, where card grids of product tiles carry the only visual busyness on the page.

## Colors
Cream (#FAF7F0, ~70% of pixels) is the page background/surface-0, functioning like a paper stock rather than a neutral gray. Pure white (#FFFFFF, ~16%) is reserved for elevated cards, app-panel chrome, and the FAQ section's own background band. Near-black (#171514) carries all primary headline and body ink. Sage-teal (#557C78, ~2%) is the single accent — used for italic headline clauses, primary buttons, badge icons, link-toned labels, and the closing CTA band fill; it never appears as a background wash or gradient. A dark umber (#4A2E22, ~2%) appears only once, as the footer fill, anchoring the page's bottom edge in a heavier tone. Borders use a pale warm tan (#E8DED0) for hairline dividers between FAQ rows and card edges. Nothing else is colored — chips, secondary buttons, and outlines stay white/cream/black, keeping the palette to four functional colors total.

## Typography
Georgia serif carries all display and heading roles at large, tightly tracked sizes (88px/-1.8px for the hero, 72px/-1.4px for secondary headlines, 30px/1.2 for numbered step badges), always weight 600 — bold and editorial, never regular-weight serif. An italic cut of the same Georgia face is the system's signature accent, applied to a trailing clause of the hero headline (roughly the final six words, sized identically to its non-italic neighbor but recolored sage-teal) and to small numeral badges. Body copy is entirely ui-sans-serif at 20px/1.6 for lead paragraphs and 16px/1.6 for card and UI text, colored near-black (#171514) with secondary/meta text stepping down to a warm gray (#746E67). This serif-display + sans-body pairing is the core hierarchy signal: any bold Georgia is a heading, any sans is body or interface chrome.

## Layout
Content is boxed to a 672px measure for text columns, widening only for the paired step layouts and card grids. Two-column alternating grids (gap 80px) place text against app-panel imagery, with row height splits like [57/37] and [38/55] as content length varies — text and image swap sides between steps. A tighter [87/20] two-column split appears in a step whose panel overlaps its neighbor. Inside app panels, product-tile grids run two-up (rows of 49%/49% width pairs) for wardrobe items, and full-width single-column stacks (100%) for the step-content and FAQ-accordion families — no three- or four-up card rows appear anywhere on the page. Section padding runs 96px with inter-section gaps near 118px, and spacing throughout steps in the 4–24px scale for internal padding, jumping to 80px for major grid gutters. The layout is fixed-max-width and centered, not fluid-stretching, with no visible breakpoint collapse evidenced short of the natural single-column stacking of the two-column grids.

## Components
- **Navbar**: edge-to-edge square bar spanning the full 1920px viewport width (0px inset either side), 65px tall, sharp corners (0px on all four corners — TL/TR/BR/BL), sticky, filled #FAF7F0 with `backdrop-filter: blur(24px)`. Carries 7 items: a left logo lockup (small circular sage icon badge + wordmark), a center cluster of text nav links, and a right-side pairing of a plain-text sign-in link plus a solid CTA button (#557C78 fill, white text, 16px radius, 44px height).
- **Hero primary button**: the solid sage (#557C78) pill-cornered rectangle beneath the headline is the true hero primary — 16px radius (slightly-rounded, not a full pill), 44px height, white text, filled — distinct from the outline button beside it.
- **Hero secondary button**: an outline/white button immediately to its right, white fill, thin border, same 16px radius and 44px height, black text with a small trailing directional glyph — a lower-emphasis companion action, not a competing primary.
- **Nav CTA button**: same visual family as the hero primary (#557C78 fill, white text, 16px radius, 44px height) but scaled smaller for the navbar's compact row.
- **App-panel card** (×2+ per step, appears once per numbered step as the visual anchor beside its text): white (#FFFFFF) fill, 20px radius, near-invisible warm shadow (`rgba(74, 46, 34, 0.11) 0px 20px 48px 0px` for the larger standalone panels), internal padding ~24px. Anatomy top-to-bottom: a mini internal header bar (small icon + wordmark + section label + circular avatar placeholder), then a labeled content zone — either a 2-up grid of product photography tiles (each sub-tile: full-bleed top image, category eyebrow in small caps, item name, all inside its own 20px-radius white card with the lighter shadow `rgba(74, 46, 34, 0.06) 0px 8px 24px 0px`) or a chat-style input mockup with pill-shaped filter chips beneath it (occasion/weather/mood tokens in white pill outlines).
- **Selected-state chip**: small pill badge with a checkmark glyph and sage-toned label text, overlaid at the top of product tiles to mark inclusion in a look — white/cream fill, full pill radius.
- **Numbered step badge**: small circle (roughly 32–40px) with a thin border, containing an italic Georgia numeral (01–04) in sage-teal, positioned as a standalone marker beside each step's heading.
- **CTA outcome band** (single instance, positioned right before the footer): full-width rounded rectangle, sage-teal (#557C78) fill, large radius (~30px), white centered content — small outline icon, bold serif headline, and a white pill-shaped button (#FFFFFF fill, sage text, full 9999px radius) — the only fully-pill button in the system, reserved for this closing conversion moment.
- **FAQ accordion row** (×4, single column, full-width): transparent background, no radius, separated by 1px hairline borders (#E8DED0), each row a bold sans/serif question label with a plus-glyph disclosure icon aligned right.
- **Trust strip** (3 items in a row, appears just above the footer): icon + bold label + supporting sans caption, no card container, arranged as a simple horizontal cluster with generous gaps.
- **Footer**: full-width band, dark umber (#4A2E22) fill, white text, holding 5 links in a simple horizontal or clustered arrangement — the single heaviest, darkest surface on the page.

## Graphics & Effects
No gradients, meshes, or photographic backgrounds are used anywhere — the entire canvas stays a flat cream fill with color introduced only through UI elements. Elevation is communicated exclusively through soft, warm-tinted drop shadows keyed to the umber hue rather than neutral black: `rgba(74, 46, 34, 0.06) 0px 8px 24px 0px` on small product tiles, `rgba(74, 46, 34, 0.075) 0px 12px 32px 0px` on mid-weight cards, and `rgba(74, 46, 34, 0.11) 0px 20px 48px 0px` on the largest standalone app panels — a graduated three-tier shadow scale that stands in for a lighting system. The navbar's `blur(24px)` backdrop-filter is the only glass treatment, softening whatever scrolls beneath the sticky bar rather than sitting over a vivid background. Product photography inside cards (garments, bags, shoes, jewelry) is shot on a neutral warm-beige studio backdrop, giving every tile a consistent soft, catalog-like texture without any overlay or scrim.

## Motion
Interactive elements transition on a fast, unified timing: `color, background-color, border-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, filter, backdrop-filter 0.15s cubic-bezier(0.4, 0, 0.2, 1)` — a snappy, ease-out-flavored curve applied uniformly across hover and state changes rather than bespoke per-element timing. Named keyframe animations (pulse, spin, plus two custom "float" cycles and a "shimmer" and "avatar-turn" pass) suggest subtle idle motion on decorative or avatar elements and a loading/shimmer treatment for image placeholders, consistent with the soft, unhurried editorial character rather than snappy app-like transitions.

## Guardrails
- Never fill the hero or any full section with a saturated gradient — color stays confined to buttons, one icon, italic text, and the single CTA band.
- Keep the italic sage-teal treatment limited to a short trailing clause of a headline (a few words at matching size to its neighbor) — do not apply it to entire paragraphs or body text.
- Do not round the navbar's corners or inset it from the viewport edge — it is a sharp-cornered, full-bleed sticky bar with blur, not a floating capsule.
- Preserve the warm-umber-tinted shadow tone (rgba(74,46,34,…)) on cards instead of substituting neutral black shadows.
- Do not merge the pill-shaped CTA-band button with the 16px-radius hero/nav buttons — only the closing band uses a true 9999px pill.
- Keep product/app-panel imagery on neutral warm-beige studio backgrounds, never full-bleed lifestyle photography or dark scrims.