import type { Metadata } from "next"
import Link from "next/link"
import { Check, Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SiteShell } from "@/components/site-shell"
import { pageMetadata } from "@/lib/metadata"

export const metadata: Metadata = pageMetadata({
  title: "Pricing",
  description:
    "shieldcn pricing. Public badges are free forever. Plus adds saved READMEs, mass migration, and AI. Pro adds managed brand assets and analytics for companies.",
  path: "/pricing",
})

interface Tier {
  name: string
  price: string
  cadence?: string
  tagline: string
  cta: { label: string; href: string }
  featured?: boolean
  features: string[]
}

const TIERS: Tier[] = [
  {
    name: "Free",
    price: "$0",
    tagline: "Everything you need to ship great badges.",
    cta: { label: "Start building", href: "/" },
    features: [
      "All badge providers, variants & themes",
      "Charts, headers, sponsor & contributor walls",
      "Query-param styling on every badge",
      "Single-repo shields.io migration preview",
      "Public endpoints, no account required",
    ],
  },
  {
    name: "Plus",
    price: "$8",
    cadence: "/mo",
    tagline: "For maintainers who live in their READMEs.",
    cta: { label: "Get Plus", href: "/api/checkout?plan=plus" },
    features: [
      "Everything in Free",
      "Saved READMEs in the Studio (sync across devices)",
      "Mass migration — open PRs across all your repos",
      "AI: generate & polish READMEs",
      "Priority rendering",
    ],
  },
  {
    name: "Pro",
    price: "$30",
    cadence: "/mo",
    tagline: "For companies managing a brand across many repos.",
    featured: true,
    cta: { label: "Get Pro", href: "/api/checkout?plan=pro" },
    features: [
      "Everything in Plus",
      "Managed brands — restyle every embed by editing once",
      "Hosted brand assets (logos) at stable URLs",
      "Brand-aware badges & README headers",
      "Badge analytics dashboard (per-subject, per-source)",
      "Team seats",
    ],
  },
]

export default function PricingPage() {
  return (
    <SiteShell>
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-5xl px-6 py-14 md:px-10">
          <div className="mb-10 flex flex-col gap-3">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Pricing</h1>
            <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
              Public badges are free forever — that&apos;s the part that never
              changes. Paid plans add identity, control, and insight around your
              badges, and keep shieldcn sustainable.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {TIERS.map((tier) => (
              <div
                key={tier.name}
                className={`flex flex-col gap-5 rounded-xl border p-6 ${
                  tier.featured ? "border-foreground/30 bg-muted/30 shadow-sm" : "border-border"
                }`}
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-baseline justify-between">
                    <h2 className="text-lg font-semibold">{tier.name}</h2>
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

          <div className="mt-10 flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
            <Heart className="size-4 shrink-0" />
            <span>
              Not a company? Individuals can also support shieldcn via{" "}
              <Link href="/sponsor" className="underline underline-offset-4 hover:text-foreground">
                GitHub Sponsors
              </Link>
              .
            </span>
          </div>
        </div>
      </main>
    </SiteShell>
  )
}
