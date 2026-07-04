"use client"

/**
 * shieldcn
 * components/dashboard/dashboard-sidebar.tsx
 *
 * The dashboard's left rail: a workspace switcher (Personal + Teams), primary
 * navigation, and a user footer. Built on the shadcn sidebar primitive. Nav
 * highlights the active route; the Members item only appears for team
 * workspaces (a personal account has no members). "Team" is the UI name for a
 * Better Auth organization.
 */

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  BarChart3, ChevronsUpDown, CreditCard, FileText, LayoutDashboard,
  LogOut, Palette, Plus, User, Users, Check,
} from "lucide-react"
import { authClient } from "@/lib/auth/client"
import { CreateOrgDialog } from "@/components/auth/create-org-dialog"
import { ShieldcnLogo } from "@/components/shieldcn-logo"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem,
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
  { href: "/dashboard/brands", label: "Brands", icon: Palette },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
]

export function DashboardSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { isMobile } = useSidebar()
  const { data: session } = authClient.useSession()
  const { data: orgs } = authClient.useListOrganizations()
  const { data: activeOrg } = authClient.useActiveOrganization()
  const [createOpen, setCreateOpen] = useState(false)
  const [switching, setSwitching] = useState(false)

  const user = session?.user
  const wsName = activeOrg?.name ?? "Personal"
  const wsIcon = activeOrg ? Users : User

  async function selectWorkspace(id: string | null) {
    if ((id ?? null) === (activeOrg?.id ?? null)) return
    setSwitching(true)
    try {
      await authClient.organization.setActive({ organizationId: id })
      router.refresh()
    } finally {
      setSwitching(false)
    }
  }

  async function onSignOut() {
    await authClient.signOut()
    router.push("/")
    router.refresh()
  }

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/")

  const nav = activeOrg
    ? [...NAV, { href: "/dashboard/members", label: "Members", icon: Users }]
    : NAV

  return (
    <>
      <Sidebar collapsible="icon">
        {/* Workspace switcher */}
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                  >
                    <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                      {(() => { const I = wsIcon; return <I className="size-4" /> })()}
                    </div>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">{wsName}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {activeOrg ? "Team" : "Personal account"}
                      </span>
                    </div>
                    <ChevronsUpDown className="ml-auto size-4" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-(--radix-dropdown-menu-trigger-width) min-w-56"
                  align="start"
                  side={isMobile ? "bottom" : "right"}
                >
                  <DropdownMenuLabel className="text-xs text-muted-foreground">Workspace</DropdownMenuLabel>
                  <DropdownMenuGroup>
                    <DropdownMenuItem disabled={switching} onSelect={(e) => { e.preventDefault(); void selectWorkspace(null) }}>
                      <User className="size-4" /> Personal
                      {!activeOrg && <Check className="ml-auto size-4" />}
                    </DropdownMenuItem>
                    {orgs?.map((org) => (
                      <DropdownMenuItem key={org.id} disabled={switching} onSelect={(e) => { e.preventDefault(); void selectWorkspace(org.id) }}>
                        <Users className="size-4" /> <span className="truncate">{org.name}</span>
                        {org.id === activeOrg?.id && <Check className="ml-auto size-4" />}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setCreateOpen(true) }}>
                    <Plus className="size-4" /> New team
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Workspace</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {nav.map((item) => {
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

      {/* Brand link — collapses out of the way; kept in the header area */}
      <span className="sr-only">
        <Link href="/"><ShieldcnLogo className="h-6 w-auto" /></Link>
      </span>

      <CreateOrgDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  )
}
