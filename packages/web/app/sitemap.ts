import type { MetadataRoute } from "next"
import { readdirSync, statSync } from "node:fs"
import { join } from "node:path"

const BASE_URL = "https://shieldcn.dev"

function collectDocSlugs(dir: string, prefix = ""): string[] {
  const slugs: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const stat = statSync(full)
    if (stat.isDirectory()) {
      slugs.push(...collectDocSlugs(full, `${prefix}${entry}/`))
    } else if (entry.endsWith(".mdx")) {
      const name = entry.replace(/\.mdx$/, "")
      if (name === "index") {
        slugs.push(prefix.replace(/\/$/, ""))
      } else {
        slugs.push(`${prefix}${name}`)
      }
    }
  }
  return slugs
}

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE_URL}/showcase`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE_URL}/gen`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/gen/profile`, lastModified: now, changeFrequency: "weekly", priority: 0.85 },
    { url: `${BASE_URL}/sponsor`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/token-pool`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
  ]

  // Docs pages — auto-discovered from content/docs
  const docSlugs = collectDocSlugs(join(process.cwd(), "content/docs"))
  const docPages: MetadataRoute.Sitemap = docSlugs.map((slug) => ({
    url: `${BASE_URL}/docs${slug ? `/${slug}` : ""}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: slug === "" ? 0.9 : 0.7,
  }))

  return [...staticPages, ...docPages]
}
