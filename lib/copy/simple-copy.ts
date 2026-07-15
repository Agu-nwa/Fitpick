export const SIMPLE_COPY = {
  "Digital Human": "Avatar",
  "Avatar Preview": "See it on me",
  "Fit-Locked Preview": "Better fit preview",
  "Garment-Referenced Preview": "Uses your real clothes",
  "AI Visualization": "Outfit preview",
  "True 3D Simulation": "Advanced try-on",
  "Preview Accuracy Level": "Preview type",
  "Garment Asset": "Clothing image",
  "Entity Recognition": "Clothing details",
  "Body Measurement Profile": "My size",
  "Measurement Confidence": "Size accuracy",
  "Studio Image": "Clean clothing photo",
  "Generate Preview": "Show outfit",
  "Generate Fit-Locked Preview": "Show better fit",
  "Request Exact 3D Simulation": "Request advanced try-on"
} as const;

const previewLabels: Record<string, string> = {
  ai_visualization: SIMPLE_COPY["AI Visualization"],
  garment_referenced: SIMPLE_COPY["Garment-Referenced Preview"],
  fit_locked: SIMPLE_COPY["Fit-Locked Preview"],
  true_3d_simulation: SIMPLE_COPY["True 3D Simulation"]
};

export function simpleCopy(label: string | null | undefined) {
  if (!label) return "";
  return SIMPLE_COPY[label as keyof typeof SIMPLE_COPY] || label;
}

export function simplePreviewType(input?: string | { id?: string | null; label?: string | null } | null) {
  if (!input) return SIMPLE_COPY["AI Visualization"];
  if (typeof input === "string") return simpleCopy(input);
  if (input.id && previewLabels[input.id]) return previewLabels[input.id];
  return simpleCopy(input.label || SIMPLE_COPY["AI Visualization"]);
}

export function simpleFitStatus(status?: string | null) {
  if (status === "likely_fits") return "Likely fits";
  if (status === "may_be_tight") return "May feel tight";
  if (status === "may_be_loose") return "May feel loose";
  if (status === "oversized_intended") return "Oversized on purpose";
  if (status === "measurements_needed") return "Add size details";
  return "Fit not sure yet";
}

export function simpleSourceLabel(source?: string | null) {
  if (source === "ocr") return "Label photo";
  if (source === "vision") return "Photo check";
  if (source === "logo_detection") return "Logo check";
  if (source === "entity_resolver") return "Item check";
  if (source === "system_inferred") return "MyFitPick guess";
  if (source === "user_confirmed") return "Checked by you";
  return "Not sure";
}
