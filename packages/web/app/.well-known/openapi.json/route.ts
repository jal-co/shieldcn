/**
 * shieldcn
 * app/.well-known/openapi.json/route.ts
 *
 * Minimal OpenAPI 3.1 spec for the badge API.
 * Referenced by the API catalog at /.well-known/api-catalog.
 */

const SITE = "https://shieldcn.dev"

const spec = {
  openapi: "3.1.0",
  info: {
    title: "shieldcn Badge API",
    version: "1.0.0",
    description:
      "SVG and PNG badge image service styled as shadcn/ui buttons. Supports 50+ providers, 6 variants, 16 themes, and 40,000+ icons.",
    contact: {
      name: "Justin Levine",
      url: "https://justinlevine.me",
    },
    license: {
      name: "MIT",
      url: "https://github.com/jal-co/shieldcn/blob/main/LICENSE",
    },
  },
  servers: [{ url: SITE }],
  paths: {
    "/{provider}/{params}.svg": {
      get: {
        operationId: "getBadgeSvg",
        summary: "Render a badge as SVG",
        description:
          "Returns an SVG badge image for the given provider and parameters.",
        parameters: [
          {
            name: "provider",
            in: "path",
            required: true,
            schema: { type: "string" },
            description:
              "Badge provider (npm, github, discord, pypi, badge, etc.)",
          },
          {
            name: "params",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Provider-specific path parameters",
          },
          {
            name: "variant",
            in: "query",
            schema: {
              type: "string",
              enum: [
                "default",
                "secondary",
                "outline",
                "ghost",
                "destructive",
                "branded",
              ],
              default: "default",
            },
          },
          {
            name: "mode",
            in: "query",
            schema: {
              type: "string",
              enum: ["dark", "light"],
              default: "dark",
            },
          },
          {
            name: "size",
            in: "query",
            schema: {
              type: "string",
              enum: ["xs", "sm", "default", "lg"],
              default: "sm",
            },
          },
          {
            name: "theme",
            in: "query",
            schema: {
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
          },
          {
            name: "logo",
            in: "query",
            schema: { type: "string" },
            description:
              "Icon slug (SimpleIcons), ri:Name (React Icons), or 'false' to hide",
          },
          {
            name: "label",
            in: "query",
            schema: { type: "string" },
            description: "Override the badge label text",
          },
          {
            name: "split",
            in: "query",
            schema: { type: "string", enum: ["true", "false"] },
          },
          {
            name: "gradient",
            in: "query",
            schema: { type: "string" },
            description:
              "Comma-separated hex colors, optional angle last (e.g. ff6b6b,4ecdc4,135)",
          },
        ],
        responses: {
          "200": {
            description: "SVG badge image",
            content: { "image/svg+xml": { schema: { type: "string" } } },
          },
          "404": {
            description: "Provider or badge not found",
            content: { "image/svg+xml": { schema: { type: "string" } } },
          },
        },
      },
    },
    "/{provider}/{params}.png": {
      get: {
        operationId: "getBadgePng",
        summary: "Render a badge as PNG",
        description: "Same as SVG endpoint but returns a PNG image.",
        parameters: [
          {
            name: "provider",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
          {
            name: "params",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "PNG badge image",
            content: { "image/png": { schema: { type: "string", format: "binary" } } },
          },
        },
      },
    },
    "/{provider}/{params}.json": {
      get: {
        operationId: "getBadgeJson",
        summary: "Get raw badge data as JSON",
        description:
          "Returns the raw badge data (label, value, color) without rendering.",
        parameters: [
          {
            name: "provider",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
          {
            name: "params",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Badge data",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    label: { type: "string" },
                    value: { type: "string" },
                    color: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
}

export function GET() {
  return Response.json(spec, {
    headers: {
      "Content-Type": "application/openapi+json",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  })
}
