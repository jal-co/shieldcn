"use client"

/**
 * shieldcn
 * components/dashboard/dashboard-topbar.tsx
 *
 * Dashboard header for the inset shell: sidebar toggle, route breadcrumb, theme
 * switcher, and sign-out. Kept client-side so route state and auth actions stay
 * local to the shell while pages remain server-rendered.
 */

import { useMemo } from "react"
import { usePathname, useRouter } from "next/navigation"
import { ChevronRight, LogOut } from "lucide-react"
import { authClient } from "@/lib/auth/client"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

const ROUTE_LABELS: Record<string, string> = {
  "/dashboard": "Overview",
  "/dashboard/brands": "Brands",
  "/dashboard/brands/new": "New brand",
  "/dashboard/admin": "Admin",
}

function titleFromSegment(segment: string) {
  return segment
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function breadcrumbs(pathname: string) {
  if (ROUTE_LABELS[pathname]) return ["Workspace", ROUTE_LABELS[pathname]]
  const segments = pathname.split("/").filter(Boolean).slice(1)
  return ["Workspace", ...segments.map(titleFromSegment)]
}

export function DashboardTopbar() {
  const pathname = usePathname()
  const router = useRouter()
  const items = useMemo(() => breadcrumbs(pathname), [pathname])

  async function onSignOut() {
    await authClient.signOut()
    router.push("/")
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-20 flex h-(--header-height) shrink-0 items-center gap-3 border-b border-border/70 bg-background/80 px-3 backdrop-blur-md sm:px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="h-4" />
      <nav aria-label="Dashboard breadcrumb" className="min-w-0">
        <ol className="flex min-w-0 items-center gap-2 text-sm">
          {items.map((item, index) => {
            const current = index === items.length - 1
            return (
              <li key={`${item}-${index}`} className="flex min-w-0 items-center gap-2">
                {index > 0 && <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
                <span
                  className={current ? "truncate font-medium text-foreground" : "truncate text-muted-foreground"}
                  aria-current={current ? "page" : undefined}
                >
                  {item}
                </span>
              </li>
            )
          })}
        </ol>
      </nav>
      <div className="ml-auto flex items-center gap-2">
        <ThemeSwitcher />
        <Button size="sm" variant="outline" onClick={onSignOut} className="gap-1.5">
          <LogOut className="size-3.5" />
          <span className="hidden sm:inline">Log out</span>
        </Button>
      </div>
    </header>
  )
}
