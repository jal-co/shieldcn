/**
 * shieldcn
 * app/robots.txt/route.ts
 *
 * Generates robots.txt with Content-Signal directives
 * for AI content usage preferences (draft-romm-aipref-contentsignals).
 */

export function GET() {
  const body = `User-agent: *
Allow: /
Allow: /docs/
Allow: /showcase
Allow: /gallery
Allow: /gen
Allow: /gen/profile
Allow: /sponsor
Disallow: /api/
Disallow: /dev/

# Content Signals (draft-romm-aipref-contentsignals)
# Badge images and docs are free to index and use as AI input.
# Training on shieldcn source/content is not preferred.
Content-Signal: ai-train=no, search=yes, ai-input=yes

Sitemap: https://shieldcn.dev/sitemap.xml
`

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  })
}
