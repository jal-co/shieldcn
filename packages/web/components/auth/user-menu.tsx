"use client"

/**
 * shieldcn
 * components/auth/user-menu.tsx
 *
 * Header auth cluster. Signed out: Sign in + Sign up buttons. Signed in: an
 * avatar dropdown with the workspace switcher (Personal + Teams), create-team
 * action, dashboard/billing links, and sign out. All state comes from the Neon
 * Auth client hooks; switching calls organization.setActive (null = personal).
 *
 * "Organization" is Better Auth's term; the UI calls it a Team so the concept
 * reads as opt-in collaboration, never a required org.
 */

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  BarChart3,
  Check,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Plus,
  User,
  Users,
} from "lucide-react"
import { authClient } from "@/lib/auth/client"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CreateOrgDialog } from "@/components/auth/create-org-dialog"

function initials(nameOrEmail: string): string {
  const base = nameOrEmail.trim()
  if (!base) return "?"
  const parts = base.split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return base.slice(0, 2).toUpperCase()
}

export function UserMenu() {
  const router = useRouter()
  const { data: session, isPending } = authClient.useSession()
  const { data: orgs } = authClient.useListOrganizations()
  const { data: activeOrg } = authClient.useActiveOrganization()
  const [createOpen, setCreateOpen] = useState(false)
  const [switching, setSwitching] = useState(false)

  if (isPending) {
    return <div className="size-8 animate-pulse rounded-full bg-muted" aria-hidden="true" />
  }

  if (!session?.user) {
    return (
      <div className="flex items-center gap-1.5">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/sign-in">Sign in</Link>
        </Button>
        <Button size="sm" asChild>
          <Link href="/sign-up">Sign up</Link>
        </Button>
      </div>
    )
  }

  const user = session.user
  const label = user.name || user.email

  // Pass null to switch back to the personal account (no active team).
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

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="flex items-center rounded-full outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring/50"
            aria-label="Account menu"
          >
            <Avatar className="size-8">
              {user.image && <AvatarImage src={user.image} alt={label} />}
              <AvatarFallback className="text-xs">{initials(label)}</AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="flex flex-col gap-0.5">
            <span className="truncate text-sm font-medium">{user.name || "Account"}</span>
            <span className="truncate text-xs font-normal text-muted-foreground">{user.email}</span>
          </DropdownMenuLabel>

          <DropdownMenuSeparator />

          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Workspace
          </DropdownMenuLabel>
          <DropdownMenuGroup>
            {/* Personal account — the default, always available. */}
            <DropdownMenuItem
              disabled={switching}
              onSelect={(e) => { e.preventDefault(); void selectWorkspace(null) }}
            >
              <User className="size-4" />
              <span className="truncate">Personal</span>
              {!activeOrg && <Check className="ml-auto size-4" />}
            </DropdownMenuItem>
            {orgs?.map((org) => (
              <DropdownMenuItem
                key={org.id}
                disabled={switching}
                onSelect={(e) => {
                  e.preventDefault()
                  void selectWorkspace(org.id)
                }}
              >
                <Users className="size-4" />
                <span className="truncate">{org.name}</span>
                {org.id === activeOrg?.id && <Check className="ml-auto size-4" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>

          <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setCreateOpen(true) }}>
            <Plus className="size-4" /> New team
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem asChild>
            <Link href="/dashboard">
              <LayoutDashboard className="size-4" /> Dashboard
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/dashboard/brands">
              <BarChart3 className="size-4" /> Brands & analytics
            </Link>
          </DropdownMenuItem>
          {activeOrg && (
            <DropdownMenuItem asChild>
              <Link href="/dashboard/members">
                <Users className="size-4" /> Members
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem asChild>
            <Link href="/api/portal">
              <CreditCard className="size-4" /> Billing
            </Link>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            variant="destructive"
            onSelect={(e) => { e.preventDefault(); void onSignOut() }}
          >
            <LogOut className="size-4" /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateOrgDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  )
}
