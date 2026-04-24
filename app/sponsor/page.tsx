import type { Metadata } from "next"
import type { ReactNode } from "react"
import Image from "next/image"
import Link from "next/link"
import { Heart, ExternalLink, Star, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SiteShell } from "@/components/site-shell"

function OpenPanelLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="55 28 210 42" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M104.374 36.542a5.173 5.173 0 1 0-10.347 0V60.42a5.174 5.174 0 1 0 10.347 0zM120.293 36.542a5.174 5.174 0 1 0-10.347 0v7.163a5.173 5.173 0 1 0 10.347 0z" />
      <path d="M74.212 31C66.362 31 60 37.363 60 45.212v5.808c0 7.85 6.363 14.212 14.212 14.212 7.85 0 14.212-6.363 14.212-14.212v-5.808c0-7.85-6.363-14.212-14.212-14.212m.026 8.36a5.174 5.174 0 0 0-5.174 5.174v7.163a5.174 5.174 0 1 0 10.348 0v-7.163a5.174 5.174 0 0 0-5.174-5.174" fillRule="evenodd" clipRule="evenodd" />
      <path d="M146 57.384q-2.472 0-4.248-1.056-1.776-1.08-2.736-3.072t-.96-4.752.96-4.752q.96-2.016 2.736-3.096t4.248-1.08q2.496 0 4.272 1.08 1.8 1.08 2.736 3.096.96 1.992.96 4.752t-.96 4.752q-.936 1.992-2.736 3.072-1.776 1.056-4.272 1.056m0-2.376q1.656 0 2.832-.768 1.2-.768 1.824-2.208.624-1.464.624-3.528t-.624-3.528-1.824-2.232q-1.176-.792-2.832-.792-1.632 0-2.808.792-1.176.768-1.824 2.232-.624 1.464-.624 3.528t.624 3.528q.648 1.44 1.824 2.208t2.808.768m10.823 5.592V44.232h2.4l.072 2.736-.288-.144q.48-1.416 1.584-2.136 1.104-.744 2.544-.744 1.872 0 3.072.936 1.224.912 1.8 2.424.6 1.512.6 3.312t-.6 3.312q-.576 1.512-1.8 2.448-1.2.912-3.072.912-.96 0-1.8-.336a4.2 4.2 0 0 1-1.44-.936 3.6 3.6 0 0 1-.816-1.464l.288-.288V60.6zm5.856-5.52q1.536 0 2.4-1.176.888-1.176.888-3.288t-.888-3.288q-.864-1.176-2.4-1.176-1.008 0-1.752.504-.744.48-1.152 1.488t-.408 2.472.384 2.472q.408 1.008 1.152 1.512.768.48 1.776.48m13.768 2.208q-1.872 0-3.24-.816-1.344-.816-2.088-2.328-.72-1.512-.72-3.528t.72-3.504q.744-1.512 2.088-2.328 1.344-.84 3.168-.84 1.728 0 3.048.816 1.32.792 2.04 2.304.744 1.512.744 3.648v.648h-9.168q.096 1.872.984 2.808.912.936 2.448.936 1.128 0 1.872-.528t1.032-1.416l2.64.168a5.3 5.3 0 0 1-1.992 2.88q-1.464 1.08-3.576 1.08m-3.408-7.848h6.48q-.12-1.704-.984-2.52-.84-.816-2.16-.816-1.368 0-2.256.864-.864.84-1.08 2.472M184.784 57V44.232h2.328l.096 3.408-.312-.168q.216-1.248.816-2.016t1.464-1.128a4.6 4.6 0 0 1 1.872-.384q1.44 0 2.376.648.96.624 1.44 1.728.504 1.08.504 2.472V57h-2.544v-7.44q0-1.128-.24-1.896t-.792-1.176-1.44-.408q-1.344 0-2.184.888t-.84 2.592V57zm14.21 0V39.96h6.36q2.928 0 4.56 1.416 1.632 1.392 1.632 3.888 0 1.656-.744 2.88-.744 1.2-2.136 1.848-1.368.624-3.312.624h-3.768V57zm2.592-8.736h3.696q1.752 0 2.664-.744.912-.768.912-2.256 0-1.464-.912-2.184-.912-.744-2.664-.744h-3.696zm15.954 9.024q-1.992 0-3.192-.912-1.176-.912-1.176-2.568t.984-2.568q1.008-.936 3.096-1.344l4.392-.84q0-1.488-.696-2.208-.696-.744-2.064-.744-1.224 0-1.92.552-.696.528-.96 1.584l-2.616-.168q.36-1.92 1.776-3.024 1.44-1.104 3.72-1.104 2.592 0 3.936 1.392 1.368 1.368 1.368 3.864v4.968q0 .456.144.648.168.168.528.168h.456V57q-.12.024-.384.048t-.552.024q-.816 0-1.416-.264a1.75 1.75 0 0 1-.864-.864q-.288-.624-.288-1.656l.264.12a3.03 3.03 0 0 1-.84 1.488q-.624.648-1.608 1.032a5.9 5.9 0 0 1-2.088.36m.408-2.016q1.152 0 1.968-.432.816-.456 1.272-1.248t.456-1.8v-.816l-3.744.72q-1.152.216-1.632.696-.456.456-.456 1.176 0 .816.552 1.272.576.432 1.584.432M227.464 57V44.232h2.328l.096 3.408-.312-.168q.216-1.248.816-2.016t1.464-1.128a4.6 4.6 0 0 1 1.872-.384q1.44 0 2.376.648.96.624 1.44 1.728.504 1.08.504 2.472V57h-2.544v-7.44q0-1.128-.24-1.896t-.792-1.176-1.44-.408q-1.344 0-2.184.888t-.84 2.592V57zm19.154.288q-1.87 0-3.239-.816-1.344-.816-2.088-2.328-.72-1.512-.72-3.528t.72-3.504q.744-1.512 2.088-2.328 1.344-.84 3.168-.84 1.728 0 3.048.816 1.32.792 2.04 2.304.744 1.512.744 3.648v.648h-9.168q.096 1.872.984 2.808.912.936 2.448.936 1.128 0 1.872-.528t1.032-1.416l2.64.168a5.3 5.3 0 0 1-1.992 2.88q-1.464 1.08-3.577 1.08m-3.407-7.848h6.48q-.12-1.704-.984-2.52-.84-.816-2.16-.816-1.368 0-2.256.864-.864.84-1.08 2.472M257.857 57q-1.248 0-2.016-.648t-.768-2.064V39.96h2.544v14.088q0 .432.216.648.24.216.672.216h1.008V57z" />
    </svg>
  )
}

