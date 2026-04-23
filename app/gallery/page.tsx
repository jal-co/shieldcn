import type { Metadata } from "next"
import { SiteShell } from "@/components/site-shell"

export const metadata: Metadata = {
  title: "Badge Gallery — shieldcn",
  description: "100+ branded badges using SimpleIcons. Copy-paste ready for your README.",
}

function B({ slug, title, hex }: { slug: string; title: string; hex: string }) {
  const isDark = parseInt(hex, 16) < 0x808080
  const logoColor = isDark ? "fff" : "000"
  const src = `/badge/${encodeURIComponent(title)}-${hex}.svg?logo=${slug}&logoColor=${logoColor}`

  return (
    <div className="group flex flex-col items-center gap-1.5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={title} className="inline-block" />
      <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity font-mono">
        {slug}
      </span>
    </div>
  )
}

interface IconDef {
  slug: string
  title: string
  hex: string
}

const categories: { name: string; icons: IconDef[] }[] = [
  {
    name: "Languages",
    icons: [
      { slug: "typescript", title: "TypeScript", hex: "3178C6" },
      { slug: "javascript", title: "JavaScript", hex: "F7DF1E" },
      { slug: "python", title: "Python", hex: "3776AB" },
      { slug: "rust", title: "Rust", hex: "000000" },
      { slug: "go", title: "Go", hex: "00ADD8" },
      { slug: "swift", title: "Swift", hex: "F05138" },
      { slug: "kotlin", title: "Kotlin", hex: "7F52FF" },
      { slug: "dart", title: "Dart", hex: "0175C2" },
      { slug: "ruby", title: "Ruby", hex: "CC342D" },
      { slug: "php", title: "PHP", hex: "777BB4" },
      { slug: "cplusplus", title: "C++", hex: "00599C" },
      { slug: "csharp", title: "C Sharp", hex: "512BD4" },
      { slug: "lua", title: "Lua", hex: "2C2D72" },
      { slug: "haskell", title: "Haskell", hex: "5D4F85" },
      { slug: "elixir", title: "Elixir", hex: "4B275F" },
      { slug: "scala", title: "Scala", hex: "DC322F" },
      { slug: "r", title: "R", hex: "276DC3" },
      { slug: "julia", title: "Julia", hex: "9558B2" },
    ],
  },
  {
    name: "Frameworks",
    icons: [
      { slug: "react", title: "React", hex: "61DAFB" },
      { slug: "nextdotjs", title: "Next.js", hex: "000000" },
      { slug: "vuedotjs", title: "Vue.js", hex: "4FC08D" },
      { slug: "svelte", title: "Svelte", hex: "FF3E00" },
      { slug: "angular", title: "Angular", hex: "0F0F11" },
      { slug: "astro", title: "Astro", hex: "BC52EE" },
      { slug: "nuxtdotjs", title: "Nuxt", hex: "00DC82" },
      { slug: "remix", title: "Remix", hex: "000000" },
      { slug: "solidjs", title: "Solid", hex: "2C4F7C" },
      { slug: "express", title: "Express", hex: "000000" },
      { slug: "nestjs", title: "NestJS", hex: "E0234E" },
      { slug: "django", title: "Django", hex: "092E20" },
      { slug: "flask", title: "Flask", hex: "000000" },
      { slug: "fastapi", title: "FastAPI", hex: "009688" },
      { slug: "spring", title: "Spring", hex: "6DB33F" },
      { slug: "flutter", title: "Flutter", hex: "02569B" },
      { slug: "electron", title: "Electron", hex: "47848F" },
      { slug: "tauri", title: "Tauri", hex: "24C8D8" },
    ],
  },
  {
    name: "Runtimes & Package Managers",
    icons: [
      { slug: "nodedotjs", title: "Node.js", hex: "5FA04E" },
      { slug: "deno", title: "Deno", hex: "000000" },
      { slug: "bun", title: "Bun", hex: "000000" },
      { slug: "npm", title: "npm", hex: "CB3837" },
      { slug: "yarn", title: "Yarn", hex: "2C8EBB" },
      { slug: "pnpm", title: "pnpm", hex: "F69220" },
    ],
  },
  {
    name: "Styling",
    icons: [
      { slug: "tailwindcss", title: "Tailwind CSS", hex: "06B6D4" },
      { slug: "css3", title: "CSS3", hex: "1572B6" },
      { slug: "sass", title: "Sass", hex: "CC6699" },
      { slug: "styledcomponents", title: "styled-components", hex: "DB7093" },
      { slug: "shadcnui", title: "shadcn/ui", hex: "000000" },
    ],
  },
  {
    name: "Cloud & DevOps",
    icons: [
      { slug: "docker", title: "Docker", hex: "2496ED" },
      { slug: "kubernetes", title: "Kubernetes", hex: "326CE5" },
      { slug: "vercel", title: "Vercel", hex: "000000" },
      { slug: "netlify", title: "Netlify", hex: "00C7B7" },
      { slug: "railway", title: "Railway", hex: "0B0D0E" },
      { slug: "heroku", title: "Heroku", hex: "430098" },
      { slug: "amazonaws", title: "AWS", hex: "232F3E" },
      { slug: "googlecloud", title: "Google Cloud", hex: "4285F4" },
      { slug: "microsoftazure", title: "Azure", hex: "0078D4" },
      { slug: "cloudflare", title: "Cloudflare", hex: "F38020" },
      { slug: "digitalocean", title: "DigitalOcean", hex: "0080FF" },
      { slug: "githubactions", title: "GitHub Actions", hex: "2088FF" },
    ],
  },
  {
    name: "Databases",
    icons: [
      { slug: "postgresql", title: "PostgreSQL", hex: "4169E1" },
      { slug: "mysql", title: "MySQL", hex: "4479A1" },
      { slug: "mongodb", title: "MongoDB", hex: "47A248" },
      { slug: "redis", title: "Redis", hex: "FF4438" },
      { slug: "sqlite", title: "SQLite", hex: "003B57" },
      { slug: "supabase", title: "Supabase", hex: "3FCF8E" },
      { slug: "firebase", title: "Firebase", hex: "DD2C00" },
      { slug: "prisma", title: "Prisma", hex: "2D3748" },
      { slug: "drizzle", title: "Drizzle", hex: "C5F74F" },
    ],
  },
  {
    name: "Version Control",
    icons: [
      { slug: "git", title: "Git", hex: "F05032" },
      { slug: "github", title: "GitHub", hex: "181717" },
      { slug: "gitlab", title: "GitLab", hex: "FC6D26" },
      { slug: "bitbucket", title: "Bitbucket", hex: "0052CC" },
    ],
  },
  {
    name: "Testing & Build",
    icons: [
      { slug: "jest", title: "Jest", hex: "C21325" },
      { slug: "vitest", title: "Vitest", hex: "6E9F18" },
      { slug: "playwright", title: "Playwright", hex: "2EAD33" },
      { slug: "cypress", title: "Cypress", hex: "69D3A7" },
      { slug: "vite", title: "Vite", hex: "646CFF" },
      { slug: "webpack", title: "Webpack", hex: "8DD6F9" },
      { slug: "turborepo", title: "Turborepo", hex: "EF4444" },
      { slug: "esbuild", title: "esbuild", hex: "FFCF00" },
      { slug: "rollup", title: "Rollup", hex: "EC4A3F" },
    ],
  },
  {
    name: "Editors & IDEs",
    icons: [
      { slug: "visualstudiocode", title: "VS Code", hex: "007ACC" },
      { slug: "neovim", title: "Neovim", hex: "57A143" },
      { slug: "intellijidea", title: "IntelliJ IDEA", hex: "000000" },
      { slug: "xcode", title: "Xcode", hex: "147EFB" },
      { slug: "cursor", title: "Cursor", hex: "000000" },
    ],
  },
  {
    name: "Platforms",
    icons: [
      { slug: "linux", title: "Linux", hex: "FCC624" },
      { slug: "apple", title: "Apple", hex: "000000" },
      { slug: "windows", title: "Windows", hex: "0078D4" },
      { slug: "android", title: "Android", hex: "34A853" },
      { slug: "ios", title: "iOS", hex: "000000" },
    ],
  },
  {
    name: "Social & Communication",
    icons: [
      { slug: "discord", title: "Discord", hex: "5865F2" },
      { slug: "slack", title: "Slack", hex: "4A154B" },
      { slug: "twitter", title: "Twitter", hex: "1DA1F2" },
      { slug: "bluesky", title: "Bluesky", hex: "0285FF" },
      { slug: "reddit", title: "Reddit", hex: "FF4500" },
      { slug: "mastodon", title: "Mastodon", hex: "6364FF" },
      { slug: "telegram", title: "Telegram", hex: "26A5E4" },
      { slug: "linkedin", title: "LinkedIn", hex: "0A66C2" },
      { slug: "youtube", title: "YouTube", hex: "FF0000" },
      { slug: "twitch", title: "Twitch", hex: "9146FF" },
    ],
  },
  {
    name: "AI",
    icons: [
      { slug: "openai", title: "OpenAI", hex: "412991" },
      { slug: "anthropic", title: "Anthropic", hex: "191919" },
      { slug: "huggingface", title: "Hugging Face", hex: "FFD21E" },
      { slug: "ollama", title: "Ollama", hex: "000000" },
    ],
  },
  {
    name: "Payments & Commerce",
    icons: [
      { slug: "stripe", title: "Stripe", hex: "635BFF" },
      { slug: "shopify", title: "Shopify", hex: "7AB55C" },
      { slug: "paypal", title: "PayPal", hex: "003087" },
    ],
  },
]

export default function GalleryPage() {
  return (
    <SiteShell>
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-5xl px-6 py-14 md:px-10 space-y-10">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Badge Gallery</h1>
            <p className="text-muted-foreground">
              Branded badges using{" "}
              <a href="https://simpleicons.org" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">Simple Icons</a>
              . Hover for the slug. All badges are live from the API.
            </p>
            <p className="text-xs text-muted-foreground">
              Inspired by{" "}
              <a href="https://badges.pages.dev" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">badges.pages.dev</a>
              . Use any of 3,400+ Simple Icons slugs with <code className="bg-muted px-1 rounded text-[11px]">?logo=slug</code>.
            </p>
          </div>

          {categories.map((cat) => (
            <div key={cat.name} className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{cat.name}</h2>
              <div className="flex flex-wrap gap-3">
                {cat.icons.map((icon) => (
                  <B key={icon.slug} {...icon} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    </SiteShell>
  )
}
