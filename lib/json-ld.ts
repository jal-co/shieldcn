/**
 * shieldcn
 * lib/json-ld
 *
 * JSON-LD structured data for search engine rich results.
 */

const SITE_URL = "https://shieldcn.dev"

/** WebSite schema — enables sitelinks search box in Google */
export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "shieldcn",
    url: SITE_URL,
    description:
      "Beautiful README badges styled as shadcn/ui buttons. A shields.io alternative with 6 variants, 16 themes, and 5,000+ built-in icons.",
    inLanguage: "en-US",
  }
}

/** SoftwareApplication schema — tells Google this is a developer tool */
export function softwareAppJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "shieldcn",
    url: SITE_URL,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Any",
    description:
      "Beautiful README badges styled as shadcn/ui buttons. Drop-in shields.io replacement with GitHub, npm, and Discord badges. 6 variants, 16 themes, 5,000+ icons.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    author: {
      "@type": "Person",
      name: "Justin Levine",
      url: "https://justinlevine.me",
    },
    license: "https://opensource.org/licenses/MIT",
    isAccessibleForFree: true,
    keywords: [
      "readme badges",
      "shields.io alternative",
      "github badges",
      "npm badges",
      "svg badges",
      "markdown badges",
      "badge generator",
      "shadcn badges",
    ],
  }
}

/** TechArticle schema for doc pages */
export function techArticleJsonLd({
  title,
  description,
  path,
}: {
  title: string
  description: string
  path: string
}) {
  return {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: title,
    description,
    url: `${SITE_URL}${path}`,
    author: {
      "@type": "Person",
      name: "Justin Levine",
      url: "https://justinlevine.me",
    },
    publisher: {
      "@type": "Organization",
      name: "shieldcn",
      url: SITE_URL,
    },
    isAccessibleForFree: true,
    inLanguage: "en-US",
  }
}