interface Sponsor {
  name: string
  href: string
  logo?: string
  logoComponent?: ReactNode
}

export const metadata: Metadata = {
  title: "Sponsor — shieldcn",
  description:
    "Support shieldcn. Every badge is free and always will be — but if you want to help, this is the way.",
}

const GITHUB_SPONSORS_URL = "https://github.com/sponsors/jal-co"

interface Stargazer {
  login: string
  avatar_url: string
}

async function getStargazers(): Promise<Stargazer[]> {
  const pages: Stargazer[] = []
  let page = 1
  while (page <= 5) {
    const res = await fetch(
      `https://api.github.com/repos/jal-co/shieldcn/stargazers?per_page=100&page=${page}`,
      {
        headers: {
          Accept: "application/vnd.github.v3+json",
          ...(process.env.GITHUB_TOKEN
            ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
            : {}),
        },
        next: { revalidate: 3600 },
      }
    )
    if (!res.ok) break
    const data: Stargazer[] = await res.json()
    if (data.length === 0) break
    pages.push(...data)
    if (data.length < 100) break
    page++
  }
  return pages.filter((s) => s.login !== "jal-co")
}

const tiers = [
  {
    name: "Open Source Program",
    slots: 4,
    sponsors: [
      {
        name: "OpenPanel",
        href: "https://openpanel.dev/open-source?utm_source=shieldcn.dev",
        logoComponent: <OpenPanelLogo className="h-8 w-auto" />,
      },
    ] as Sponsor[],
    colors: {
      bg: "linear-gradient(145deg, #22c55e 0%, #4ade80 30%, #16a34a 60%, #86efac 100%)",
      text: "#052e16",
      border: "#16a34a",
      slotBg: "rgba(34, 197, 94, 0.06)",
      slotBorder: "rgba(22, 163, 74, 0.2)",
    },
  },
  {
    name: "Gold",
    slots: 3,
    sponsors: [] as Sponsor[],
    colors: {
      bg: "linear-gradient(145deg, #d4a84b 0%, #f5d98a 30%, #c9952e 60%, #e8c55a 100%)",
      text: "#5c3d0e",
      border: "#c9952e",
      slotBg: "rgba(212, 168, 75, 0.08)",
      slotBorder: "rgba(201, 149, 46, 0.25)",
    },
  },
  {
    name: "Silver",
    slots: 3,
    sponsors: [] as Sponsor[],
    colors: {
      bg: "linear-gradient(145deg, #a8a8a8 0%, #d4d4d4 30%, #8a8a8a 60%, #c0c0c0 100%)",
      text: "#2a2a2a",
      border: "#8a8a8a",
      slotBg: "rgba(168, 168, 168, 0.06)",
      slotBorder: "rgba(138, 138, 138, 0.2)",
    },
  },
  {
    name: "Bronze",
    slots: 4,
    sponsors: [] as Sponsor[],
    colors: {
      bg: "linear-gradient(145deg, #b5745a 0%, #d4956e 30%, #8c5a3e 60%, #c98a68 100%)",
      text: "#3d1e0e",
      border: "#8c5a3e",
      slotBg: "rgba(181, 116, 90, 0.06)",
      slotBorder: "rgba(140, 90, 62, 0.2)",
    },
  },
]

