import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/docs/", "/showcase", "/gen", "/sponsor"],
        disallow: ["/api/", "/dev/"],
      },
    ],
    sitemap: "https://shieldcn.dev/sitemap.xml",
  }
}
