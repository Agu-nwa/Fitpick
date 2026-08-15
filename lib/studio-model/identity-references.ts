import fs from "node:fs/promises";
import path from "node:path";
import type { StudioModelAppearance } from "./appearance-taxonomy";

export const STUDIO_MODEL_IDENTITY_VERSION = "studio-model-identities-v1" as const;

export type StudioModelIdentityReference = {
  id: "female-primary-v1" | "male-primary-v1";
  genderPresentation: StudioModelAppearance["gender"];
  version: typeof STUDIO_MODEL_IDENTITY_VERSION;
  repositoryPath: string;
};

const identityReferences: Record<StudioModelAppearance["gender"], StudioModelIdentityReference> = {
  female: {
    id: "female-primary-v1",
    genderPresentation: "female",
    version: STUDIO_MODEL_IDENTITY_VERSION,
    repositoryPath: "assets/studio-model/identity-references/female-primary-v1.png"
  },
  male: {
    id: "male-primary-v1",
    genderPresentation: "male",
    version: STUDIO_MODEL_IDENTITY_VERSION,
    repositoryPath: "assets/studio-model/identity-references/male-primary-v1.png"
  }
};

export function resolveStudioModelIdentityReference(appearance: StudioModelAppearance) {
  if (appearance.representation !== "studio_model") return null;
  return identityReferences[appearance.gender];
}

export async function loadStudioModelIdentityReference(reference: StudioModelIdentityReference) {
  const absolutePath = path.resolve(process.cwd(), reference.repositoryPath);
  const identityRoot = path.resolve(process.cwd(), "assets/studio-model/identity-references");
  if (!absolutePath.startsWith(`${identityRoot}${path.sep}`)) {
    throw new Error("studio_model_identity_path_invalid");
  }
  try {
    return await fs.readFile(absolutePath);
  } catch {
    throw new Error("studio_model_identity_reference_missing");
  }
}

export function listStudioModelIdentityReferences() {
  return Object.values(identityReferences);
}
