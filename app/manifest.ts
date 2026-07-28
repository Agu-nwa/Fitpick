import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "MyFitPick",
    short_name: "MyFitPick",
    description: "Your AI wardrobe and personal stylist.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    background_color: "#F5F0E8",
    theme_color: "#557C78",
    orientation: "portrait-primary",
    categories: ["lifestyle", "shopping", "productivity"],
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
      {
        src: "/icons/myfitpick-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/myfitpick-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/myfitpick-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Open Closet",
        short_name: "Closet",
        description: "View your saved wardrobe.",
        url: "/wardrobe",
        icons: [{ src: "/icons/myfitpick-icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Ask Stylist",
        short_name: "Stylist",
        description: "Open your AI stylist.",
        url: "/stylist",
        icons: [{ src: "/icons/myfitpick-icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Add a Piece",
        short_name: "Add Piece",
        description: "Add a wardrobe item.",
        url: "/wardrobe/add",
        icons: [{ src: "/icons/myfitpick-icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}
