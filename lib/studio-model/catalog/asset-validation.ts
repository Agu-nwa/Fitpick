import sharp from "sharp";
import { openai } from "@/lib/ai/openai";
import { getAiModel } from "@/lib/ai/models/registry";
import type { StudioModelAppearance } from "../appearance-taxonomy";

export async function validateStudioModelAsset(body: Buffer, appearance?: StudioModelAppearance) {
  const metadata = await sharp(body).metadata();
  const width = metadata.width || 0, height = metadata.height || 0;
  const technicalChecks = { supportedFormat: ["png", "jpeg", "webp"].includes(metadata.format || ""), resolution: width >= 768 && height >= 1024, portrait: height > width, byteSize: body.byteLength >= 20_000 && body.byteLength <= 15 * 1024 * 1024 };
  if (!appearance || Object.values(technicalChecks).some((value) => !value)) {
    const qualityScore = Object.values(technicalChecks).filter(Boolean).length / Object.keys(technicalChecks).length;
    return { accepted: false, reviewRequired: qualityScore >= 0.75, qualityScore, checks: technicalChecks, width, height, format: metadata.format || "png" };
  }
  const response = await openai.chat.completions.create({ model: getAiModel("wardrobeVision"), temperature: 0, response_format: { type: "json_object" }, messages: [{ role: "user", content: [{ type: "text", text: `Review this fictional Studio Model asset. Return JSON booleans only for: plainBackground, neutralStandingPose, evenLighting, frontCameraAngle, fullBodyVisible, neutralClothing, noLogosOrText, appearanceFidelity. Expected controls: presentation ${appearance.gender}; body ${appearance.bodyType}; skin ${appearance.skinTone}; hair texture ${appearance.hairTexture}; length ${appearance.hairLength}; style ${appearance.hairStyle}; color ${appearance.hairColor}. Do not identify the person or infer sensitive identity.` }, { type: "image_url", image_url: { url: `data:image/png;base64,${body.toString("base64")}`, detail: "low" } }] }] });
  const raw = JSON.parse(response.choices[0]?.message?.content || "{}");
  const visualChecks = Object.fromEntries(["plainBackground", "neutralStandingPose", "evenLighting", "frontCameraAngle", "fullBodyVisible", "neutralClothing", "noLogosOrText", "appearanceFidelity"].map((key) => [key, raw[key] === true]));
  const checks = { ...technicalChecks, ...visualChecks };
  const qualityScore = Object.values(checks).filter(Boolean).length / Object.keys(checks).length;
  return { accepted: qualityScore === 1, reviewRequired: qualityScore >= 0.75 && qualityScore < 1, qualityScore, checks, width, height, format: metadata.format || "png" };
}
