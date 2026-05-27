/**
 * shieldcn
 * components/webmcp.tsx
 *
 * WebMCP integration — exposes badge tools to AI agents via the browser.
 * https://webmachinelearning.github.io/webmcp/
 *
 * Registers tools on page load that agents can discover and invoke
 * to generate badge URLs and look up badge data.
 */

"use client"

import { useEffect } from "react"

const SITE = "https://shieldcn.dev"

export function WebMCP() {
  useEffect(() => {
    const nav = navigator as Navigator & {
      modelContext?: {
        registerTool: (tool: {
          name: string
          description: string
          inputSchema: Record<string, unknown>
          execute: (input: Record<string, string>) => Promise<unknown>
        }, options?: { signal?: AbortSignal }) => void
      }
    }

    if (!nav.modelContext?.registerTool) return

    const controller = new AbortController()
    const { signal } = controller

    // Tool: generate a badge URL
    nav.modelContext.registerTool(
      {
        name: "shieldcn_badge_url",
        description:
          "Generate a shieldcn badge image URL for a given provider and parameters. Returns a URL you can use in markdown or HTML.",
        inputSchema: {
          type: "object",
          properties: {
            provider: {
              type: "string",
              description:
                "Badge provider: npm, github, discord, pypi, crates, docker, bluesky, badge, shipperclub, etc.",
            },
            params: {
              type: "string",
              description:
                "Provider-specific path, e.g. 'react' for npm, 'stars/vercel/next.js' for github",
            },
            variant: {
              type: "string",
              enum: ["default", "secondary", "outline", "ghost", "destructive", "branded"],
            },
            mode: { type: "string", enum: ["dark", "light"] },
            format: { type: "string", enum: ["svg", "png"], default: "svg" },
          },
          required: ["provider", "params"],
        },
        execute: async (input) => {
          const { provider, params, variant, mode, format = "svg" } = input
          const qp = new URLSearchParams()
          if (variant) qp.set("variant", variant)
          if (mode) qp.set("mode", mode)
          const qs = qp.toString() ? `?${qp.toString()}` : ""
          const url = `${SITE}/${provider}/${params}.${format}${qs}`
          return { url, markdown: `![${provider} badge](${url})` }
        },
      },
      { signal }
    )

    // Tool: get raw badge data
    nav.modelContext.registerTool(
      {
        name: "shieldcn_badge_data",
        description:
          "Fetch raw badge data (label, value, color) as JSON from shieldcn for any provider.",
        inputSchema: {
          type: "object",
          properties: {
            provider: { type: "string", description: "Badge provider" },
            params: { type: "string", description: "Provider-specific path" },
          },
          required: ["provider", "params"],
        },
        execute: async (input) => {
          const { provider, params } = input
          const res = await fetch(`${SITE}/${provider}/${params}.json`)
          return res.json()
        },
      },
      { signal }
    )

    return () => controller.abort()
  }, [])

  return null
}
