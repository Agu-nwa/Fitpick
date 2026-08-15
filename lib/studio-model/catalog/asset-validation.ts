import sharp from "sharp";
import { openai } from "@/lib/ai/openai";
import { getAiModel } from "@/lib/ai/models/registry";
import type { StudioModelAppearance } from "../appearance-taxonomy";

export async function validateStudioModelAsset(body: Buffer, appearance?: StudioModelAppearance) {
  return validateStudioModelAssetWithIdentity(body, appearance);
}

export async function validateStudioModelAssetWithIdentity(body: Buffer, appearance?: StudioModelAppearance, identityReference?: Buffer) {
  const metadata = await sharp(body).metadata();
  const width = metadata.width || 0, height = metadata.height || 0;
  const technicalChecks = { supportedFormat: ["png", "jpeg", "webp"].includes(metadata.format || ""), resolution: width >= 768 && height >= 1024, portrait: height > width, byteSize: body.byteLength >= 20_000 && body.byteLength <= 15 * 1024 * 1024 };
  if (!appearance || Object.values(technicalChecks).some((value) => !value)) {
    const qualityScore = Object.values(technicalChecks).filter(Boolean).length / Object.keys(technicalChecks).length;
    return { accepted: false, reviewRequired: qualityScore >= 0.75, qualityScore, checks: technicalChecks, width, height, format: metadata.format || "png" };
  }
  const checkNames = ["plainBackground", "neutralStandingPose", "evenLighting", "frontCameraAngle", "fullBodyVisible", "neutralClothing", "noLogosOrText", "appearanceFidelity", ...(identityReference ? ["identityFidelity"] : [])];
  const content: Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string; detail: "low" } }> = [
    { type: "text", text: `Review this Studio Model asset. Return JSON booleans only for: ${checkNames.join(", ")}. Expected controls: presentation ${appearance.gender}; body ${appearance.bodyType}; skin ${appearance.skinTone}; hair texture ${appearance.hairTexture}; length ${appearance.hairLength}; style ${appearance.hairStyle}; color ${appearance.hairColor}.${identityReference ? " The first image is the generated asset and the second is its approved identity reference. identityFidelity means the generated face preserves the same recognizable facial geometry while allowing the explicitly selected skin and hair controls." : ""} Do not identify the person, name a demographic, or infer sensitive attributes.` },
    { type: "image_url", image_url: { url: `data:image/png;base64,${body.toString("base64")}`, detail: "low" } }
  ];
  if (identityReference) {
    content.push({ type: "image_url", image_url: { url: `data:image/png;base64,${identityReference.toString("base64")}`, detail: "low" } });
  }
  const response = await openai.chat.completions.create({ model: getAiModel("wardrobeVision"), temperature: 0, response_format: { type: "json_object" }, messages: [{ role: "user", content }] });
  const raw = JSON.parse(response.choices[0]?.message?.content || "{}");
  const visualChecks = Object.fromEntries(checkNames.map((key) => [key, raw[key] === true]));
  const checks = { ...technicalChecks, ...visualChecks };
  const qualityScore = Object.values(checks).filter(Boolean).length / Object.keys(checks).length;
  return { accepted: qualityScore === 1, reviewRequired: qualityScore >= 0.75 && qualityScore < 1, qualityScore, checks, width, height, format: metadata.format || "png" };
}
