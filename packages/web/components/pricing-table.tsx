import Link from "next/link"
import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"

/**
 * shieldcn
 * components/pricing-table.tsx
 *
 * The shared Free / Plus tier grid, used on both /pricing and the
 * homepage. Single source of truth for tier copy, prices, and CTAs.
 */

interface Tier {
  name: string
  price: string
  cadence?: string
  tagline: string
  cta: { label: string; href: string }
  featured?: boolean
  features: string[]
}

export const TIERS: Tier[] = [
  {
    name: "Free",
    price: "$0",
    tagline: "Everything you need to ship great badges.",
    cta: { label: "Start building", href: "/" },
    features: [
      "All badge providers, variants & themes",
      "Charts, headers, sponsor & contributor walls",
      "Query-param styling on every badge",
      "Save 2 READMEs + 2 badges to the cloud",
      "Single-repo shields.io migration preview",
    ],
  },
  {
    name: "Plus",
    price: "$10",
    cadence: "/mo",
    tagline: "For maintainers who live in their READMEs.",
    featured: true,
    cta: { label: "Get Plus", href: "/api/checkout?plan=plus" },
    features: [
      "Everything in Free",
      "Save 50 READMEs (sync across devices)",
      "Saved badges library — reuse a badge anywhere",
      "Mass migration — open PRs across all your repos",
      "AI: generate & polish READMEs",
      "One managed brand — restyle every embed by editing once",
      "Hosted brand assets (logos + fonts) at stable URLs",
      "Priority rendering",
    ],
  },
]

export function PricingTable() {
  return (
    <div className="mx-auto grid max-w-3xl gap-6 md:grid-cols-2">
      {TIERS.map((tier) => (
        <div
          key={tier.name}
          className={`flex flex-col gap-5 rounded-xl border p-6 ${
            tier.featured ? "border-foreground/30 bg-muted/30 shadow-sm" : "border-border"
          }`}
        >
          <div className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">{tier.name}</h3>
                {tier.featured && (
                  <span className="rounded-full bg-gradient-to-r from-violet-500 to-blue-500 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                    Popular
                  </span>
                )}
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold tracking-tight">{tier.price}</span>
                {tier.cadence && (
                  <span className="text-sm text-muted-foreground">{tier.cadence}</span>
                )}
              </div>
            </div>
            <p className="text-sm text-muted-foreground">{tier.tagline}</p>
          </div>

          <Button
            asChild
            variant={tier.featured ? "default" : "outline"}
            className="w-full"
          >
            <Link href={tier.cta.href}>{tier.cta.label}</Link>
          </Button>

          <ul className="flex flex-col gap-2.5 text-sm">
            {tier.features.map((f) => (
              <li key={f} className="flex items-start gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
