import type { NextConfig } from "next"
import { withSentryConfig } from "@sentry/nextjs"

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@shieldcn/core"],
  skipTrailingSlashRedirect: true,
}

// Source map upload + release tracking only activate when the Sentry org/project
// and auth token are present. Self-hosted builds run this as a no-op.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
})
