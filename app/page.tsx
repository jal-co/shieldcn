import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { BadgeBuilder } from "@/components/badge-builder"
import { SiteShell } from "@/components/site-shell"

export default function Home() {
  return (
    <SiteShell>
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-4xl px-6 md:px-10">
          {/* Hero */}
          <section className="py-20 text-center space-y-6">
            <Badge variant="secondary" className="gap-1.5">
              Open Source
              <ArrowRight className="size-3" />
            </Badge>

            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
              Beautiful README badges
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              A shields.io alternative with the visual quality of shadcn/ui.
              Drop-in SVG badges for npm, GitHub, Discord, and more.
            </p>

            {/* Example badges */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/npm/react.svg" alt="npm react" className="h-7" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/github/vercel/next.js/stars.svg?theme=blue" alt="stars" className="h-7" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/github/vercel/next.js/release.svg?theme=green" alt="release" className="h-7" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/github/vercel/next.js/license.svg?theme=violet" alt="license" className="h-7" />
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <Button asChild>
                <Link href="/docs">
                  Get Started
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/docs/api-reference">
                  API Reference
                </Link>
              </Button>
            </div>
          </section>

          <Separator />

          {/* Badge Builder */}
          <section className="py-16">
            <BadgeBuilder />
          </section>

          <Separator />

          {/* URL Reference */}
          <section className="py-16 space-y-6">
            <h2 className="text-2xl font-semibold tracking-tight">
              URL Reference
            </h2>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left py-3 px-4 font-medium">Badge</th>
                    <th className="text-left py-3 px-4 font-medium">URL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[
                    ["Static badge", "/badge/{label}-{value}-{color}.svg"],
                    ["Dynamic JSON", "/badge/dynamic/json.svg?url=...&query=..."],
                    ["npm version", "/npm/{package}.svg"],
                    ["npm downloads", "/npm/{package}/downloads.svg"],
                    ["GitHub stars", "/github/{owner}/{repo}/stars.svg"],
                    ["GitHub release", "/github/{owner}/{repo}/release.svg"],
                    ["CI status", "/github/{owner}/{repo}/ci.svg"],
                    ["License", "/github/{owner}/{repo}/license.svg"],
                    ["Discord", "/discord/{serverId}.svg"],
                  ].map(([badge, url]) => (
                    <tr key={badge} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4">{badge}</td>
                      <td className="py-3 px-4 font-mono text-xs text-muted-foreground">
                        {url}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <Separator />

          {/* Query Params */}
          <section className="py-16 space-y-6">
            <h2 className="text-2xl font-semibold tracking-tight">
              Query Parameters
            </h2>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left py-3 px-4 font-medium">Param</th>
                    <th className="text-left py-3 px-4 font-medium">Values</th>
                    <th className="text-left py-3 px-4 font-medium">Default</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[
                    ["variant", "default, secondary, outline, ghost, destructive", "default"],
                    ["size", "xs, sm, default, lg", "sm"],
                    ["theme", "zinc, slate, blue, green, rose, ...", "—"],
                    ["mode", "dark, light", "dark"],
                    ["split", "true, false", "false"],
                    ["logo", "SimpleIcons slug, lucide:name, ri:Name, or false", "auto"],
                    ["logoColor", "hex (no #)", "—"],
                    ["color", "hex (no #)", "—"],
                    ["labelColor", "hex (no #)", "—"],
                    ["label", "string", "auto"],
                    ["labelOpacity", "0–1", "0.7"],
                    ["valueColor", "hex (no #)", "—"],
                    ["labelTextColor", "hex (no #)", "—"],
                  ].map(([param, values, defaultVal]) => (
                    <tr key={param} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 font-mono text-xs">{param}</td>
                      <td className="py-3 px-4 text-muted-foreground">{values}</td>
                      <td className="py-3 px-4 text-muted-foreground">{defaultVal}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    </SiteShell>
  )
}
