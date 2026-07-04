"use client"

/**
 * shieldcn
 * components/auth/reset-password-form.tsx
 *
 * Reset-password page. Better Auth redirects the emailed link here with
 * ?token=… (or ?error=INVALID_TOKEN if it lapsed). Collects a new password and
 * calls authClient.resetPassword({ newPassword, token }); on success, sends the
 * user to sign in.
 */

import { useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import { authClient } from "@/lib/auth/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from "@/components/ui/card"

export function ResetPasswordForm() {
  const router = useRouter()
  const params = useSearchParams()
  const token = params.get("token")
  const linkError = params.get("error")

  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Invalid / expired / missing token — the link is unusable.
  if (!token || linkError) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Link expired</CardTitle>
          <CardDescription>
            This password reset link is invalid or has expired. Request a new one to continue.
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex flex-col gap-2">
          <Button asChild className="w-full">
            <Link href="/forgot-password">Request a new link</Link>
          </Button>
          <Button asChild variant="ghost" className="w-full">
            <Link href="/sign-in">Back to sign in</Link>
          </Button>
        </CardFooter>
      </Card>
    )
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password !== confirm) {
      setError("Passwords don't match.")
      return
    }
    setPending(true)
    try {
      const { error } = await authClient.resetPassword({ newPassword: password, token: token! })
      if (error) {
        setError(error.message ?? "Couldn't reset your password. The link may have expired.")
        return
      }
      router.push("/sign-in?reset=success")
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setPending(false)
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Choose a new password</CardTitle>
        <CardDescription>Enter a new password for your account.</CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={8}
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirm-password">Confirm password</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              required
              minLength={8}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            Reset password
          </Button>
        </CardContent>
      </form>
      <CardFooter>
        <Link
          href="/sign-in"
          className="mx-auto text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Back to sign in
        </Link>
      </CardFooter>
    </Card>
  )
}
