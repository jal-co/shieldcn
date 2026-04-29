import type { NextConfig } from "next"
import { createMDX } from "fumadocs-mdx/next"

const nextConfig: NextConfig = {
  transpilePackages: ["@shieldcn/core"],
}

const withMDX = createMDX()

export default withMDX(nextConfig)