export default async function SponsorPage() {
  const stargazers = await getStargazers()

  return (
    <SiteShell>
      <main className="min-w-0 flex-1 flex items-start justify-center">
        <div
          className="hidden w-4 shrink-0 self-stretch border-l border-dashed border-border md:block"
          style={{
            background:
              "repeating-linear-gradient(45deg, transparent, transparent 2px, color-mix(in oklab, var(--color-border) 60%, transparent) 2px, color-mix(in oklab, var(--color-border) 60%, transparent) 3.5px), var(--background)",
          }}
        />

        <div className="flex w-full max-w-3xl flex-col border-x border-dashed border-border bg-background">
          {/* Hero */}
          <section className="flex flex-col gap-6 border-b px-6 py-14 sm:px-10">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <Heart className="size-3.5" />
                Sponsor
              </div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                I&apos;ll never charge, but if you want to help
              </h1>
              <p className="max-w-xl text-base leading-relaxed text-muted-foreground">
                shieldcn is an open source badge service built on the shadcn/ui
                design language. Every badge endpoint is free and that&apos;s not
                changing.
              </p>
              <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
                I&apos;m not going to paywall features or gate badge types behind
                a sponsorship tier. But if shieldcn made your README look
                better, or you just like that this exists in the open,
                sponsoring is a nice way to say so. It helps me justify spending
                real time on it instead of treating it like a side-of-desk thing.
              </p>
              <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
                Any amount is genuinely appreciated. And if money&apos;s not your
                thing, starring the repo or sharing a badge you liked works too.
              </p>
            </div>

            <a
              href={GITHUB_SPONSORS_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button size="lg" className="gap-2">
                <Heart className="size-4" />
                Sponsor on GitHub
                <ExternalLink className="size-3.5 opacity-60" />
              </Button>
            </a>
          </section>

          {/* Sponsor tiers */}
          <section className="flex flex-col">
            {tiers.map((tier) => {
              const filled = tier.sponsors.length
              const empty = tier.slots - filled

              return (
                <div key={tier.name} className="flex flex-col gap-3 border-b px-6 py-6 sm:px-10">
                  <div
                    className="relative flex items-center justify-center rounded-md px-8 py-2.5"
                    style={{
                      background: tier.colors.bg,
                      boxShadow: "inset 0 1px 1px rgba(255,255,255,0.35), inset 0 -1px 2px rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.12)",
                    }}
                  >
                    {["left-2.5 top-1/2 -translate-y-1/2", "right-2.5 top-1/2 -translate-y-1/2"].map((pos) => (
                      <span
                        key={pos}
                        className={`absolute size-2 rounded-full ${pos}`}
                        style={{
                          background: `radial-gradient(circle at 35% 35%, rgba(255,255,255,0.5), transparent 50%), ${tier.colors.bg}`,
                          boxShadow: "inset 0 1px 2px rgba(0,0,0,0.3), inset 0 -1px 1px rgba(255,255,255,0.2), 0 1px 1px rgba(255,255,255,0.15)",
                          border: "1px solid rgba(0,0,0,0.15)",
                        }}
                      />
                    ))}
                    <h3
                      className="text-xs font-extrabold uppercase tracking-[0.2em]"
                      style={{ color: tier.colors.text }}
                    >
                      {tier.name}
                    </h3>
                  </div>

                  <div
                    className="grid gap-2"
                    style={{ gridTemplateColumns: `repeat(${Math.min(tier.slots, 4)}, 1fr)` }}
                  >
                    {tier.sponsors.map((sponsor) => (
                      <a
                        key={sponsor.name}
                        href={sponsor.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center justify-center rounded-md border p-6 transition-all hover:scale-[1.02]"
                        style={{ backgroundColor: tier.colors.slotBg, borderColor: tier.colors.slotBorder }}
                      >
                        {sponsor.logoComponent ? (
                          <div className="text-foreground/70 transition-colors group-hover:text-foreground">
                            {sponsor.logoComponent}
                          </div>
                        ) : sponsor.logo ? (
                          <Image
                            src={sponsor.logo}
                            alt={sponsor.name}
                            width={120}
                            height={32}
                            className="h-8 w-auto opacity-60 transition-opacity group-hover:opacity-100"
                            unoptimized
                          />
                        ) : (
                          <span className="text-sm font-medium text-foreground">{sponsor.name}</span>
                        )}
                      </a>
                    ))}

                    {Array.from({ length: empty }).map((_, i) => (
                      <a
                        key={`empty-${tier.name}-${i}`}
                        href={GITHUB_SPONSORS_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center rounded-md border border-dashed p-8 transition-all hover:scale-[1.02]"
                        style={{ borderColor: tier.colors.slotBorder }}
                      >
                        <Plus className="size-5" style={{ color: tier.colors.border, opacity: 0.5 }} />
                      </a>
                    ))}
                  </div>
                </div>
              )
            })}
          </section>

          {/* Stargazers */}
          {stargazers.length > 0 && (
            <section className="flex flex-col border-b">
              <div className="flex items-center gap-3 px-6 py-3 sm:px-10">
                <h3 className="text-xs font-bold uppercase tracking-wide text-foreground">
                  Stargazers
                </h3>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {stargazers.length}
                </span>
              </div>

              <div className="flex flex-wrap justify-center gap-0 border-t py-4">
                {stargazers.map((user) => (
                  <a
                    key={user.login}
                    href={`https://github.com/${user.login}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={user.login}
                    className="group relative p-1.5 transition-colors hover:bg-accent/50"
                  >
                    <Image
                      src={user.avatar_url}
                      alt={user.login}
                      width={36}
                      height={36}
                      className="rounded-full ring-1 ring-border transition-all group-hover:ring-foreground/30 group-hover:scale-110"
                      unoptimized
                    />
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* CTA */}
          <section className="flex flex-col items-center gap-5 px-6 py-14 sm:px-10">
            <div className="flex flex-col items-center gap-2 text-center">
              <h2 className="text-lg font-bold tracking-tight">
                Want to support the project?
              </h2>
              <p className="max-w-sm text-sm text-muted-foreground">
                Every bit helps — whether it&apos;s a sponsorship, a star, or sharing
                something you found useful.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <a href={GITHUB_SPONSORS_URL} target="_blank" rel="noopener noreferrer">
                <Button size="default" className="gap-2">
                  <Heart className="size-4" />
                  Become a Sponsor
                </Button>
              </a>
              <a href="https://github.com/jal-co/shieldcn" target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="default" className="gap-2">
                  <Star className="size-4" />
                  Star on GitHub
                </Button>
              </a>
            </div>
          </section>
        </div>

        <div
          className="hidden w-4 shrink-0 self-stretch border-r border-dashed border-border md:block"
          style={{
            background:
              "repeating-linear-gradient(45deg, transparent, transparent 2px, color-mix(in oklab, var(--color-border) 60%, transparent) 2px, color-mix(in oklab, var(--color-border) 60%, transparent) 3.5px), var(--background)",
          }}
        />
      </main>
    </SiteShell>
  )
}
