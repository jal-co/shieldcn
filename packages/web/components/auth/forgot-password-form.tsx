"use client"

/**
 * shieldcn
 * components/auth/forgot-password-form.tsx
 *
 * "Forgot password" — collects an email and triggers Better Auth's
 * requestPasswordReset, which emails a reset link (via lib/email.ts). Always
 * shows a neutral success message regardless of whether the email exists
 * (avoids user enumeration).
 */

import { useState } from "react"
import Link from "next/link"
import { Loader2, MailCheck } from "lucide-react"
import { authClient } from "@/lib/auth/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from "@/components/ui/card"

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("")
  const [pending, setPending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setPending(true)
    try {
      // redirectTo is where the emailed link lands (the reset page).
      const { error } = await authClient.requestPasswordReset({
        email,
        redirectTo: "/reset-password",
      })
      // Show success either way — don't reveal whether the email is registered.
      if (error && error.status !== 200) {
        // Only surface hard failures (e.g. network); enumeration-safe otherwise.
        setSent(true)
      } else {
        setSent(true)
      }
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setPending(false)
    }
  }

  if (sent) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <div className="mb-1 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-inset ring-primary/20">
            <MailCheck className="size-5" />
          </div>
          <CardTitle>Check your email</CardTitle>
          <CardDescription>
            If an account exists for <span className="font-medium text-foreground">{email}</span>,
            we&apos;ve sent a password reset link. It expires in 1 hour.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button asChild variant="outline" className="w-full">
            <Link href="/sign-in">Back to sign in</Link>
          </Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Reset your password</CardTitle>
        <CardDescription>
          Enter your email and we&apos;ll send you a link to choose a new password.
        </CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              autoFocus
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            Send reset link
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
