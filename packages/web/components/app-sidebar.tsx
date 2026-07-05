"use client"

/**
 * shieldcn
 * components/app-sidebar.tsx
 *
 * The dashboard's left rail (dashboard-01 composition): shieldcn workspace
 * identity, primary navigation, account links, support links, and the
 * signed-in user footer. Built on the shadcn sidebar primitive and styled with
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
  ArrowRightLeft,
  BadgeCheck,
  BarChart3,
  ChevronsUpDown,
  CircleHelp,
  CreditCard,
  FileText,
  LayoutDashboard,
  LogOut,
  type LucideIcon,
  MessageCircle,
  Palette,
  Settings,
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
import type { Plan } from "@shieldcn/core/entitlements"

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
  plus?: boolean
}

const WORKSPACE_NAV: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/readmes", label: "READMEs", icon: FileText },
  { href: "/dashboard/badges", label: "Components", icon: BadgeCheck, plus: true },
  { href: "/dashboard/brands", label: "Brands", icon: Palette, plus: true },
  { href: "/migrate", label: "Migrate", icon: ArrowRightLeft },
]

const ACCOUNT_NAV: NavItem[] = [
  { href: "/pricing", label: "Plans", icon: BarChart3 },
  { href: "/welcome", label: "Settings", icon: Settings },
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
  plan,
  reduce,
}: {
  item: NavItem
  active: boolean
  plan: Plan
  reduce: boolean
}) {
  const Icon = item.icon
  const locked = item.plus && plan !== "plus"
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
          {locked && (
            <Badge
              variant="outline"
              className="relative z-10 ml-auto h-5 rounded-full border-sidebar-border px-2 text-[11px] font-medium text-sidebar-foreground/60"
            >
              Plus
            </Badge>
          )}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

export function AppSidebar({
  plan,
  isAdmin = false,
  ...props
}: React.ComponentProps<typeof Sidebar> & { plan: Plan; isAdmin?: boolean }) {
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
                  plan={plan}
                  reduce={reduce}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="py-0">
          <SidebarGroupLabel className="px-2 text-[11px] font-medium uppercase tracking-wider text-sidebar-foreground/45">
            Account
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Billing"
                  onClick={() => { void authClient.customer.portal() }}
                  className="h-9 rounded-lg font-medium text-sidebar-foreground/70 hover:text-sidebar-foreground"
                >
                  <CreditCard className="size-4" />
                  <span>Billing</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {ACCOUNT_NAV.map((item) => (
                <NavRow
                  key={item.href}
                  item={item}
                  active={isActive(item.href)}
                  plan={plan}
                  reduce={reduce}
                />
              ))}
              {isAdmin && (
                <NavRow
                  item={{ href: "/dashboard/admin", label: "Admin", icon: ShieldAlert }}
                  active={isActive("/dashboard/admin")}
                  plan={plan}
                  reduce={reduce}
                />
              )}
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
                      <span className="truncate">{user?.name || "Account"}</span>
                      <Badge
                        variant={plan === "plus" ? "default" : "outline"}
                        className="h-4 rounded-full px-1.5 text-[10px] font-medium"
                      >
                        {plan === "plus" ? "Plus" : "Free"}
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
                  <span className="truncate text-sm font-medium">{user?.name || "Account"}</span>
                  <span className="truncate text-xs font-normal text-muted-foreground">{user?.email}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/welcome"><LayoutDashboard className="size-4" /> Getting started</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/pricing"><BarChart3 className="size-4" /> Manage plan</Link>
                </DropdownMenuItem>
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
