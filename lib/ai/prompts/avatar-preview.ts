type AvatarPreviewPromptInput = {
  outfitDescription: string;
  occasion: string;
  avatarContext: string;
  visualizationStyle: "minimal" | "luxury" | "streetwear" | "editorial";
};

function styleInstruction(style: AvatarPreviewPromptInput["visualizationStyle"]) {
  if (style === "minimal") return "clean premium studio lighting, restrained styling, simple neutral background";
  if (style === "streetwear") return "premium streetwear editorial energy, confident pose, modern urban fashion styling";
  if (style === "editorial") return "fashion editorial composition, refined art direction, elevated lookbook lighting";
  return "luxury digital human fashion editorial style, elegant posture, premium studio finish";
}

export function buildAvatarPreviewPrompt(input: AvatarPreviewPromptInput) {
  return `Create a premium Digital Human Preview for FitPick using only the selected owned wardrobe item details.

Selected owned outfit:
${input.outfitDescription}

Occasion:
${input.occasion}

Avatar profile:
${input.avatarContext}

Visualization style:
${styleInstruction(input.visualizationStyle)}

Hard rules:
- Use only the owned wardrobe items described above.
- Do not invent garments, shoes, bags, jewelry, logos, text, watermarks, or shopping items.
- Preserve garment colors, visible patterns, fabrics, textures, and silhouettes from verified wardrobe metadata.
- Respect Nigerian/native wear, ankara, agbada, kaftan, isiagu, aso-ebi, lace, or senator styling only when the selected wardrobe metadata supports it.
- Do not oversexualize the digital human.
- Do not imply exact garment fit, real cloth physics, or body-accurate virtual try-on.
- If details are uncertain, keep the visualization restrained instead of adding guesses.
- No text in the image.

Metadata note for product display: AI digital human visualization, not exact virtual try-on.`;
}
