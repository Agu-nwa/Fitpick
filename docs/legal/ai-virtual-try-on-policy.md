# MyFitPick AI and Virtual Try-On Policy

**Draft for Canadian legal review — not yet approved for publication**

## 1. AI Features

MyFitPick uses automated systems for wardrobe metadata and label extraction, inspiration-image analysis, stylist responses and explanations, outfit imagery, Studio Model assets and Virtual Try-On. Core recommendation selection also uses deterministic scoring, taxonomy, occasion, weather, history and user preferences.

## 2. Inputs and Outputs

Inputs may include wardrobe and label photographs, inspiration images, selected wardrobe metadata, prompts, occasion and weather context, model configuration and model images. Outputs may include inferred metadata, text, outfit selections, confidence/warning information and generated images. Relevant records and generated images may be persisted in MongoDB and object storage.

## 3. Providers

OpenAI is implemented for text, vision and image processing. FASHN is a configurable Virtual Try-On provider. Internal and custom provider adapters also exist. A configured provider receives only the inputs needed for the requested workflow, but contractual retention and training settings are not established by source code.

[CANADIAN LEGAL REVIEW REQUIRED: Confirm provider data-retention and model-training settings.]

## 4. Human Review and User Control

Most user outputs are not reviewed by a human before delivery. Some Studio Model catalogue assets can require human approval. Users can review and correct wardrobe metadata, select preferences, retry failed workflows and report problems to support.

## 5. Approximation and Fidelity

Virtual Try-On is not a fitting, measurement, body scan or guarantee. Colour, lighting, texture, logos, drape, layering, length, pose and body proportions can vary. FASHN capability mapping treats core garments as stronger than outerwear and footwear and treats bags, watches, jewellery, eyewear and women’s hair as unsupported for reliable inclusion. A successful core preview may therefore omit a selected accessory.

The **Styled Look** is the authoritative item list. The **Rendered Preview** is an approximate provider interpretation.

## 6. Recommendation Limitations

Recommendations can reflect incomplete, mislabeled or outdated wardrobe metadata. Weather and occasion checks reduce, but cannot eliminate, unsuitable results. MyFitPick does not guarantee availability, physical condition, fit, safety, cultural appropriateness or event compliance. Users should physically inspect and try clothing.

## 7. Representation, Skin Tone and Hair

Studio Model options include skin-tone and hair configuration. Generated and third-party imagery may reproduce these characteristics imperfectly or unevenly. MyFitPick should test representation across supported options and provide correction/reporting channels. The Service must not be represented as determining race, ethnicity, health or identity from appearance.

## 8. Moderation and Prohibited Content

Provider moderation may reject a request. MyFitPick also validates inputs, restricts supported MIME types and sizes, uses content rules and may refuse unsafe or abusive activity. Users must not upload non-consensual intimate imagery, child sexual abuse material, exploitative content, impersonation material, unlawful content or images they lack rights to use.

[ENGINEERING VERIFICATION REQUIRED: Confirm a complete user reporting, blocking, moderation escalation and illegal-content preservation process.]

## 9. Failures and Credits

Paid Virtual Try-On costs are reserved and committed only after a usable success under the current credit engine. Actual provider failure, empty/unusable output or failed persistence should release or avoid a charge. A successful core preview that omits an unsupported accessory remains a successful generation. Users should contact support about suspected duplicate charges.

## 10. Ownership and Licence

Users retain their rights in inputs. Rights in AI outputs can be uncertain and may be affected by third-party rights and provider terms. Users receive permission to use outputs through the Terms, subject to law; MyFitPick does not guarantee exclusivity or non-infringement.

## 11. Reporting

Report unsafe, biased, inaccurate, infringing or payment-related output to `support@myfitpick.com`, with the feature and approximate time but without resending unnecessary sensitive information.

## Assumptions Made

The configured production providers match the implemented adapters.

## Missing Information Required from MyFitPick

Provider contracts, training settings, moderation SLA, bias-testing standard, reporting escalation and output licence position.

## Legal Review Notes

Review consent for image/appearance processing, biometric characterization, output ownership and prohibited-content obligations.

## Recommended Updates Before Production Use

Publish capability-aware copy, implement reporting workflows and document recurring representation testing.

## Codebase Evidence Reviewed

AI, recommendation, Studio Model, provider-capability, Try-On, validation, storage, credit and preview UI modules.

## Document Status

Draft for licensed Canadian legal review; not approved legal advice.
