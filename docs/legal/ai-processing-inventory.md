# AI Processing Inventory

| Workflow | Inputs / stored input | Provider/model configuration | Output/persistence | Human/moderation | Failure/fallback/limitations | Disclosure/deletion | Evidence |
|---|---|---|---|---|---|---|---|
| Wardrobe tagging | Normalized garment, label/fabric images and metadata; original/cutout variants may persist | OpenAI; configured wardrobe/OCR models | Tags, confidence, care/material/brand suggestions in MongoDB | User confirmation; provider moderation | Fails safely or leaves review state; can misclassify | UI review exists; image/provider deletion incomplete | wardrobe AI/OCR/providers/routes |
| Inspiration analysis | Reference image and prompt/context | OpenAI reference analysis | Category/colour/occasion/summary persisted | No routine human review | Can fail, expire or be unusable | Match UI; cleanup fields but provider retention unknown | reference AI/model/routes |
| Outfit recommendation | Wardrobe metadata, profile, history, occasion/weather | Deterministic engine; OpenAI may generate explanation/stylist text | Selected item IDs, scores, rationale/history persisted | User judgment | Hard conflicts and limited-wardrobe fallback; taxonomy dependent | Completeness/fidelity UI; retention unknown | recommendation modules/models |
| AI stylist chat | Prompt, wardrobe/profile/context | Configured OpenAI stylist model | Response and outfit records | No pre-review; support reporting | Provider fallback/error copy; hallucination possible | User-facing stylist and policies; retention unknown | stylist modules/route/UI |
| Outfit visualization | Selected garments and prompt | Configured OpenAI image model | Generated image in S3 and MongoDB record | No routine review; provider moderation | Can omit/misrender garments; failure no usable output | Approximation copy; deletion incomplete | stylist visualization/outfit preview |
| Virtual Try-On | Model image, garment images, pose/style | FASHN `tryon-max` when configured; OpenAI internal preview; custom extension | Generated image and fidelity/provider metadata persisted | No pre-review | Core/partial capability; accessories may be unsupported; failed output rejected | Styled Look vs Rendered Preview disclosure; deletion incomplete | Try-On adapters/capabilities/models/UI |
| Studio Model generation/catalogue | Appearance configuration and generation prompt | Configured OpenAI image generation | Asset/thumbnail in S3; catalogue/profile metadata | Human approval can be required | Provider moderation/quality validation/fallback | Appearance UI; sensitive-data consent needs strengthening | Studio Model catalogue/avatar modules |
| Image quality/validation | Image bytes/dimensions/format and generated output | Local validation plus provider responses | Quality flags/errors | No routine human review | Rejects invalid/unusable output | Safe error copy; logs should exclude raw image | image policies/tryon validation |

[CANADIAN LEGAL REVIEW REQUIRED: Confirm provider data-retention and model-training settings.]

## Assumptions Made

Model environment variables can change without code changes; model names are operational rather than contractual promises.

## Missing Information Required from MyFitPick

Production model list, provider settings/contracts, human-review SLA, moderation rules, evaluation thresholds and change governance.

## Legal Review Notes

Review each image workflow for consent, sensitivity, automated-decision disclosure and cross-border requirements.

## Recommended Updates Before Production Use

Maintain a model card/provider register and link every workflow to retention, incident and user-rights procedures.

## Codebase Evidence Reviewed

AI configuration, analysis/tagging/OCR/stylist/image modules, recommendation engine, provider adapters and UI.

## Document Status

Internal inventory requiring legal and provider verification.
