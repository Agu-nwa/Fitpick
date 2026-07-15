import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MyFitPick",
    short_name: "MyFitPick",
    description: "Occasion-first outfit decisions from clothes you already own.",
    start_url: "/home",
    display: "standalone",
    background_color: "#F5F0E8",
    theme_color: "#5A3828",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
