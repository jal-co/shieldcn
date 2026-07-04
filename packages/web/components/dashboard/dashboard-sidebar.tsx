"use client"

/**
 * shieldcn
 * components/dashboard/dashboard-sidebar.tsx
 *
 * The dashboard's left rail: primary navigation and a user footer. Built on the
 * shadcn sidebar primitive. Nav highlights the active route.
 */

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  BadgeCheck, BarChart3, ChevronsUpDown, CreditCard, FileText, LayoutDashboard,
  LogOut, Palette,
} from "lucide-react"
import { authClient } from "@/lib/auth/client"
import { ShieldcnLogo } from "@/components/shieldcn-logo"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton,
  SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar"

function initials(s: string): string {
  const b = s.trim()
  if (!b) return "?"
  const p = b.split(/\s+/)
  return (p.length >= 2 ? p[0][0] + p[1][0] : b.slice(0, 2)).toUpperCase()
}

const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/readmes", label: "READMEs", icon: FileText },
  { href: "/dashboard/badges", label: "Saved badges", icon: BadgeCheck },
  { href: "/dashboard/brands", label: "Brands", icon: Palette },
]

export function DashboardSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { isMobile } = useSidebar()
  const { data: session } = authClient.useSession()

  const user = session?.user

  async function onSignOut() {
    await authClient.signOut()
    router.push("/")
    router.refresh()
  }

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/")

  return (
    <>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild size="lg">
                <Link href="/">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                    <ShieldcnLogo className="size-4" />
                  </div>
                  <span className="truncate font-semibold">shieldcn</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Workspace</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {NAV.map((item) => {
                  const Icon = item.icon
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={isActive(item.href, item.exact)} tooltip={item.label}>
                        <Link href={item.href}>
                          <Icon />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>Account</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Billing">
                    <Link href="/api/portal">
                      <CreditCard />
                      <span>Billing</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Pricing">
                    <Link href="/pricing">
                      <BarChart3 />
                      <span>Plans</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        {/* User footer */}
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent">
                    <Avatar className="size-8 rounded-lg">
                      {user?.image && <AvatarImage src={user.image} alt={user.name || ""} />}
                      <AvatarFallback className="rounded-lg text-xs">
                        {initials(user?.name || user?.email || "?")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-medium">{user?.name || "Account"}</span>
                      <span className="truncate text-xs text-muted-foreground">{user?.email}</span>
                    </div>
                    <ChevronsUpDown className="ml-auto size-4" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-(--radix-dropdown-menu-trigger-width) min-w-56"
                  side={isMobile ? "bottom" : "right"}
                  align="end"
                >
                  <DropdownMenuLabel className="flex flex-col">
                    <span className="truncate text-sm font-medium">{user?.name || "Account"}</span>
                    <span className="truncate text-xs font-normal text-muted-foreground">{user?.email}</span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/welcome"><LayoutDashboard className="size-4" /> Getting started</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onSelect={(e) => { e.preventDefault(); void onSignOut() }}>
                    <LogOut className="size-4" /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

    </>
  )
}
