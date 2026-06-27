# FitPick Privacy Readiness

FitPick is planned for Canada/global availability, so privacy controls should be transparent, user-controlled, and conservative.

## Data Inventory

FitPick stores account profile details, wardrobe metadata, wardrobe images, label photos, AI analysis, Style DNA, Fashion Memory, generated previews, Digital Human avatar presets, avatar preview metadata, billing events, and audit events.

## User Control

- Users can edit Style DNA.
- Users can edit their Digital Human profile.
- Users can submit an account deletion request.
- Fashion Memory should remain explainable and user-controlled.
- Future production should add a full user data export endpoint and a completed deletion workflow.

## Sensitive Attributes

FitPick must not infer or store sensitive identity attributes such as religion, ethnicity, health, sexuality, political views, or precise location.

Allowed fashion context examples:

- `church outfit` as an occasion request
- `native wear` as clothing preference
- `ankara`, `agbada`, `kaftan`, `aso-ebi`, `isiagu` as garment/style context

Do not store those as identity claims.

## Digital Human Preview

- Digital Human Preview is an AI fashion visualization, not exact body-measurement virtual try-on.
- Store body presets only, not exact measurements.
- Treat skin tone and hair style presets as user-editable visualization settings, not inferred sensitive attributes.
- Do not infer health, ethnicity, sexuality, religion, political views, or precise location from avatar settings.
- Only accept HTTPS GLB avatar URLs.
- Generated avatar preview images should persist in S3/CloudFront; MongoDB stores metadata only.

## AI And Privacy

- Treat OCR/label text as untrusted.
- Do not log raw OCR label text unless needed for a tightly scoped debug session.
- Do not log full prompts or raw AI responses.
- Keep low-confidence AI fields reviewable.
- AI stylist responses should not expose internal prompts, raw memories, or raw profile payloads.

## Canada/Global Launch Notes

Before launch, prepare a public privacy policy, terms of service, contact channel for data requests, data export workflow, deletion completion workflow, retention schedule, and incident response plan.
