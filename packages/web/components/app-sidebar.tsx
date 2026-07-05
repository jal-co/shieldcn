"use client"

/**
 * shieldcn
 * components/app-sidebar.tsx
 *
 * The admin dashboard's left rail (dashboard-01 composition): shieldcn
 * identity, brand-management navigation, support links, and the signed-in
 * admin footer. Built on the shadcn sidebar primitive and styled with
 * semantic tokens only. Rendered by the dashboard layout as `<AppSidebar />`.
 *
 * Motion: the active nav row is marked by a single shared-layout pill
 * (layoutId "sidebar-active") that springs between rows on navigation, so the
 * selection reads as one object moving rather than two states toggling.
 */

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { motion, useReducedMotion, type Transition } from "motion/react"
import {
  ChevronsUpDown,
  CircleHelp,
  LayoutDashboard,
  LogOut,
  type LucideIcon,
  MessageCircle,
  Palette,
  ShieldAlert,
} from "lucide-react"
import { authClient } from "@/lib/auth/client"
import { ShieldcnLogo } from "@/components/shieldcn-logo"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

/* ─────────────────────────────────────────────────────────
 * MOTION
 * The active-row pill springs between nav items on route change.
 * ───────────────────────────────────────────────────────── */
const ACTIVE_PILL: Transition = {
  type: "spring",
  stiffness: 480,
  damping: 38,
  mass: 0.7,
}

type NavItem = {
  href: string
  label: string
  icon: LucideIcon
  exact?: boolean
}

const WORKSPACE_NAV: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/brands", label: "Brands", icon: Palette },
  { href: "/dashboard/admin", label: "Admin", icon: ShieldAlert },
]

function initials(s: string): string {
  const b = s.trim()
  if (!b) return "?"
  const p = b.split(/\s+/)
  return (p.length >= 2 ? p[0][0] + p[1][0] : b.slice(0, 2)).toUpperCase()
}

/** A nav row whose active state is a shared-layout pill that slides between rows. */
function NavRow({
  item,
  active,
  reduce,
}: {
  item: NavItem
  active: boolean
  reduce: boolean
}) {
  const Icon = item.icon
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={active}
        tooltip={item.label}
        className="relative h-9 rounded-lg font-medium text-sidebar-foreground/70 transition-colors data-[active=true]:bg-transparent data-[active=true]:text-sidebar-foreground hover:text-sidebar-foreground"
      >
        <Link href={item.href}>
          {active && (
            <motion.span
              layoutId="sidebar-active"
              transition={reduce ? { duration: 0 } : ACTIVE_PILL}
              className="absolute inset-0 rounded-lg bg-sidebar-accent ring-1 ring-sidebar-border"
            />
          )}
          <Icon className="relative z-10 size-4" />
          <span className="relative z-10">{item.label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const router = useRouter()
  const { isMobile } = useSidebar()
  const { data: session } = authClient.useSession()
  const reduce = useReducedMotion() ?? false

  const user = session?.user

  async function onSignOut() {
    await authClient.signOut()
    router.push("/")
    router.refresh()
  }

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/")

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader className="border-b border-sidebar-border/60 px-3 py-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              size="lg"
              className="h-11 rounded-lg hover:bg-sidebar-accent/60"
            >
              <Link href="/dashboard" aria-label="shieldcn dashboard">
                <div className="flex aspect-square size-9 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground shadow-sm">
                  <ShieldcnLogo className="size-5" />
                </div>
                <div className="grid flex-1 text-left leading-tight">
                  <span className="truncate text-sm font-semibold tracking-tight">shieldcn</span>
                  <span className="truncate text-xs text-sidebar-foreground/55">Badge workspace</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="gap-1 px-3 py-3">
        <SidebarGroup className="py-0">
          <SidebarGroupLabel className="px-2 text-[11px] font-medium uppercase tracking-wider text-sidebar-foreground/45">
            Workspace
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {WORKSPACE_NAV.map((item) => (
                <NavRow
                  key={item.href}
                  item={item}
                  active={isActive(item.href, item.exact)}
                  reduce={reduce}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto py-0">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  size="sm"
                  tooltip="Docs"
                  className="h-8 rounded-lg text-sidebar-foreground/60 hover:text-sidebar-foreground"
                >
                  <Link href="/docs">
                    <CircleHelp className="size-4" />
                    <span>Docs</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  size="sm"
                  tooltip="Feedback"
                  className="h-8 rounded-lg text-sidebar-foreground/60 hover:text-sidebar-foreground"
                >
                  <a href="mailto:hello@shieldcn.dev">
                    <MessageCircle className="size-4" />
                    <span>Feedback</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/60 p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="h-12 rounded-lg hover:bg-sidebar-accent/60 data-[state=open]:bg-sidebar-accent"
                >
                  <Avatar className="size-8 rounded-lg ring-1 ring-sidebar-border">
                    {user?.image && <AvatarImage src={user.image} alt={user.name || ""} />}
                    <AvatarFallback className="rounded-lg bg-sidebar-primary text-xs text-sidebar-primary-foreground">
                      {initials(user?.name || user?.email || "?")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="flex min-w-0 items-center gap-1.5 truncate font-medium">
                      <span className="truncate">{user?.name || "Admin"}</span>
                      <Badge variant="outline" className="h-4 rounded-full px-1.5 text-[10px] font-medium">
                        Admin
                      </Badge>
                    </span>
                    <span className="truncate text-xs text-sidebar-foreground/55">{user?.email}</span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4 text-sidebar-foreground/50" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                side={isMobile ? "bottom" : "right"}
                align="end"
                sideOffset={8}
              >
                <DropdownMenuLabel className="flex flex-col">
                  <span className="truncate text-sm font-medium">{user?.name || "Admin"}</span>
                  <span className="truncate text-xs font-normal text-muted-foreground">{user?.email}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={(e) => { e.preventDefault(); void onSignOut() }}
                >
                  <LogOut className="size-4" /> Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
