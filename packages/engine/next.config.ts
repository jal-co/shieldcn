import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@shieldcn/core"],
  skipTrailingSlashRedirect: true,
}

export default nextConfig
