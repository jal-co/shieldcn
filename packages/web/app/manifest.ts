import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "shieldcn",
    short_name: "shieldcn",
    description:
      "Beautiful GitHub README badges styled as shadcn/ui buttons. Generate SVG and PNG badges for npm, GitHub, Discord, and 25+ providers.",
    start_url: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    icons: [
      {
        src: "/icon.png",
        sizes: "1024x1024",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/apple-icon.png",
        sizes: "1024x1024",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  }
}
