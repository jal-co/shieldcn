"use client"

/**
 * shieldcn
 * components/auth/auth-form.tsx
 *
 * Minimal admin sign-in form (email/password via Better Auth). There is no
 * public registration — this form exists solely for the unlinked /brandmgmt
 * admin entry point.
 */

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { authClient } from "@/lib/auth/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

export function AuthForm({
  callbackURL = "/dashboard",
  className,
}: {
  callbackURL?: string
  className?: string
}) {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    const { error: err } = await authClient.signIn.email({ email, password })
    setBusy(false)
    if (err) {
      setError(err.message ?? "Sign-in failed")
      return
    }
    router.push(callbackURL)
    router.refresh()
  }

  return (
    <form
      onSubmit={onSubmit}
      className={cn("flex w-full max-w-sm flex-col gap-4", className)}
    >
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">Admin sign in</h1>
        <p className="text-sm text-muted-foreground">Brand management access.</p>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={busy}>
        {busy && <Loader2 className="size-4 animate-spin" />} Sign in
      </Button>
    </form>
  )
}
