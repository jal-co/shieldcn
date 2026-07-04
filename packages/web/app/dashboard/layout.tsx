/**
 * shieldcn
 * app/dashboard/layout.tsx
 *
 * The dashboard shell — a collapsible sidebar (workspace switcher + nav + user)
 * with a top bar carrying the sidebar toggle, the shieldcn wordmark, and the
 * theme switcher. All /dashboard/* routes render inside SidebarInset; the pages
 * themselves are plain content (no SiteShell), so there's one chrome, not two.
 */

import Link from "next/link"
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar"
import { ShieldcnLogo } from "@/components/shieldcn-logo"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

// Every dashboard route reads the session cookie (getSession), so the whole
// subtree is dynamic — declare it up front instead of letting Next discover it
// per-page during the static-generation probe.
export const dynamic = "force-dynamic"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <DashboardSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background/80 px-4 backdrop-blur-sm">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-1 h-4" />
          <Link
            href="/"
            className="flex items-center gap-2 rounded-md text-sm font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <ShieldcnLogo className="h-6 w-auto" />
            <span className="font-heading">shieldcn</span>
          </Link>
          <div className="ml-auto flex items-center gap-1.5">
            <ThemeSwitcher />
          </div>
        </header>
        <div className="min-w-0 flex-1">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
