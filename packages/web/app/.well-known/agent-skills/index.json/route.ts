/**
 * shieldcn
 * app/.well-known/agent-skills/index.json/route.ts
 *
 * Agent Skills Discovery Index (v0.2.0).
 * Lists skills that agents can install to work with shieldcn.
 */

const SITE = "https://shieldcn.dev"

export function GET() {
  const index = {
    $schema:
      "https://schemas.agentskills.io/discovery/0.2.0/schema.json",
    skills: [
      {
        name: "shieldcn-badges",
        type: "skill-md",
        description:
          "Add beautiful shadcn/ui-styled README badges to projects using shieldcn. Covers 50+ providers, 6 variants, 16 themes, and 40,000+ icons.",
        url: `${SITE}/.well-known/agent-skills/shieldcn-badges/SKILL.md`,
        digest:
          "sha256:21066d8aca90d594a02ec19afd09e14eb9a9d5b08b5060bdabf7a4ebc89e18c4",
      },
    ],
  }

  return Response.json(index, {
    headers: {
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  })
}
