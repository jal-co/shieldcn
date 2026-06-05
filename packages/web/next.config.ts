import type { NextConfig } from "next"
import { createMDX } from "fumadocs-mdx/next"
import { withSentryConfig } from "@sentry/nextjs"

const nextConfig: NextConfig = {
  transpilePackages: ["@shieldcn/core"],
}

const withMDX = createMDX()

// Source map upload + release tracking only activate when the Sentry org/project
// and auth token are present (CI/Vercel). Locally and for forks this is a no-op.
export default withSentryConfig(withMDX(nextConfig), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
})
