import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/docs/", "/showcase", "/gallery", "/gen", "/sponsor"],
        disallow: ["/api/", "/dev/"],
      },
    ],
    sitemap: "https://shieldcn.dev/sitemap.xml",
  }
}
