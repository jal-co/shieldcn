/**
 * shieldcn
 * scripts/context-dev-demo.ts
 *
 * Local demo that proves the Context.dev integration works end to end against
 * the live API. Hits the network, so it is NOT part of the test suite.
 *
 * Usage:
 *   CONTEXT_DEV_API_KEY=ctxt_secret_... pnpm --filter @shieldcn/web tsx scripts/context-dev-demo.ts stripe.com
 *   … tsx scripts/context-dev-demo.ts --ticker AAPL
 *   … tsx scripts/context-dev-demo.ts --name "Airbnb"
 */

import { getBrandProfile, brandProfileToMarkdown, type BrandLookup } from "../lib/context-dev"

function parseArgs(argv: string[]): BrandLookup {
  const args = argv.slice(2)
  const flag = (name: string) => {
    const i = args.indexOf(name)
    return i >= 0 ? args[i + 1] : undefined
  }
  const positional = args.find((a) => !a.startsWith("--") && args[args.indexOf(a) - 1]?.startsWith("--") !== true)
  return {
    domain: flag("--domain") ?? (positional && !positional.startsWith("--") ? positional : undefined),
    name: flag("--name"),
    email: flag("--email"),
    ticker: flag("--ticker"),
    isin: flag("--isin"),
  }
}

async function main() {
  if (!process.env.CONTEXT_DEV_API_KEY) {
    console.error("Set CONTEXT_DEV_API_KEY to run this demo.")
    process.exit(1)
  }
  const lookup = parseArgs(process.argv)
  console.error("Looking up:", JSON.stringify(lookup))

  const profile = await getBrandProfile(lookup)
  if (!profile) {
    console.error("No brand found.")
    process.exit(2)
  }

  console.log(JSON.stringify(profile, null, 2))
  console.log("\n--- brand.md ---\n")
  console.log(brandProfileToMarkdown(profile))
}

void main()
