"use client"

/**
 * shieldcn
 * components/auth/user-menu.tsx
 *
 * Header auth cluster. Signed out: Sign in + Sign up buttons. Signed in: an
 * avatar dropdown with dashboard/brands/billing links and sign out. All state
 * comes from the Neon Auth client hooks.
 */

import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  BadgeCheck,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Palette,
} from "lucide-react"
import { authClient } from "@/lib/auth/client"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

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

  async function onSignOut() {
    await authClient.signOut()
    router.push("/")
    router.refresh()
  }

  return (
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

          <DropdownMenuItem asChild>
            <Link href="/dashboard">
              <LayoutDashboard className="size-4" /> Dashboard
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/dashboard/badges">
              <BadgeCheck className="size-4" /> Saved badges
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/dashboard/brands">
              <Palette className="size-4" /> Brands
            </Link>
          </DropdownMenuItem>
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
  )
}
