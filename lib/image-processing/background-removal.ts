import sharp from "sharp";

export type BackgroundRemovalResult = {
  applied: boolean;
  buffer: Buffer;
  mimeType: "image/jpeg";
  filename: string;
  width: number;
  height: number;
  provider: string;
  state: "background_removed" | "background_removal_unavailable";
};

function configuredProvider() {
  return (process.env.BACKGROUND_REMOVAL_PROVIDER || "").trim().toLowerCase();
}

export function backgroundRemovalConfigured() {
  return configuredProvider() === "remove_bg" && Boolean(process.env.REMOVE_BG_API_KEY?.trim());
}

/** Remove.bg returns a transparent cutout; flattening here guarantees the product requirement: white. */
export async function removeImageBackground(input: { buffer: Buffer; filename: string; mimeType: string }): Promise<BackgroundRemovalResult> {
  if (!backgroundRemovalConfigured()) {
    const metadata = await sharp(input.buffer).metadata();
    return {
      applied: false,
      buffer: input.buffer,
      mimeType: "image/jpeg",
      filename: input.filename,
      width: metadata.width || 0,
      height: metadata.height || 0,
      provider: "",
      state: "background_removal_unavailable"
    };
  }

  const form = new FormData();
  form.set("image_file", new Blob([Uint8Array.from(input.buffer)], { type: input.mimeType }), input.filename);
  form.set("size", "auto");
  form.set("format", "png");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);
  let response: Response;
  try {
    response = await fetch("https://api.remove.bg/v1.0/removebg", {
      method: "POST",
      headers: { "X-Api-Key": process.env.REMOVE_BG_API_KEY!.trim() },
      body: form,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
  if (!response.ok) throw new Error(`Background removal provider returned ${response.status}.`);

  const flattened = await sharp(Buffer.from(await response.arrayBuffer()))
    .flatten({ background: "#ffffff" })
    .jpeg({ quality: 92, mozjpeg: true })
    .toBuffer({ resolveWithObject: true });
  return {
    applied: true,
    buffer: flattened.data,
    mimeType: "image/jpeg",
    filename: input.filename.replace(/\.[^.]+$/, "") + "-white-background.jpg",
    width: flattened.info.width,
    height: flattened.info.height,
    provider: "remove_bg",
    state: "background_removed"
  };
}
