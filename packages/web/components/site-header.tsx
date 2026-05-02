import Link from "next/link"
import { Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { MobileNav } from "@/components/mobile-nav"
import { ShieldcnLogo } from "@/components/shieldcn-logo"
import { GitHubStarsButton } from "@/components/github-stars-button"
import { HeaderGitHubButton } from "@/components/header-github-button"

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur-sm sm:px-6">
      <MobileNav />

      <Link
        href="/"
        className="flex items-center gap-2 rounded-md text-sm font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <ShieldcnLogo className="h-8 w-auto" />
        <span className="hidden sm:inline">shieldcn</span>
      </Link>

      <nav className="ml-4 hidden items-center gap-1 text-sm md:flex">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/docs">Docs</Link>
        </Button>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/showcase">Showcase</Link>
        </Button>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/gen">
            Generator
          </Link>
        </Button>

      </nav>

      <div className="ml-auto flex items-center gap-1.5">
        <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
          <Link href="/sponsor">
            <Heart className="size-3.5" />
            Sponsor
          </Link>
        </Button>
        <HeaderGitHubButton className="shrink-0">
          <GitHubStarsButton
            owner="jal-co"
            repo="shieldcn"
            variant="primary"
            size="sm"
            showRepo
          />
        </HeaderGitHubButton>
        <ThemeSwitcher />
      </div>
    </header>
  )
}
