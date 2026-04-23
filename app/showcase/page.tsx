import type { Metadata } from "next"
import { SiteShell } from "@/components/site-shell"

export const metadata: Metadata = {
  title: "Showcase — shieldcn",
  description: "See every badge variant, size, theme, and icon in action.",
}

function B({ src, alt }: { src: string; alt?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt || "badge"} className="inline-block" />
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  )
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  )
}

export default function ShowcasePage() {
  const base = ""

  return (
    <SiteShell>
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-4xl px-6 py-14 md:px-10 space-y-12">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Showcase</h1>
            <p className="text-muted-foreground">Every badge variant, size, theme, and icon — live from the API.</p>
          </div>

          {/* Variants */}
          <Section title="Variants">
            <B src={`${base}/npm/react.svg`} alt="default" />
            <B src={`${base}/npm/react.svg?variant=secondary`} alt="secondary" />
            <B src={`${base}/npm/react.svg?variant=outline`} alt="outline" />
            <B src={`${base}/npm/react.svg?variant=ghost`} alt="ghost" />
            <B src={`${base}/npm/react.svg?variant=destructive`} alt="destructive" />
          </Section>

          {/* Sizes */}
          <Section title="Sizes">
            <B src={`${base}/npm/react.svg?size=xs`} alt="xs" />
            <B src={`${base}/npm/react.svg?size=sm`} alt="sm" />
            <B src={`${base}/npm/react.svg?size=default`} alt="default" />
            <B src={`${base}/npm/react.svg?size=lg`} alt="lg" />
          </Section>

          {/* Themes */}
          <Section title="Color Themes">
            <B src={`${base}/npm/react.svg?theme=zinc`} />
            <B src={`${base}/npm/react.svg?theme=slate`} />
            <B src={`${base}/npm/react.svg?theme=blue`} />
            <B src={`${base}/npm/react.svg?theme=green`} />
            <B src={`${base}/npm/react.svg?theme=rose`} />
            <B src={`${base}/npm/react.svg?theme=orange`} />
            <B src={`${base}/npm/react.svg?theme=violet`} />
            <B src={`${base}/npm/react.svg?theme=purple`} />
            <B src={`${base}/npm/react.svg?theme=cyan`} />
            <B src={`${base}/npm/react.svg?theme=emerald`} />
          </Section>

          {/* Light mode */}
          <Section title="Light Mode">
            <B src={`${base}/npm/react.svg?mode=light`} />
            <B src={`${base}/npm/react.svg?mode=light&variant=secondary`} />
            <B src={`${base}/npm/react.svg?mode=light&variant=outline`} />
            <B src={`${base}/npm/react.svg?mode=light&variant=ghost`} />
            <B src={`${base}/npm/react.svg?mode=light&variant=destructive`} />
          </Section>

          {/* GitHub badges */}
          <Section title="GitHub — Repository">
            <B src={`${base}/github/stars/vercel/next.js.svg`} />
            <B src={`${base}/github/forks/vercel/next.js.svg`} />
            <B src={`${base}/github/watchers/vercel/next.js.svg`} />
            <B src={`${base}/github/license/vercel/next.js.svg`} />
            <B src={`${base}/github/branches/vercel/next.js.svg`} />
            <B src={`${base}/github/contributors/vercel/next.js.svg`} />
          </Section>

          <Section title="GitHub — Releases & Tags">
            <B src={`${base}/github/release/vercel/next.js.svg`} />
            <B src={`${base}/github/releases/vercel/next.js.svg`} />
            <B src={`${base}/github/tags/vercel/next.js.svg`} />
            <B src={`${base}/github/tag/vercel/next.js.svg`} />
          </Section>

          <Section title="GitHub — CI & Checks">
            <B src={`${base}/github/ci/vercel/next.js.svg`} />
            <B src={`${base}/github/ci/vercel/next.js.svg?split=true`} />
            <B src={`${base}/github/ci/vercel/next.js.svg?variant=secondary`} />
          </Section>

          <Section title="GitHub — Issues & PRs">
            <B src={`${base}/github/issues/vercel/next.js.svg`} />
            <B src={`${base}/github/open-issues/vercel/next.js.svg`} />
            <B src={`${base}/github/open-prs/vercel/next.js.svg`} />
            <B src={`${base}/github/merged-prs/vercel/next.js.svg`} />
          </Section>

          <Section title="GitHub — Commits">
            <B src={`${base}/github/last-commit/vercel/next.js.svg`} />
            <B src={`${base}/github/commits/vercel/next.js.svg`} />
          </Section>

          {/* npm */}
          <Section title="npm">
            <B src={`${base}/npm/react.svg`} />
            <B src={`${base}/npm/next.svg`} />
            <B src={`${base}/npm/typescript.svg`} />
            <B src={`${base}/npm/tailwindcss.svg`} />
            <B src={`${base}/npm/@types/react.svg`} />
            <B src={`${base}/npm/react/downloads.svg`} />
          </Section>

          {/* Discord */}
          <Section title="Discord">
            <B src={`${base}/discord/1316199667142496307.svg`} />
            <B src={`${base}/discord/1316199667142496307.svg?variant=secondary`} />
            <B src={`${base}/discord/1316199667142496307.svg?color=5865F2`} />
          </Section>

          {/* Static badges */}
          <Section title="Static Badges">
            <B src={`${base}/badge/build-passing-green.svg`} />
            <B src={`${base}/badge/coverage-95%25-blue.svg`} />
            <B src={`${base}/badge/version-2.0-violet.svg`} />
            <B src={`${base}/badge/status-active-brightgreen.svg`} />
            <B src={`${base}/badge/license-MIT-green.svg`} />
            <B src={`${base}/badge/PRs-welcome-brightgreen.svg`} />
            <B src={`${base}/badge/node-%3E%3D18-green.svg`} />
            <B src={`${base}/badge/maintained-yes-green.svg`} />
            <B src={`${base}/badge/platform-linux%20%7C%20macos%20%7C%20windows-blue.svg`} />
            <B src={`${base}/badge/made_with-love-red.svg`} />
          </Section>

          {/* Split mode */}
          <Section title="Split Mode">
            <B src={`${base}/badge/build-passing-green.svg?split=true`} />
            <B src={`${base}/badge/tests-failing-red.svg?split=true`} />
            <B src={`${base}/badge/coverage-87%25-blue.svg?split=true`} />
            <B src={`${base}/badge/version-3.1.0-violet.svg?split=true`} />
            <B src={`${base}/npm/react.svg?split=true&logo=false`} />
          </Section>

          {/* SimpleIcons logos */}
          <Section title="SimpleIcons Logos">
            <SubSection title="Languages">
              <B src={`${base}/badge/TypeScript-5.7-blue.svg?logo=typescript`} />
              <B src={`${base}/badge/JavaScript-ES2024-yellow.svg?logo=javascript`} />
              <B src={`${base}/badge/Python-3.12-blue.svg?logo=python`} />
              <B src={`${base}/badge/Rust-1.78-orange.svg?logo=rust`} />
              <B src={`${base}/badge/Go-1.22-blue.svg?logo=go`} />
              <B src={`${base}/badge/Swift-5.10-orange.svg?logo=swift`} />
            </SubSection>
            <SubSection title="Frameworks">
              <B src={`${base}/badge/React-19-blue.svg?logo=react`} />
              <B src={`${base}/badge/Next.js-16-blue.svg?logo=nextdotjs`} />
              <B src={`${base}/badge/Vue-3.5-green.svg?logo=vuedotjs`} />
              <B src={`${base}/badge/Svelte-5-orange.svg?logo=svelte`} />
              <B src={`${base}/badge/Nuxt-3.14-green.svg?logo=nuxtdotjs`} />
              <B src={`${base}/badge/Angular-19-red.svg?logo=angular`} />
            </SubSection>
            <SubSection title="Tools">
              <B src={`${base}/badge/Docker-latest-blue.svg?logo=docker`} />
              <B src={`${base}/badge/Kubernetes-1.31-blue.svg?logo=kubernetes`} />
              <B src={`${base}/badge/Vercel-deployed-blue.svg?logo=vercel`} />
              <B src={`${base}/badge/Railway-live-violet.svg?logo=railway`} />
              <B src={`${base}/badge/Tailwind-4.0-blue.svg?logo=tailwindcss`} />
              <B src={`${base}/badge/PostgreSQL-17-blue.svg?logo=postgresql`} />
            </SubSection>
            <SubSection title="Platforms">
              <B src={`${base}/badge/npm-registry-red.svg?logo=npm`} />
              <B src={`${base}/badge/GitHub-repo-blue.svg?logo=github`} />
              <B src={`${base}/badge/Discord-server-violet.svg?logo=discord`} />
              <B src={`${base}/badge/Slack-workspace-purple.svg?logo=slack`} />
              <B src={`${base}/badge/Reddit-community-orange.svg?logo=reddit`} />
            </SubSection>
          </Section>

          {/* Lucide icons */}
          <Section title="Lucide Icons">
            <B src={`${base}/badge/stars-42-blue.svg?logo=lucide:star`} />
            <B src={`${base}/badge/love-react-rose.svg?logo=lucide:heart`} />
            <B src={`${base}/badge/secure-yes-green.svg?logo=lucide:shield`} />
            <B src={`${base}/badge/fast-10ms-blue.svg?logo=lucide:zap`} />
            <B src={`${base}/badge/downloads-1.2M-green.svg?logo=lucide:download`} />
            <B src={`${base}/badge/docs-read_more-blue.svg?logo=lucide:book-open`} />
            <B src={`${base}/badge/code-open_source-green.svg?logo=lucide:code`} />
            <B src={`${base}/badge/deploy-success-green.svg?logo=lucide:rocket`} />
          </Section>

          {/* React Icons */}
          <Section title="React Icons">
            <B src={`${base}/badge/React-component-blue.svg?logo=ri:FaReact`} />
            <B src={`${base}/badge/GitHub-source-blue.svg?logo=ri:FaGithub`} />
            <B src={`${base}/badge/Home-page-blue.svg?logo=ri:MdHome`} />
            <B src={`${base}/badge/Lightning-fast-yellow.svg?logo=ri:BsLightningFill`} />
            <B src={`${base}/badge/TypeScript-strict-blue.svg?logo=ri:SiTypescript`} />
          </Section>

          {/* Themed variants combined */}
          <Section title="Theme × Variant Combinations">
            <SubSection title="Blue theme">
              <B src={`${base}/npm/react.svg?theme=blue`} />
              <B src={`${base}/npm/react.svg?theme=blue&variant=secondary`} />
              <B src={`${base}/npm/react.svg?theme=blue&variant=outline`} />
              <B src={`${base}/npm/react.svg?theme=blue&variant=ghost`} />
            </SubSection>
            <SubSection title="Green theme">
              <B src={`${base}/npm/react.svg?theme=green`} />
              <B src={`${base}/npm/react.svg?theme=green&variant=secondary`} />
              <B src={`${base}/npm/react.svg?theme=green&variant=outline`} />
              <B src={`${base}/npm/react.svg?theme=green&variant=ghost`} />
            </SubSection>
            <SubSection title="Rose theme">
              <B src={`${base}/npm/react.svg?theme=rose`} />
              <B src={`${base}/npm/react.svg?theme=rose&variant=secondary`} />
              <B src={`${base}/npm/react.svg?theme=rose&variant=outline`} />
              <B src={`${base}/npm/react.svg?theme=rose&variant=ghost`} />
            </SubSection>
          </Section>

          {/* Real-world README examples */}
          <Section title="Real-World README Examples">
            <SubSection title="Project status row">
              <B src={`${base}/badge/build-passing-green.svg`} />
              <B src={`${base}/badge/coverage-97%25-green.svg`} />
              <B src={`${base}/badge/license-MIT-blue.svg`} />
              <B src={`${base}/npm/react.svg`} />
              <B src={`${base}/badge/PRs-welcome-brightgreen.svg`} />
            </SubSection>
            <SubSection title="Tech stack row">
              <B src={`${base}/badge/React-19-blue.svg?logo=react&variant=secondary`} />
              <B src={`${base}/badge/TypeScript-5.7-blue.svg?logo=typescript&variant=secondary`} />
              <B src={`${base}/badge/Tailwind-4.0-blue.svg?logo=tailwindcss&variant=secondary`} />
              <B src={`${base}/badge/Next.js-16-blue.svg?logo=nextdotjs&variant=secondary`} />
            </SubSection>
            <SubSection title="Social row">
              <B src={`${base}/github/stars/vercel/next.js.svg?variant=outline`} />
              <B src={`${base}/github/forks/vercel/next.js.svg?variant=outline`} />
              <B src={`${base}/discord/1316199667142496307.svg?variant=outline`} />
            </SubSection>
          </Section>

          {/* shields.io comparison */}
          <div className="flex flex-col gap-6">
            <h2 className="text-lg font-semibold tracking-tight">shields.io vs shieldcn</h2>
            <p className="text-sm text-muted-foreground">Same data, different look. Left is shields.io, right is shieldcn.</p>

            <div className="flex flex-col gap-6">
              {[
                {
                  label: "npm version",
                  shields: "https://img.shields.io/npm/v/react",
                  shieldcn: "/npm/react.svg",
                },
                {
                  label: "npm downloads",
                  shields: "https://img.shields.io/npm/dw/react",
                  shieldcn: "/npm/react/downloads.svg",
                },
                {
                  label: "GitHub stars",
                  shields: "https://img.shields.io/github/stars/vercel/next.js",
                  shieldcn: "/github/stars/vercel/next.js.svg",
                },
                {
                  label: "GitHub forks",
                  shields: "https://img.shields.io/github/forks/vercel/next.js",
                  shieldcn: "/github/forks/vercel/next.js.svg",
                },
                {
                  label: "GitHub license",
                  shields: "https://img.shields.io/github/license/vercel/next.js",
                  shieldcn: "/github/license/vercel/next.js.svg",
                },
                {
                  label: "GitHub release",
                  shields: "https://img.shields.io/github/v/release/vercel/next.js",
                  shieldcn: "/github/release/vercel/next.js.svg",
                },
                {
                  label: "GitHub issues",
                  shields: "https://img.shields.io/github/issues/vercel/next.js",
                  shieldcn: "/github/issues/vercel/next.js.svg",
                },
                {
                  label: "GitHub PRs",
                  shields: "https://img.shields.io/github/issues-pr/vercel/next.js",
                  shieldcn: "/github/open-prs/vercel/next.js.svg",
                },
                {
                  label: "GitHub last commit",
                  shields: "https://img.shields.io/github/last-commit/vercel/next.js",
                  shieldcn: "/github/last-commit/vercel/next.js.svg",
                },
                {
                  label: "GitHub contributors",
                  shields: "https://img.shields.io/github/contributors/vercel/next.js",
                  shieldcn: "/github/contributors/vercel/next.js.svg",
                },
                {
                  label: "Static badge",
                  shields: "https://img.shields.io/badge/build-passing-brightgreen",
                  shieldcn: "/badge/build-passing-brightgreen.svg",
                },
                {
                  label: "Static (custom color)",
                  shields: "https://img.shields.io/badge/coverage-95%25-blue",
                  shieldcn: "/badge/coverage-95%25-blue.svg",
                },
                {
                  label: "Static with logo",
                  shields: "https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript",
                  shieldcn: "/badge/TypeScript-5.7-blue.svg?logo=typescript",
                },
              ].map((row) => (
                <div key={row.label} className="flex flex-col gap-1.5">
                  <span className="text-xs text-muted-foreground">{row.label}</span>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 min-w-[140px]">
                      <span className="text-[10px] font-mono text-muted-foreground w-16 shrink-0">shields.io</span>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={row.shields} alt={`shields.io ${row.label}`} className="inline-block" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-muted-foreground w-16 shrink-0">shieldcn</span>
                      <B src={`${base}${row.shieldcn}`} alt={`shieldcn ${row.label}`} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Variant comparison */}
          <div className="flex flex-col gap-6">
            <h2 className="text-lg font-semibold tracking-tight">shields.io styles vs shieldcn variants</h2>
            <p className="text-sm text-muted-foreground">shields.io has flat/plastic/for-the-badge. shieldcn has shadcn Button variants.</p>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-muted-foreground">shields.io styles</span>
                <div className="flex flex-wrap items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="https://img.shields.io/badge/build-passing-brightgreen?style=flat" alt="flat" className="inline-block" />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="https://img.shields.io/badge/build-passing-brightgreen?style=flat-square" alt="flat-square" className="inline-block" />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="https://img.shields.io/badge/build-passing-brightgreen?style=plastic" alt="plastic" className="inline-block" />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="https://img.shields.io/badge/build-passing-brightgreen?style=for-the-badge" alt="for-the-badge" className="inline-block" />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="https://img.shields.io/badge/build-passing-brightgreen?style=social" alt="social" className="inline-block" />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-muted-foreground">shieldcn variants</span>
                <div className="flex flex-wrap items-center gap-2">
                  <B src={`${base}/badge/build-passing-brightgreen.svg`} />
                  <B src={`${base}/badge/build-passing-brightgreen.svg?variant=secondary`} />
                  <B src={`${base}/badge/build-passing-brightgreen.svg?variant=outline`} />
                  <B src={`${base}/badge/build-passing-brightgreen.svg?variant=ghost`} />
                  <B src={`${base}/badge/build-passing-brightgreen.svg?variant=destructive`} />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-muted-foreground">shields.io sizes (limited)</span>
                <div className="flex flex-wrap items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="https://img.shields.io/badge/build-passing-blue?style=flat" alt="flat" className="inline-block" />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="https://img.shields.io/badge/build-passing-blue?style=for-the-badge" alt="for-the-badge" className="inline-block" />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-muted-foreground">shieldcn sizes (shadcn Button sizes)</span>
                <div className="flex flex-wrap items-center gap-2">
                  <B src={`${base}/badge/build-passing-blue.svg?size=xs`} />
                  <B src={`${base}/badge/build-passing-blue.svg?size=sm`} />
                  <B src={`${base}/badge/build-passing-blue.svg?size=default`} />
                  <B src={`${base}/badge/build-passing-blue.svg?size=lg`} />
                </div>
              </div>
            </div>
          </div>

          {/* Custom colors */}
          <Section title="Custom Colors">
            <B src={`${base}/badge/brand-shieldcn-8A2BE2.svg`} />
            <B src={`${base}/badge/custom-ff6600-ff6600.svg`} />
            <B src={`${base}/badge/hex-00bcd4-00bcd4.svg`} />
            <B src={`${base}/badge/gradient-ff1493-ff1493.svg`} />
            <B src={`${base}/badge/neon-39ff14-39ff14.svg`} />
          </Section>
        </div>
      </main>
    </SiteShell>
  )
}
