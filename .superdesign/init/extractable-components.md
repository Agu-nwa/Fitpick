# Extractable components

## AppShell
- Source: `components/layout/AppShell.tsx`
- Category: layout
- Description: Responsive authenticated shell with desktop sidebar, contextual header, mobile bottom navigation, and support launcher.
- Extractable props: `showNav`, `showMobileNav`, `showSupport`
- Hardcoded: content width, safe-area spacing, fashion backdrop, navigation positions

## ContextPageChrome
- Source: `components/navigation/ContextPageChrome.tsx`
- Category: layout
- Description: Sticky contextual back/title/close bar.
- Extractable props: `title`, `closeHref`, `closeLabel`
- Hardcoded: iconography, sizing, translucent canvas styling

## Button
- Source: `components/ui/Button.tsx`
- Category: basic
- Description: Rounded FitPick action button.
- Extractable props: `variant`, `disabled`
- Hardcoded: spacing, type size, focus and press behavior

## Card
- Source: `components/ui/Card.tsx`
- Category: basic
- Description: Premium translucent surface.
- Extractable props: none
- Hardcoded: radius, warm border, shadow, blur

## Badge
- Source: `components/ui/Badge.tsx`
- Category: basic
- Description: Semantic pill used for status and outfit attributes.
- Extractable props: `tone`
- Hardcoded: pill geometry and compact typography

## ImageFrame
- Source: `components/ui/ImageFrame.tsx`
- Category: basic
- Description: Framed image with controlled aspect ratio and fit.
- Extractable props: `src`, `alt`, `aspect`, `fit`
- Hardcoded: border, radius, neutral gradient placeholder
