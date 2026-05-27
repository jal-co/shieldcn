/**
 * shieldcn
 * app/.well-known/mcp/server-card.json/route.ts
 *
 * MCP Server Card for agent discovery (SEP-1649).
 * Advertises shieldcn's badge rendering capabilities.
 */

const SITE = "https://shieldcn.dev"

export function GET() {
  const card = {
    serverInfo: {
      name: "shieldcn",
      version: "1.0.0",
      description:
        "Badge image service that renders SVG/PNG badges styled as shadcn/ui buttons. 50+ providers, 6 variants, 16 themes, 40,000+ icons.",
      homepage: SITE,
    },
    capabilities: {
      tools: [
        {
          name: "render_badge",
          description:
            "Render a badge image URL for a given provider and parameters. Returns the badge URL, not the image itself.",
          inputSchema: {
            type: "object",
            properties: {
              provider: {
                type: "string",
                description:
                  "Badge provider (npm, github, discord, pypi, crates, docker, bluesky, badge, etc.)",
              },
              params: {
                type: "string",
                description:
                  "Provider-specific path (e.g. 'react' for npm, 'stars/vercel/next.js' for github)",
              },
              format: {
                type: "string",
                enum: ["svg", "png"],
                default: "svg",
              },
              variant: {
                type: "string",
                enum: [
                  "default",
                  "secondary",
                  "outline",
                  "ghost",
                  "destructive",
                  "branded",
                ],
              },
              mode: {
                type: "string",
                enum: ["dark", "light"],
              },
              theme: {
                type: "string",
                enum: [
                  "zinc",
                  "slate",
                  "blue",
                  "green",
                  "rose",
                  "orange",
                  "violet",
                  "purple",
                  "cyan",
                  "emerald",
                ],
              },
              logo: {
                type: "string",
                description: "Icon slug or 'false' to hide",
              },
              label: {
                type: "string",
                description: "Override label text",
              },
            },
            required: ["provider", "params"],
          },
        },
      ],
      resources: [
        {
          name: "badge_data",
          description:
            "Get raw badge data (label, value, color) as JSON for any provider.",
          uriTemplate: `${SITE}/{provider}/{params}.json`,
        },
      ],
    },
    transport: {
      type: "http",
      endpoint: SITE,
      documentation: `${SITE}/docs/api-reference`,
    },
  }

  return Response.json(card, {
    headers: {
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  })
}
