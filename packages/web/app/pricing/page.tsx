import type { Metadata } from "next"
import Link from "next/link"
import { Heart } from "lucide-react"
import { SiteShell } from "@/components/site-shell"
import { PricingTable } from "@/components/pricing-table"
import { pageMetadata } from "@/lib/metadata"

export const metadata: Metadata = pageMetadata({
  title: "Pricing",
  description:
    "shieldcn pricing. Public badges are free forever. Plus adds saved READMEs, mass migration, and AI. Pro adds managed brand assets and analytics for companies.",
  path: "/pricing",
})

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
              badges, and keep shieldcn sustainable. And shieldcn is, and always
              will be,{" "}
              <Link href="/docs/self-hosting" className="underline underline-offset-4 hover:text-foreground">
                self-hostable
              </Link>{" "}
              — run the whole engine yourself, no plan required.
            </p>
          </div>

          <PricingTable />

          <div className="mt-10 flex flex-col gap-3">
            <div className="flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
              <Heart className="size-4 shrink-0" />
              <span>
                Not a company? Individuals can also support shieldcn via{" "}
                <Link href="/sponsor" className="underline underline-offset-4 hover:text-foreground">
                  GitHub Sponsors
                </Link>
                .
              </span>
            </div>
            <p className="px-1 text-sm text-muted-foreground">
              Want the details? Read about{" "}
              <Link href="/docs/pro/brands" className="underline underline-offset-4 hover:text-foreground">
                managed brands
              </Link>
              ,{" "}
              <Link href="/docs/pro/assets" className="underline underline-offset-4 hover:text-foreground">
                hosted assets
              </Link>
              , and{" "}
              <Link href="/docs/pro/analytics" className="underline underline-offset-4 hover:text-foreground">
                analytics
              </Link>
              .
            </p>
          </div>
        </div>
      </main>
    </SiteShell>
  )
}
