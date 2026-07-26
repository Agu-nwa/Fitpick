export type StudioModelGender = "male" | "female";
export type StudioModelType = "standard" | "petite" | "athletic" | "broad" | "curvy" | "plus-size" | "maternity";

export type StudioModelOption = {
  gender: StudioModelGender;
  type: StudioModelType;
  label: string;
  description: string;
  imagePath: string;
};

export const studioModelOptions = [
  {
    gender: "male",
    type: "standard",
    label: "Standard",
    description: "Balanced body proportions.",
    imagePath: "/models/studio/male-standard.png"
  },
  {
    gender: "male",
    type: "petite",
    label: "Petite",
    description: "Smaller frame and shorter height proportions.",
    imagePath: "/models/studio/male-petite.png"
  },
  {
    gender: "male",
    type: "athletic",
    label: "Athletic",
    description: "Toned, sporty body shape.",
    imagePath: "/models/studio/male-athletic.png"
  },
  {
    gender: "male",
    type: "broad",
    label: "Broad",
    description: "Wider shoulders and stronger upper-body frame.",
    imagePath: "/models/studio/male-broad.png"
  },
  {
    gender: "male",
    type: "plus-size",
    label: "Plus-size",
    description: "Fuller body proportions.",
    imagePath: "/models/studio/male-plus-size.png"
  },
  {
    gender: "female",
    type: "standard",
    label: "Standard",
    description: "Balanced body proportions.",
    imagePath: "/models/studio/female-standard.png"
  },
  {
    gender: "female",
    type: "petite",
    label: "Petite",
    description: "Smaller frame and shorter height proportions.",
    imagePath: "/models/studio/female-petite.png"
  },
  {
    gender: "female",
    type: "athletic",
    label: "Athletic",
    description: "Toned, sporty body shape.",
    imagePath: "/models/studio/female-athletic.png"
  },
  {
    gender: "female",
    type: "curvy",
    label: "Curvy",
    description: "More defined bust and hips with a noticeable waist.",
    imagePath: "/models/studio/female-curvy.png"
  },
  {
    gender: "female",
    type: "plus-size",
    label: "Plus-size",
    description: "Fuller body proportions.",
    imagePath: "/models/studio/female-plus-size.png"
  },
  {
    gender: "female",
    type: "maternity",
    label: "Maternity",
    description: "Designed for pregnancy and changing body proportions.",
    imagePath: "/models/studio/female-maternity.png"
  }
] as const satisfies readonly StudioModelOption[];

export function getStudioModelOptions(gender?: StudioModelGender | null) {
  return studioModelOptions.filter((option) => option.gender === gender);
}

export function getStudioModelOption(gender?: string | null, type?: string | null) {
  return studioModelOptions.find((option) => option.gender === gender && option.type === type) || null;
}

export function isValidStudioModelSelection(gender?: string | null, type?: string | null) {
  return Boolean(getStudioModelOption(gender, type));
}

export function resolveStudioModelImagePath(gender?: string | null, type?: string | null) {
  return getStudioModelOption(gender, type)?.imagePath || null;
}

function publicAppBaseUrl() {
  const raw = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || process.env.VERCEL_URL || "https://www.myfitpick.com";
  const withProtocol = raw.startsWith("http://") || raw.startsWith("https://") ? raw : `https://${raw}`;
  return withProtocol.replace(/\/$/, "");
}

export function resolveStudioModelImageUrl(gender?: string | null, type?: string | null) {
  const imagePath = resolveStudioModelImagePath(gender, type);
  if (!imagePath) return null;
  return `${publicAppBaseUrl()}${imagePath}`;
}

export function fallbackStudioModelForGender(genderPresentation?: string | null) {
  if (genderPresentation === "masculine") return resolveStudioModelImageUrl("male", "standard");
  if (genderPresentation === "feminine") return resolveStudioModelImageUrl("female", "standard");
  return resolveStudioModelImageUrl("female", "standard");
}
