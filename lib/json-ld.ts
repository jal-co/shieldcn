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
      "Beautiful GitHub README badges styled as shadcn/ui buttons. Generate SVG and PNG badges for npm, GitHub, Discord, and 25+ providers. 6 variants, 16 themes, 40,000+ icons. Free and open source.",
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
      "Beautiful GitHub README badges styled as shadcn/ui buttons. Generate SVG and PNG badges for npm, GitHub, Discord, and 25+ providers. 6 variants, 16 themes, 40,000+ icons. Free and open source.",
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

/** WebApplication schema for profile README generator — rich SEO signal */
export function profileReadmeJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "GitHub Profile README Badge Generator",
    url: `${SITE_URL}/gen/profile`,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Any",
    description:
      "Generate beautiful badges for your GitHub profile README. Auto-detects skills, languages, social links, and top repos. Styled as shadcn/ui buttons with 6 variants, 16 themes, and 40,000+ icons.",
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
    isAccessibleForFree: true,
    keywords: [
      "github profile readme",
      "github profile readme badges",
      "github profile readme generator",
      "profile readme badges",
      "readme badge generator",
      "github badges",
      "developer profile",
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
